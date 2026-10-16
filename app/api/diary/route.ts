import {readStudy} from '@/lib/study';
import { env } from 'cloudflare:workers';
import { aggregate,seoulToday,cleanTaskTitle,repeatDates } from '@/lib/domain';
import { accountSession } from '@/lib/auth';
import { ownedDiary, mutationOwner } from '@/lib/ownership';
export const dynamic='force-dynamic';
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const db=()=>{if(!env.DB)throw new Error('DB unavailable');return env.DB;};
async function stableId(prefix:string,parts:string[]){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(parts)));return prefix+'-'+Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');}
const id=()=>crypto.randomUUID(); const now=()=>new Date().toISOString();
function str(v:unknown,max=1000,empty=false){if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))throw new Error('입력 길이와 필수 항목을 확인해 주세요.');return v.trim();}
function num(v:unknown,max=100000){const n=Number(v);if(!Number.isInteger(n)||n<0||n>max)throw new Error('시간은 0 이상의 정수(분)로 적어 주세요.');return n;}
function date(v:unknown){const s=str(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Error('날짜를 확인해 주세요.');return s;}
function planInput(b:any){const p={title:str(b.title,150),start_date:date(b.start_date),end_date:date(b.end_date),priority:num(b.priority,3),success:str(b.success),estimated_minutes:num(b.estimated_minutes)};if(p.end_date<p.start_date||p.priority<1)throw new Error('기간과 우선순위를 확인해 주세요.');return p;}
function taskInput(b:any){const kind=b.task_kind??'task';if(!['task','event','span'].includes(kind))throw new Error('일정 종류를 확인해 주세요.');const end=date(b.due_date);const start=kind==='span'?date(b.start_date):null;if(start&&start>end)throw new Error('기간의 시작일은 종료일 이전이어야 합니다.');const time=kind==='event'&&b.scheduled_time?str(b.scheduled_time,5):null;if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('일정 시각을 확인해 주세요.');const p={title:str(b.title,150),description:str(b.description??'',2000,true),due_date:end,task_kind:kind,start_date:start,scheduled_time:time,priority:num(b.priority,3),tags:str(b.tags??'',200,true),estimated_minutes:num(b.estimated_minutes)};if(p.priority<1)throw new Error('우선순위를 확인해 주세요.');return p;}
export async function GET(req:Request){try{const session=await accountSession(req);if(!session)return response({error:'로그인이 필요합니다.'},401);const data=await ownedDiary(db(),session.user.id);const query=new URL(req.url).searchParams;if(query.has('id')){const table=query.get('type')??'tasks';const row=data[table]?.find((r:any)=>r.id===query.get('id'));if(!row)return response({error:'자료를 찾을 수 없습니다.'},404);return response({record:row});}if(query.has('export'))return new Response(JSON.stringify({schema_version:2,exported_at:now(),timezone:'Asia/Seoul',time_unit:'minutes',...data,study:await readStudy(db(),session.user.id),imports:(await db().prepare('SELECT source_commit,source_exported_at,counts,created_at FROM diary_imports WHERE user_id=?').bind(session.user.id).all()).results},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="pds-diary.json"','Cache-Control':'no-store'}});return response({...data,today:seoulToday()});}catch{return response({error:'데이터를 불러오지 못했습니다. 저장된 자료는 삭제되지 않습니다. 잠시 후 다시 시도해 주세요.'},503);}}
export async function POST(req:Request){
 let session;try{session=await accountSession(req)}catch{return response({error:'인증 서비스를 사용할 수 없습니다.'},503)}
 if(!session)return response({error:'로그인이 필요합니다.'},401);
 const userId=session.user.id;
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return response({error:'같은 사이트에서 요청해 주세요.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return response({error:'JSON 형식으로 요청해 주세요.'},415);
 const raw=await req.text();if(raw.length>20000)return response({error:'입력이 너무 깁니다.'},413);
 let b:any;try{b=JSON.parse(raw);}catch{return response({error:'입력 형식을 확인해 주세요.'},400);}
 const d=db();try{
 const at=now();
 if(!await mutationOwner(d,userId,b))return response({error:'자료를 찾을 수 없습니다.'},404);
 if(b.action==='initialize'||b.action==='seedExerciseSubtasks')return response({ok:true});
 // Reject stale writes to a deleted plan and its preserved children.
 let ownerPlan:string|undefined;
 if(['updatePlan','createTask','review'].includes(b.action))ownerPlan=str(b.action==='updatePlan'?b.id:b.plan_id,80);
 else if(['updateTask','repeatTask','createSubtasks','complete','undo','deleteTask','record'].includes(b.action)){
 const tid=str(['repeatTask','createSubtasks','record'].includes(b.action)?b.task_id:b.id,80);const task=await d.prepare('SELECT plan_id FROM tasks WHERE id=? AND deleted_at IS NULL').bind(tid).first<any>();ownerPlan=task?.plan_id;
 }else if(['updateSubtask','setSubtask','deleteSubtask'].includes(b.action)){
 const child=await d.prepare('SELECT t.plan_id FROM subtasks s JOIN tasks t ON s.task_id=t.id WHERE s.id=? AND s.deleted_at IS NULL AND t.deleted_at IS NULL').bind(str(b.id,80)).first<any>();ownerPlan=child?.plan_id;
 }else if(b.action==='updateRecordNote'){
 const record=await d.prepare('SELECT t.plan_id FROM execution_records r JOIN tasks t ON r.task_id=t.id WHERE r.id=? AND t.deleted_at IS NULL').bind(str(b.id,80)).first<any>();ownerPlan=record?.plan_id;
 }else if(b.action==='nextPlan'){
 const review=await d.prepare('SELECT plan_id FROM reviews WHERE id=?').bind(str(b.review_id,80)).first<any>();ownerPlan=review?.plan_id;
 }
 if(ownerPlan&&!await d.prepare('SELECT id FROM plans WHERE id=? AND deleted_at IS NULL').bind(ownerPlan).first())return response({error:'이 계획은 삭제되었습니다. 다른 계획을 선택해 주세요.'},404);
 if(b.action==='createPlan'){
 const p=planInput(b); const pid=id();const snap={id:pid,...p,version:1,created_at:at};await d.batch([d.prepare('INSERT INTO plans (id,title,start_date,end_date,priority,success,estimated_minutes,version,created_at,owner_user_id) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(pid,p.title,p.start_date,p.end_date,p.priority,p.success,p.estimated_minutes,1,at,userId),d.prepare('INSERT INTO plan_revisions (id,plan_id,version,snapshot,created_at) VALUES (?,?,?,?,?)').bind(id(),pid,1,JSON.stringify(snap),at)]);
 }else if(b.action==='updatePlan'){
 const pid=str(b.id,80);const p=planInput(b);const version=num(b.version);const current=await d.prepare('SELECT * FROM plans WHERE id=? AND deleted_at IS NULL').bind(pid).first<any>();if(!current)return response({error:'계획을 찾을 수 없습니다.'},404);if(current.version!==version)return response({error:'계획이 이미 바뀌었습니다. 새로고침 후 다시 수정해 주세요.'},409);
 // Revision uniqueness rolls back both statements when simultaneous edits share the same version.
 const snap={...current,...p,version:version+1};const updated=await d.batch([d.prepare('UPDATE plans SET title=?,start_date=?,end_date=?,priority=?,success=?,estimated_minutes=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL').bind(p.title,p.start_date,p.end_date,p.priority,p.success,p.estimated_minutes,pid,version),d.prepare('INSERT INTO plan_revisions (id,plan_id,version,snapshot,created_at) SELECT ?,id,?,?,? FROM plans WHERE id=? AND version=? AND deleted_at IS NULL').bind(id(),version+1,JSON.stringify(snap),at,pid,version+1)]);if(!updated[0].meta.changes)return response({error:'계획 상태가 바뀌었습니다. 새로고침 후 다시 확인해 주세요.'},409);
 }else if(b.action==='deletePlan'){
 const pid=str(b.id,80);const current=await d.prepare('SELECT * FROM plans WHERE id=?').bind(pid).first<any>();if(!current)return response({error:'계획을 찾을 수 없습니다.'},404);
 if(current.deleted_at)return response({ok:true,message:'이미 삭제된 계획입니다.'});
 const version=num(b.version);if(current.version!==version)return response({error:'계획이 변경되었습니다. 새로고침 후 내용을 확인하고 삭제해 주세요.'},409);
 const result=await d.prepare('UPDATE plans SET deleted_at=? WHERE id=? AND version=? AND deleted_at IS NULL').bind(at,pid,version).run();if(!result.meta.changes)return response({error:'계획 상태가 바뀌었습니다. 새로고침 후 다시 확인해 주세요.'},409);
 return response({ok:true,message:'계획을 삭제했습니다. 이력과 연결된 기록은 내보내기에 보존됩니다.'});
 }else if(b.action==='createTask'||b.action==='updateTask'){
 const t=taskInput(b);if(b.action==='createTask'){const pid=str(b.plan_id,80);if(!await d.prepare('SELECT id FROM plans WHERE id=?').bind(pid).first())throw new Error('계획을 먼저 골라 주세요.');await d.prepare('INSERT INTO tasks (id,plan_id,title,description,due_date,task_kind,start_date,scheduled_time,priority,tags,estimated_minutes,status,cycle,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),pid,t.title,t.description,t.due_date,t.task_kind,t.start_date,t.scheduled_time,t.priority,t.tags,t.estimated_minutes,'active',1,at).run();}
 else await d.prepare('UPDATE tasks SET title=?,description=?,due_date=?,task_kind=?,start_date=?,scheduled_time=?,priority=?,tags=?,estimated_minutes=? WHERE id=? AND deleted_at IS NULL').bind(t.title,t.description,t.due_date,t.task_kind,t.start_date,t.scheduled_time,t.priority,t.tags,t.estimated_minutes,str(b.id,80)).run();
 }else if(b.action==='repeatTask'){
 const source=await d.prepare('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL').bind(str(b.task_id,80)).first<any>();if(!source)return response({error:'할 일을 찾을 수 없습니다.'},404);
 if(source.task_kind!=='task')throw new Error('반복은 일반 할 일에서 사용해 주세요. 여러 날의 한 작업은 기간 할 일로 저장합니다.');
 const days=repeatDates(date(b.start_date),date(b.end_date),b.weekdays);
 const t=taskInput({...b,due_date:days[0]});t.title=cleanTaskTitle(t.title);
 const existing=await d.prepare('SELECT * FROM tasks WHERE plan_id=? AND deleted_at IS NULL').bind(source.plan_id).all<any>();
 const fresh=days.filter(day=>!existing.results.some((x:any)=>x.due_date===day&&cleanTaskTitle(x.title)===t.title));
 const template=await d.prepare('SELECT * FROM subtasks WHERE task_id=? AND deleted_at IS NULL ORDER BY position,id').bind(source.id).all<any>();
 const groups=await Promise.all(fresh.map(async day=>{
 // Stable IDs protect both task and checklist creation from repeated requests.
 const rid=await stableId('repeat',[source.plan_id,t.title,day]);
 const task=d.prepare('INSERT OR IGNORE INTO tasks (id,plan_id,title,description,due_date,priority,tags,estimated_minutes,status,cycle,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(rid,source.plan_id,t.title,t.description,day,t.priority,t.tags,t.estimated_minutes,'active',1,at);
 const children=await Promise.all(template.results.map(async (child:any)=>d.prepare('INSERT OR IGNORE INTO subtasks (id,task_id,title,status,position,created_at) SELECT ?,id,?,?,?,? FROM tasks WHERE id=? AND deleted_at IS NULL').bind(await stableId('subtask',[rid,child.title]),child.title,'active',child.position,at,rid)));
 return [task,...children];
 }));
 const result=groups.length?await d.batch(groups.flat()):[];let created=0,offset=0;for(const group of groups){created+=Number(result[offset].meta.changes??0);offset+=group.length;}
 return response({ok:true,created,skipped:days.length-created,message:`날짜별 할 일 ${created}개를 만들었습니다.${days.length-created?' 이미 있는 날짜는 중복 생성하지 않았습니다.':''}`});
 }else if(b.action==='createSubtasks'){
 const tid=str(b.task_id,80);if(!await d.prepare('SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL').bind(tid).first())return response({error:'할 일을 찾을 수 없습니다.'},404);
 if(!Array.isArray(b.titles)||b.titles.length<1||b.titles.length>30)throw new Error('세부항목은 1~30개씩 추가해 주세요.');
 const titles=[...new Set<string>(b.titles.map((x:unknown)=>str(x,150)))];
 const existing=await d.prepare('SELECT * FROM subtasks WHERE task_id=?').bind(tid).all<any>();
 const position=existing.results.reduce((n:number,x:any)=>Math.max(n,x.position+1),0);
 const fresh=titles.filter(title=>!existing.results.some((x:any)=>!x.deleted_at&&x.title===title));
 const result=fresh.length?await d.batch(await Promise.all(fresh.map(async (title,i)=>{const canonical=await stableId('subtask',[tid,title]);const sid=existing.results.some((x:any)=>x.id===canonical&&!x.deleted_at&&x.title!==title)?id():canonical;return d.prepare('INSERT INTO subtasks (id,task_id,title,status,position,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,status=excluded.status,position=excluded.position,deleted_at=NULL WHERE subtasks.deleted_at IS NOT NULL').bind(sid,tid,title,'active',position+i,at)}))):[];
 return response({ok:true,message:`세부항목 ${result.reduce((n,r)=>n+Number(r.meta.changes??0),0)}개를 추가했습니다.`});
 }else if(b.action==='updateSubtask'||b.action==='setSubtask'||b.action==='deleteSubtask'){
 const sid=str(b.id,80);const child=await d.prepare('SELECT s.id FROM subtasks s JOIN tasks t ON s.task_id=t.id WHERE s.id=? AND s.deleted_at IS NULL AND t.deleted_at IS NULL').bind(sid).first();if(!child)return response({error:'세부항목을 찾을 수 없습니다.'},404);
 if(b.action==='updateSubtask')await d.prepare('UPDATE subtasks SET title=? WHERE id=?').bind(str(b.title,150),sid).run();
 else if(b.action==='deleteSubtask')await d.prepare('UPDATE subtasks SET deleted_at=? WHERE id=?').bind(at,sid).run();
 else{if(!['active','completed'].includes(b.status))throw new Error('세부항목 상태를 확인해 주세요.');await d.prepare('UPDATE subtasks SET status=? WHERE id=?').bind(b.status,sid).run();}
 }else if(b.action==='complete'){
 const tid=str(b.id,80),key=userId+':'+str(b.request_key,100);const cycle=num(b.cycle);const t=await d.prepare('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL').bind(tid).first<any>();if(!t)return response({error:'할 일을 찾을 수 없습니다.'},404);
 if(t.cycle!==cycle)return response({error:'완료 상태가 바뀌었습니다. 새로고침해 주세요.'},409);
 // DB uniqueness + conditional INSERT + atomic batch, not just a disabled button.
 await d.batch([d.prepare("INSERT OR IGNORE INTO completion_events (id,task_id,cycle,request_key,created_at) SELECT ?,id,cycle,?,? FROM tasks WHERE id=? AND cycle=? AND status='active' AND deleted_at IS NULL").bind(id(),key,at,tid,cycle),d.prepare("UPDATE tasks SET status='completed' WHERE id=? AND cycle=? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM completion_events WHERE task_id=? AND cycle=?)").bind(tid,cycle,tid,cycle)]);
 }else if(b.action==='undo'){
 await d.prepare("UPDATE tasks SET status='active',cycle=cycle+1 WHERE id=? AND status='completed' AND deleted_at IS NULL").bind(str(b.id,80)).run();
 }else if(b.action==='deleteTask'){
 await d.prepare('UPDATE tasks SET deleted_at=? WHERE id=? AND deleted_at IS NULL').bind(at,str(b.id,80)).run();
 }else if(b.action==='updateRecordNote'){
 const rid=str(b.id,80);const existing=await d.prepare('SELECT r.id FROM execution_records r JOIN tasks t ON r.task_id=t.id WHERE r.id=? AND t.deleted_at IS NULL').bind(rid).first();if(!existing)return response({error:'실행 기록을 찾을 수 없습니다.'},404);
 await d.prepare('UPDATE execution_records SET blocked_reason=?,note=? WHERE id=?').bind(str(b.blocked_reason??'',2000,true),str(b.note??'',2000,true),rid).run();
 }else if(b.action==='record'){
 const tid=str(b.task_id,80),key=userId+':'+str(b.request_key,100);if(!await d.prepare('SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL').bind(tid).first())throw new Error('할 일을 확인해 주세요.');
 const start=str(b.started_at,40),end=str(b.ended_at,40);if(!/([zZ]|[+-]\d{2}:\d{2})$/.test(start)||!/([zZ]|[+-]\d{2}:\d{2})$/.test(end))throw new Error('시간대가 포함된 시각을 입력해 주세요.');
 const s=new Date(start),e=new Date(end);const minutes=(e.getTime()-s.getTime())/60000;if(!Number.isFinite(minutes)||minutes<=0||minutes>20160||e.getTime()>Date.now()+60000)throw new Error('실제로 수행한 시작·종료 시각을 확인해 주세요. 종료는 시작 이후이며 미래 시각일 수 없습니다.');
 await d.prepare('INSERT OR IGNORE INTO execution_records (id,task_id,started_at,ended_at,actual_minutes,blocked_reason,note,request_key,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id(),tid,s.toISOString(),e.toISOString(),Math.round(minutes*1000)/1000,str(b.blocked_reason??'',2000,true),str(b.note??'',2000,true),key,at).run();
 }else if(b.action==='review'){
 const pid=str(b.plan_id,80);const start=date(b.start_date),end=date(b.end_date);if(end<start)throw new Error('기간을 확인해 주세요.');const data=await ownedDiary(d,userId);const t=data.tasks.filter((t:any)=>t.plan_id===pid&&!t.deleted_at&&t.due_date>=start&&t.due_date<=end);await d.prepare('INSERT INTO reviews (id,plan_id,start_date,end_date,improvement,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').bind(id(),pid,start,end,str(b.improvement,1000),JSON.stringify(aggregate(t,data.execution_records,seoulToday())),at).run();
 }else if(b.action==='nextPlan'){
 const rid=str(b.review_id,80);const review=await d.prepare('SELECT * FROM reviews WHERE id=?').bind(rid).first<any>();if(!review)throw new Error('돌아보기를 먼저 저장해 주세요.');if(await d.prepare('SELECT id FROM plans WHERE source_review_id=?').bind(rid).first())return response({ok:true});
 const p=planInput(b);const pid=id();const snap={id:pid,...p,success:review.improvement,source_review_id:rid,version:1,created_at:at};await d.batch([d.prepare('INSERT INTO plans (id,title,start_date,end_date,priority,success,estimated_minutes,version,source_review_id,created_at,owner_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(pid,p.title,p.start_date,p.end_date,p.priority,review.improvement,p.estimated_minutes,1,rid,at,userId),d.prepare('INSERT INTO plan_revisions (id,plan_id,version,snapshot,created_at) VALUES (?,?,?,?,?)').bind(id(),pid,1,JSON.stringify(snap),at)]);
 }else return response({error:'지원하지 않는 요청입니다.'},400);
 return response({ok:true});
 }catch(e:any){if(e.message?.includes('UNIQUE'))return response({error:'같은 변경이 이미 저장되었습니다. 새로고침 후 확인해 주세요.'},409);const safe=/^(일정|세부항목|반복|입력|시간은|날짜|기간|우선순위|계획을 먼저|할 일을 확인|시간대|실제로 수행|돌아보기를 먼저)/.test(e.message??'');return response({error:safe?e.message:'저장하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.'},400);}
}
