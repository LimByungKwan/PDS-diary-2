import { env } from 'cloudflare:workers';
import { getAuth, accountSession, requireSameOrigin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const allowed = new Set(['/sign-up/email', '/sign-in/email', '/sign-out', '/get-session', '/change-password']);
async function handle(req: Request) {
  const path = new URL(req.url).pathname.slice('/api/auth'.length);
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (!allowed.has(path) || (req.method === 'GET' && path !== '/get-session')) return Response.json({ error: '지원하지 않는 요청입니다.' }, { status: 404, headers });
  if (req.method === 'POST' && !requireSameOrigin(req)) return Response.json({ error: '같은 사이트에서 요청해 주세요.' }, { status: 403, headers });
  try {
    if (req.method === 'POST') {
      if (!req.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'JSON 형식이 필요합니다.' }, { status: 415, headers });
      if ((await req.clone().text()).length > 5000) return Response.json({ error: '입력이 너무 깁니다.' }, { status: 413, headers });
    }
    const previous = path === '/change-password' ? await accountSession(req) : null;
    const res = await getAuth().handler(req);
    const cookies = res.headers.getSetCookie();
    for (const cookie of cookies) headers.append('Set-Cookie', cookie);
    if (!res.ok) {
      const status = res.status === 429 ? 429 : path === '/sign-in/email' ? 401 : path === '/sign-up/email' && res.status < 500 ? 400 : res.status;
      const message = status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.' : path === '/sign-in/email' ? '이메일 또는 비밀번호를 확인해 주세요.' : path === '/sign-up/email' ? '가입하지 못했습니다. 이메일 중복과 입력 형식을 확인해 주세요.' : '요청을 처리하지 못했습니다. 입력값을 확인해 주세요.';
      return Response.json({ error: message }, { status, headers });
    }
    if (previous && path === '/change-password') await env.DB!.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(previous.user.id).run();
    if (path === '/get-session') {
      const session = await accountSession(req);
      return Response.json(session ? { user: { id: session.user.id, name: session.user.name, email: session.user.email }, session: { expiresAt: session.session.expiresAt } } : null, { headers });
    }
    // The browser authenticates with its HttpOnly cookie. Never echo a session token.
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ error: '인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, { status: 503, headers });
  }
}
export const GET = handle;
export const POST = handle;
