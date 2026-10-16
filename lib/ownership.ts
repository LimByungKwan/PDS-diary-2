export async function ownedDiary(database: D1Database, userId: string) {
  const queries: Record<string, string> = {
    plans: 'SELECT * FROM plans WHERE owner_user_id=? ORDER BY created_at,id',
    plan_revisions: 'SELECT r.* FROM plan_revisions r JOIN plans p ON p.id=r.plan_id WHERE p.owner_user_id=? ORDER BY r.created_at,r.id',
    tasks: 'SELECT t.* FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE p.owner_user_id=? ORDER BY t.created_at,t.id',
    reviews: 'SELECT r.* FROM reviews r JOIN plans p ON p.id=r.plan_id WHERE p.owner_user_id=? ORDER BY r.created_at,r.id',
    execution_records: 'SELECT r.* FROM execution_records r JOIN tasks t ON t.id=r.task_id JOIN plans p ON p.id=t.plan_id WHERE p.owner_user_id=? ORDER BY r.created_at,r.id',
    completion_events: 'SELECT r.* FROM completion_events r JOIN tasks t ON t.id=r.task_id JOIN plans p ON p.id=t.plan_id WHERE p.owner_user_id=? ORDER BY r.created_at,r.id',
    subtasks: 'SELECT r.* FROM subtasks r JOIN tasks t ON t.id=r.task_id JOIN plans p ON p.id=t.plan_id WHERE p.owner_user_id=? ORDER BY r.created_at,r.id',
  };
  const names = Object.keys(queries);
  const rows = await database.batch(names.map(name=>database.prepare(queries[name]).bind(userId)));
  return Object.fromEntries(names.map((name,i)=>[name,rows[i].results])) as Record<string,any[]>;
}

export async function mutationOwner(database: D1Database, userId: string, body: Record<string,unknown>) {
  const action = body.action;
  if (action === 'createPlan' || action === 'initialize' || action === 'seedExerciseSubtasks') return true;
  let sql: string; let resourceId: unknown;
  if (['updatePlan','deletePlan'].includes(String(action))) {
    sql='SELECT id FROM plans WHERE id=? AND owner_user_id=?';resourceId=body.id;
  } else if (['createTask','review'].includes(String(action))) {
    sql='SELECT id FROM plans WHERE id=? AND owner_user_id=? AND deleted_at IS NULL';resourceId=body.plan_id;
  } else if (['updateTask','repeatTask','createSubtasks','complete','undo','deleteTask','record'].includes(String(action))) {
    sql='SELECT t.id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=? AND p.owner_user_id=? AND p.deleted_at IS NULL AND t.deleted_at IS NULL';
    resourceId=['repeatTask','createSubtasks','record'].includes(String(action))?body.task_id:body.id;
  } else if (['updateSubtask','setSubtask','deleteSubtask'].includes(String(action))) {
    sql='SELECT s.id FROM subtasks s JOIN tasks t ON t.id=s.task_id JOIN plans p ON p.id=t.plan_id WHERE s.id=? AND p.owner_user_id=? AND p.deleted_at IS NULL AND t.deleted_at IS NULL AND s.deleted_at IS NULL';resourceId=body.id;
  } else if (action === 'updateRecordNote') {
    sql='SELECT r.id FROM execution_records r JOIN tasks t ON t.id=r.task_id JOIN plans p ON p.id=t.plan_id WHERE r.id=? AND p.owner_user_id=? AND p.deleted_at IS NULL AND t.deleted_at IS NULL';resourceId=body.id;
  } else if (action === 'nextPlan') {
    sql='SELECT r.id FROM reviews r JOIN plans p ON p.id=r.plan_id WHERE r.id=? AND p.owner_user_id=? AND p.deleted_at IS NULL';resourceId=body.review_id;
  } else return false;
  if(typeof resourceId!=='string'||resourceId.length>80) return false;
  return !!await database.prepare(sql).bind(resourceId,userId).first();
}
