import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export function createDiaryAuth(database: D1Database, baseURL: string, secret: string) {
  if (!secret || secret.length < 32) throw new Error('Authentication configuration unavailable');
  return betterAuth({
    appName: '플랜두씨 2', baseURL, secret,
    database: drizzleAdapter(drizzle(database, { schema }), {
      provider: 'sqlite', transaction: false,
      schema: { user: schema.authUsers, session: schema.authSessions, account: schema.authAccounts, verification: schema.authVerifications, rateLimit: schema.authRateLimits },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: false },
    session: { expiresIn: 60 * 60 * 24, updateAge: 0, disableSessionRefresh: true, cookieCache: { enabled: false } },
    advanced: { cookiePrefix: 'pds', useSecureCookies: new URL(baseURL).protocol === 'https:' },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30, customRules: {
      '/sign-in/email': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 3 },
    } },
    logger: { disabled: true },
  });
}
