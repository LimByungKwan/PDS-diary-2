import { readDiaryExport, exportTables } from './export';
const SOURCE = 'bbb70bb7d07e5c0e548d4c2f4436a991429f98d3';
const columns: Record<string,string[]> = {
  plans: ['id','title','start_date','end_date','priority','success','estimated_minutes','version','source_review_id','created_at','deleted_at'],
  plan_revisions: ['id','plan_id','version','snapshot','created_at'],
  tasks: ['id','plan_id','title','description','due_date','priority','tags','estimated_minutes','status','cycle','deleted_at','created_at','task_kind','start_date','scheduled_time'],
  execution_records: ['id','task_id','started_at','ended_at','actual_minutes','blocked_reason','note','request_key','created_at'],
  completion_events: ['id','task_id','cycle','request_key','created_at'],
  reviews: ['id','plan_id','start_date','end_date','improvement','snapshot','created_at'],
  subtasks: ['id','task_id','title','status','position','deleted_at','created_at'],
};
async function digest(userId:string,value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId+'\n'+value));return 'm-'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
const nullable=new Set(['deleted_at','source_review_id','start_date','scheduled_time']);
const numeric=new Set(['priority','estimated_minutes','version','actual_minutes','cycle','position']);
const dates=new Set(['start_date','end_date','due_date']);
const timestamps=new Set(['created_at','deleted_at','started_at','ended_at']);
function validateValue(key:string,value:unknown){
  if(value===null&&nullable.has(key))return;
  if(numeric.has(key)){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000||(!['actual_minutes'].includes(key)&&!Number.isInteger(value)))throw new Error('숫자 항목을 확인해 주세요.');
    if(['priority','version','cycle'].includes(key)&&value<1)throw new Error('버전·우선순위·회차를 확인해 주세요.');
    if(key==='priority'&&value>3)throw new Error('우선순위를 확인해 주세요.');
    return;
  }
  if(typeof value!=='string'||value.length>20000)throw new Error('자료 항목 형식을 확인해 주세요.');
  if(dates.has(key)&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))throw new Error('날짜를 확인해 주세요.');
  if(timestamps.has(key)&&(!/(Z|[+-]\d{2}:\d{2})$/i.test(value)||!Number.isFinite(Date.parse(value))))throw new Error('저장 시각을 확인해 주세요.');
  if(['id','plan_id','task_id','request_key','source_review_id'].includes(key)&&(!value||value.length>100))throw new Error('원본 ID를 확인해 주세요.');
  if(key==='status'&&!['active','completed'].includes(value))throw new Error('완료 상태를 확인해 주세요.');
  if(key==='task_kind'&&!['task','event','span'].includes(value))throw new Error('할 일 종류를 확인해 주세요.');
  if(key==='scheduled_time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('일정 시각을 확인해 주세요.');
}
export async function importDiary(database:D1Database,userId:string,input:unknown){
  const {data}=await readDiaryExport(Response.json(input));
  const total=exportTables.reduce((n,t)=>n+data[t].length,0);
  if(total<1||total>400)throw new Error('가져오기는 원본 기록 1~400개를 지원합니다.');
  const occupied=await database.prepare('SELECT id FROM plans WHERE owner_user_id=? LIMIT 1').bind(userId).first();
  if(occupied||await database.prepare('SELECT id FROM diary_imports WHERE user_id=?').bind(userId).first())throw new Error('이미 자료가 있습니다. 가져오기는 새 계정에서 한 번만 가능합니다.');
  const sets=Object.fromEntries(exportTables.map(t=>[t,new Set<string>()])) as Record<string,Set<string>>;
  const maps:Record<string,Record<string,string>>={};
  const normalized:Record<string,Record<string,any>[]>={};
  for(const table of exportTables){
    maps[table]={};normalized[table]=[];
    for(const raw of data[table]){
      if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('원본 행 형식이 맞지 않습니다.');
      const row:Record<string,any>={};
      for(const column of columns[table]){
        const value=raw[column]===undefined&&nullable.has(column)?null:column==='task_kind'&&raw[column]===undefined?'task':raw[column];
        validateValue(column,value);row[column]=value;
      }
      if(sets[table].has(row.id))throw new Error('중복된 원본 ID가 있습니다.');
      sets[table].add(row.id);maps[table][row.id]=await digest(userId,table+':'+row.id);normalized[table].push(row);
    }
  }
  for(const [table,rows] of Object.entries(normalized))for(const row of rows){
    if(row.plan_id&&!sets.plans.has(row.plan_id))throw new Error('계획 연결이 누락되었습니다.');
    if(row.task_id&&!sets.tasks.has(row.task_id))throw new Error('할 일 연결이 누락되었습니다.');
    if(row.source_review_id&&!sets.reviews.has(row.source_review_id))throw new Error('돌아보기 연결이 누락되었습니다.');
    if(table==='plans'&&row.end_date<row.start_date)throw new Error('계획 기간이 잘못되었습니다.');
    if(table==='tasks'&&row.task_kind==='span'&&(!row.start_date||row.start_date>row.due_date))throw new Error('할 일 기간이 잘못되었습니다.');
    if(table==='execution_records'){
      const minutes=(Date.parse(row.ended_at)-Date.parse(row.started_at))/60000;
      if(minutes<=0||Math.abs(minutes-row.actual_minutes)>0.0011||Date.parse(row.ended_at)>Date.now()+60000)throw new Error('실제 수행 시각과 소요 시간이 맞지 않습니다.');
    }
    if(row.snapshot){const snap=JSON.parse(row.snapshot);if(!snap||typeof snap!=='object'||Array.isArray(snap))throw new Error('이력 형식이 잘못되었습니다.');if(table==='reviews'&&['planned','completed','delayed','blocked','estimated','actual','difference'].some(k=>typeof snap[k]!=='number'||!Number.isFinite(snap[k])))throw new Error('돌아보기 집계 형식이 잘못되었습니다.');}
  }
  const statements:D1PreparedStatement[]=[];
  for(const table of ['plans','plan_revisions','tasks','execution_records','completion_events','reviews','subtasks']){
    for(const row of normalized[table]){
      const values:Record<string,any>={...row,id:maps[table][row.id]};
      if(row.plan_id)values.plan_id=maps.plans[row.plan_id];
      if(row.task_id)values.task_id=maps.tasks[row.task_id];
      if(row.source_review_id)values.source_review_id=maps.reviews[row.source_review_id];
      if(row.request_key)values.request_key=await digest(userId,'request:'+table+':'+row.request_key);
      if(row.snapshot&&table==='plan_revisions'){
        const snap=JSON.parse(row.snapshot);if(typeof snap.id==='string'&&maps.plans[snap.id])snap.id=maps.plans[snap.id];if(snap.source_review_id)snap.source_review_id=maps.reviews[snap.source_review_id]??null;delete snap.owner_user_id;values.snapshot=JSON.stringify(snap);
      }
      const keys=[...columns[table]];if(table==='plans'){keys.push('owner_user_id');values.owner_user_id=userId;}
      statements.push(database.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>values[k])));
    }
  }
  const counts=Object.fromEntries(exportTables.map(t=>[t,data[t].length]));
  statements.push(database.prepare('INSERT INTO diary_imports (id,user_id,source_commit,source_exported_at,counts,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,SOURCE,data.exported_at,JSON.stringify({counts,id_map:maps}),new Date().toISOString()));
  await database.batch(statements);
  return counts;
}
