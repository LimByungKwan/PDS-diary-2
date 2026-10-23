import { env } from 'cloudflare:workers';
import { verifyPassword } from 'better-auth/crypto';
import { accountSession, requireSameOrigin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function POST(req: Request) {
  try {
    const session = await accountSession(req);
    if (!session) return reply({ error: '로그인이 필요합니다.' }, 401);
    if (!requireSameOrigin(req)) return reply({ error: '같은 사이트에서 요청해 주세요.' }, 403);
    if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error: 'JSON 형식이 필요합니다.' }, 415);
    const raw = await req.text();
    if (raw.length > 2000) return reply({ error: '입력이 너무 깁니다.' }, 413);
    let body: { password?: unknown; confirmation?: unknown };
    try { body = JSON.parse(raw); } catch { return reply({ error: '입력 형식을 확인해 주세요.' }, 400); }
    if (!body || body.confirmation !== '계정 삭제' || typeof body.password !== 'string' || !body.password.length || body.password.length > 128) return reply({ error: '현재 비밀번호와 확인 문구 ‘계정 삭제’를 입력해 주세요.' }, 400);
    const db = env.DB!, userId = session.user.id, now = Date.now(), key = 'account-delete:' + userId;
    const rate = await db.prepare('INSERT INTO auth_rate_limits (id,key,count,last_request) VALUES (?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN last_request<=? THEN 1 ELSE count+1 END,last_request=? RETURNING count').bind(crypto.randomUUID(), key, now, now - 60000, now).first<{ count: number }>();
    if (!rate || rate.count > 5) return reply({ error: '요청이 많습니다. 1분 뒤 다시 시도해 주세요.' }, 429);
    const account = await db.prepare("SELECT password FROM auth_accounts WHERE user_id=? AND provider_id='credential'").bind(userId).first<{ password: string }>();
    if (!account?.password || !await verifyPassword({ hash: account.password, password: body.password })) return reply({ error: '현재 비밀번호를 확인해 주세요.' }, 400);
    // D1 batch is atomic. Remove children before parents, including soft-deleted data.
    // The authenticated session is the only source of the acting user ID.
    const plans = 'SELECT id FROM plans WHERE owner_user_id=?';
    const tasks = `SELECT id FROM tasks WHERE plan_id IN (${plans})`;
    const experiments = 'SELECT id FROM study_experiments WHERE user_id=?';
    const sql = [
      `DELETE FROM study_rule_changes WHERE experiment_id IN (${experiments})`,
      `DELETE FROM study_days WHERE experiment_id IN (${experiments})`,
      'DELETE FROM study_experiments WHERE user_id=?',
      ...['execution_records', 'completion_events', 'subtasks'].map(table => `DELETE FROM ${table} WHERE task_id IN (${tasks})`),
      `DELETE FROM tasks WHERE plan_id IN (${plans})`,
      ...['plan_revisions', 'reviews'].map(table => `DELETE FROM ${table} WHERE plan_id IN (${plans})`),
      'DELETE FROM plans WHERE owner_user_id=?',
      'DELETE FROM diary_imports WHERE user_id=?',
      'DELETE FROM auth_sessions WHERE user_id=?',
      'DELETE FROM auth_accounts WHERE user_id=?',
      'DELETE FROM auth_users WHERE id=?',
    ];
    await db.batch([...sql.map(query => db.prepare(query).bind(userId)), db.prepare('DELETE FROM auth_rate_limits WHERE key=?').bind(key)]);
    const response = reply({ ok: true });
    for (const name of ['pds.session_token', '__Secure-pds.session_token']) response.headers.append('Set-Cookie', `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return response;
  } catch { return reply({ error: '계정을 삭제하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.' }, 503); }
}
