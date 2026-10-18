import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import ts from 'typescript';
const dir='.sites-runtime/study-test';mkdirSync(dir,{recursive:true});
for(const [src,dest] of [['domain','domain'],['study','study']])writeFileSync(`${dir}/${dest}.mjs`,ts.transpileModule(readFileSync(`lib/${src}.ts`,'utf8').replace("'./domain'","'./domain.mjs'"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {mutateStudy,readStudy,studySummary}=await import('../'+dir+'/study.mjs');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
class Stmt{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Stmt(this.sql,args)}async first(){return sqlite.prepare(this.sql).get(...this.args)??null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}}
const db={prepare(sql){return new Stmt(sql)},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const at=(day,time='00:00:00')=>new Date(`2026-10-${day}T${time}Z`);
const act=(body,day,time)=>mutateStudy(db,'A',body,at(day,time));
try{
for(const u of ['A','B']){sqlite.prepare('INSERT INTO auth_users (id,name,email,created_at,updated_at) VALUES (?,?,?,?,?)').run(u,u,u+'@example.test',1,1);sqlite.prepare('INSERT INTO plans (id,owner_user_id,title,start_date,end_date,priority,success,estimated_minutes,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(u,u,'synthetic','2026-10-16','2026-10-20',2,'synthetic',150,'2026-10-16T00:00:00Z')}
await assert.rejects(act({action:'start',start_date:'2026-10-15',baseline_rule:'synthetic baseline'},16),/오늘/);
await act({action:'start',start_date:'2026-10-16',baseline_rule:'synthetic baseline'},16);
await assert.rejects(act({action:'start',start_date:'2026-10-16',baseline_rule:'duplicate'},16),/이미/);
await assert.rejects(act({action:'changeRule',rule:'premature',reason:'synthetic'},16),/2일차/);
for(let n=0;n<5;n++){
 const day=16+n,task='T'+n;sqlite.prepare('INSERT INTO tasks (id,plan_id,title,description,due_date,priority,tags,estimated_minutes,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(task,'A','synthetic study','','2026-10-'+day,2,'test',30,at(day).toISOString());
 if(n===0){sqlite.prepare('INSERT INTO tasks (id,plan_id,title,description,due_date,priority,tags,estimated_minutes,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('foreign','B','foreign','','2026-10-16',2,'',30,at(16).toISOString());await assert.rejects(act({action:'openDay',task_id:'foreign'},16),/내 일반/)}
 if(n===2){await assert.rejects(act({action:'openDay',task_id:task},day),/계획 규칙/);await act({action:'changeRule',rule:'synthetic changed rule',reason:'based on days 1 and 2'},day);await assert.rejects(act({action:'changeRule',rule:'second change',reason:'no'},day),/한 번/)}
 await act({action:'openDay',task_id:task},day,'00:01:00');
 await assert.rejects(act({action:'openDay',task_id:task},day,'00:01:30'),/이미/);
 await assert.rejects(act({action:'closeDay',note:'missing'},day,'01:00:00'),/실행 기록/);
 const minutes=[40,20,30,32,31][n],start=at(day,'00:02:00'),end=new Date(+start+minutes*60000);
 sqlite.prepare('INSERT INTO execution_records (id,task_id,started_at,ended_at,actual_minutes,blocked_reason,note,request_key,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('R'+n,task,start.toISOString(),end.toISOString(),minutes,'','synthetic','K'+n,end.toISOString());
 await act({action:'closeDay',note:'synthetic test only'},day,'02:00:00');
 await assert.rejects(act({action:'closeDay',note:'overwrite'},day,'02:01:00'),/이미/);
}
const state=await readStudy(db,'A'),sum=studySummary(state.days);assert.equal(state.days.length,5);assert.equal(sum.before.average,10);assert.equal(sum.after.average,1);assert.equal(sum.all.sum,23);assert.equal(sum.all.average,4.6);assert.equal((await readStudy(db,'B')).experiment,null);
assert.equal(state.change.day_one_id,state.days[0].id);assert.equal(state.change.day_two_id,state.days[1].id);assert.ok(state.change.changed_at>state.days[1].closed_at&&state.change.changed_at<state.days[2].opened_at);
assert.equal(studySummary([]).all.average,null);assert.equal(studySummary([{closed_at:null,actual_minutes:null}]).all.count,0);
await assert.rejects(act({action:'restart',experiment_id:state.experiment.id,confirm:true,reason:'completed results must remain',baseline_rule:'baseline'},21),/확정 결과/);
await mutateStudy(db,'B',{action:'start',start_date:'2026-10-17',baseline_rule:'old baseline'},at(17));
const oldB=await readStudy(db,'B');
sqlite.prepare('INSERT INTO tasks (id,plan_id,title,description,due_date,priority,tags,estimated_minutes,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('restart-task','B','preserved','','2026-10-17',2,'',150,at(17).toISOString());
await mutateStudy(db,'B',{action:'openDay',task_id:'restart-task'},at(17,'08:00:00'));
sqlite.prepare('INSERT INTO execution_records (id,task_id,started_at,ended_at,actual_minutes,blocked_reason,note,request_key,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('early','restart-task',at(17,'07:00:00').toISOString(),at(17,'12:00:00').toISOString(),300,'','realistic invalid order fixture','restart-key',at(17,'12:00:00').toISOString());
await assert.rejects(mutateStudy(db,'B',{action:'closeDay',note:'before prediction'},at(17,'13:00:00')),/고정/);
const restart={action:'restart',experiment_id:oldB.experiment.id,confirm:true,reason:'began before prediction; preserve actual timestamps',baseline_rule:'new baseline'};
await assert.rejects(mutateStudy(db,'A',restart,at(18)),/상태가 바뀌/);
await assert.rejects(mutateStudy(db,'B',{...restart,confirm:false},at(18)),/확인/);
await mutateStudy(db,'B',restart,at(18));
const fresh=await readStudy(db,'B'),archives=JSON.parse(fresh.experiment.protocol).previousAttempts;
assert.equal(fresh.experiment.start_date,'2026-10-18');assert.notEqual(fresh.experiment.id,oldB.experiment.id);assert.equal(fresh.days.length,0);assert.equal(archives.length,1);assert.equal(archives[0].days.length,1);assert.equal(archives[0].start_date,'2026-10-17');assert.equal(archives[0].protocol.baselineRule,'old baseline');assert.equal(sqlite.prepare('SELECT actual_minutes FROM execution_records WHERE id=?').get('early').actual_minutes,300);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tasks WHERE plan_id=?').get('B').n,2);
await assert.rejects(mutateStudy(db,'B',restart,at(18)),/상태가 바뀌/);
console.log('Study workflow passed: five synthetic dates, fixed baseline, one rule change, no backdating, ownership, duplicate and missing records, arithmetic. No production data written.');
}finally{sqlite.close();rmSync(dir,{recursive:true,force:true})}
