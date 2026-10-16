import { accountSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    const s = await accountSession(req);
    if (!s) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers });
    return Response.json({ user: { id: s.user.id, name: s.user.name, email: s.user.email }, expiresAt: s.session.expiresAt }, { headers });
  } catch { return Response.json({ error: '계정 정보를 불러오지 못했습니다.' }, { status: 503, headers }); }
}
