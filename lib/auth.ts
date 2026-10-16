import { env } from 'cloudflare:workers';
import { createDiaryAuth } from './auth-core';
export function getAuth() {
  if (!env.DB || !env.BETTER_AUTH_URL || !env.BETTER_AUTH_SECRET) throw new Error('Authentication unavailable');
  return createDiaryAuth(env.DB, env.BETTER_AUTH_URL, env.BETTER_AUTH_SECRET);
}
export async function accountSession(request: Request) {
  return getAuth().api.getSession({ headers: request.headers, query: { disableCookieCache: true, disableRefresh: true } });
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
