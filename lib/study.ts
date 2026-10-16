import { addDays, seoulToday } from './domain';
export const studyProtocol={question:'계획 규칙을 하나 바꾸면 공부 시간의 예상 오차가 줄어들까?',metric:'하루 공부 시간의 절대 예측 오차',unit:'분',calculation:'하루에 정한 공부 할 일 1개의 |실제 시간 합계 − 시작 전에 고정한 예상 시간|. 실제 시간은 그날 시작·종료한 실행 기록에서 합산하고 결과 확정 시 보존한다.',missing:'공부 안 함을 명시한 날만 실제 0분. 빠진 날·미확정 날은 결측으로 두고 합계·평균에서 제외하며 5일 완료로 세지 않는다.',duplicates:'계정의 날짜별 기록 1건, 연결할 할 일 1개. 같은 실행 ID는 한 번만 합산한다.',outliers:'큰 값도 삭제·보정하지 않고 사유를 적어 그대로 포함한다.',rounding:'분 단위 원값으로 계산하고 합계·평균 표시는 소수 둘째 자리에서 반올림하여 소수 첫째 자리까지.',weekStart:'월요일',timezone:'Asia/Seoul',baselineRule:'공부 시작 전에 오늘 공부할 일 한 가지를 정하고 예상 시간을 분 단위로 적는다.'};
export async function readStudy(db:D1Database,userId:string){
 const experiment=await db.prepare('SELECT * FROM study_experiments WHERE user_id=?').bind(userId).first<any>();
 if(!experiment)return {experiment:null,days:[],change:null,today:seoulToday()};
 const days=(await db.prepare('SELECT * FROM study_days WHERE experiment_id=? ORDER BY day_number').bind(experiment.id).all<any>()).results;
 const change=await db.prepare('SELECT * FROM study_rule_changes WHERE experiment_id=?').bind(experiment.id).first<any>();
 return {experiment,days,change,today:seoulToday()};
}
export function studySummary(days:any[]){const done=days.filter(d=>d.closed_at&&d.actual_minutes!==null);const summarize=(list:any[])=>{const sum=list.reduce((n,d)=>n+Math.abs(d.actual_minutes-d.expected_minutes),0);return {count:list.length,sum,average:list.length?sum/list.length:null}};return {all:summarize(done),before:summarize(done.filter(d=>d.day_number<=2)),after:summarize(done.filter(d=>d.day_number>=3))};}
const text=(x:unknown,max=1000)=>{if(typeof x!=='string'||!x.trim()||x.length>max)throw new Error('내용을 확인해 주세요.');return x.trim()};
export async function mutateStudy(db:D1Database,userId:string,b:any,at=new Date()){
 const now=at.toISOString(),today=seoulToday(at);
 const state=await readStudy(db,userId),e=state.experiment;
 if(b.action==='start'){
  if(e)throw new Error('이미 시작 기준이 저장돼 있습니다.');
  if(b.start_date!==today)throw new Error('시작일은 서울 시간 기준 오늘이어야 합니다.');
  const baselineRule=text(b.baseline_rule,500);
  await db.prepare('INSERT INTO study_experiments (id,user_id,start_date,protocol,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),userId,today,JSON.stringify({...studyProtocol,baselineRule}),now).run();return;
 }
 if(!e)throw new Error('시작 기준을 먼저 저장해 주세요.');
 const day=(Date.parse(today+'T00:00:00Z')-Date.parse(e.start_date+'T00:00:00Z'))/86400000+1;
 if(day<1||day>5)throw new Error('5일 관찰 기간에만 기록할 수 있습니다.');
 if(b.action==='changeRule'){
  const one=state.days.find((d:any)=>d.day_number===1&&d.closed_at),two=state.days.find((d:any)=>d.day_number===2&&d.closed_at);
  if(!one||!two||state.change||state.days.some((d:any)=>d.day_number>=3)||day<2||day>3)throw new Error('2일차 결과 확정 후, 3일차 시작 전에 한 번만 바꿀 수 있습니다.');
  const rule=text(b.rule,500),reason=text(b.reason);if(rule===JSON.parse(e.protocol).baselineRule)throw new Error('바꾸려는 계획 규칙을 적어 주세요.');
  await db.prepare('INSERT INTO study_rule_changes (id,experiment_id,rule,reason,day_one_id,day_two_id,changed_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),e.id,rule,reason,one.id,two.id,now).run();return;
 }
 if(b.action==='openDay'){
  if(state.days.some((d:any)=>d.date===today))throw new Error('오늘의 공부 계획은 이미 고정돼 있습니다.');
  if(state.days.filter((d:any)=>d.closed_at).length!==day-1)throw new Error('앞선 날짜의 결과가 빠져 있습니다. 과거 날짜를 오늘 기록한 것으로 바꿀 수는 없습니다.');
  if(day>=3&&!state.change)throw new Error('3일차 전에 계획 규칙 하나를 바꾸고 저장해 주세요.');
  const task=await db.prepare('SELECT t.* FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=? AND p.owner_user_id=? AND p.deleted_at IS NULL AND t.deleted_at IS NULL AND t.due_date=? AND t.task_kind=\'task\' AND t.status=\'active\'').bind(text(b.task_id,80),userId,today).first<any>();
  if(!task)throw new Error('오늘 마감인 내 일반 할 일 중 진행 중인 공부 할 일을 골라 주세요.');
  const prior=await db.prepare('SELECT id FROM execution_records WHERE task_id=?').bind(task.id).first();if(prior)throw new Error('이미 실행 기록이 있습니다. 공부를 시작하기 전에 새 할 일을 골라 주세요.');
  await db.prepare('INSERT INTO study_days (id,experiment_id,day_number,date,task_id,expected_minutes,opened_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),e.id,day,today,task.id,task.estimated_minutes,now).run();return;
 }
 if(b.action==='closeDay'){
  const d=state.days.find((d:any)=>d.date===today&&!d.closed_at);if(!d)throw new Error('오늘 공부 계획을 먼저 고정하거나, 이미 확정한 결과인지 확인해 주세요.');
  const records=(await db.prepare('SELECT id,started_at,ended_at,actual_minutes FROM execution_records WHERE task_id=? ORDER BY started_at,id').bind(d.task_id).all<any>()).results;
  if(records.some(r=>seoulToday(new Date(r.started_at))!==today||seoulToday(new Date(r.ended_at))!==today||Date.parse(r.started_at)<Date.parse(d.opened_at)||Date.parse(r.ended_at)>at.getTime()))throw new Error('시작 기준 고정 이후, 오늘 시작·종료한 실행 기록만 사용할 수 있습니다.');
  if(!records.length&&b.no_study!==true)throw new Error('실행 기록을 먼저 남겨 주세요. 실제로 공부하지 않았다면 공부 안 함을 표시해 주세요.');
  if(records.length&&b.no_study===true)throw new Error('실행 기록이 있어 공부 안 함으로 확정할 수 없습니다.');
  const note=text(b.note);const actual=records.reduce((n,r)=>n+r.actual_minutes,0);
  await db.prepare('UPDATE study_days SET actual_minutes=?,evidence=?,note=?,closed_at=? WHERE id=? AND closed_at IS NULL').bind(actual,JSON.stringify(records),note,now,d.id).run();return;
 }
 throw new Error('지원하지 않는 요청입니다.');
}
export const studyEnd=(start:string)=>addDays(start,4);
