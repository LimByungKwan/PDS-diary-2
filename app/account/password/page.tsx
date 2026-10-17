import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import ChangePassword from '@/components/change-password';
export const dynamic = 'force-dynamic';
export default async function PasswordPage() {
  const session = await getAuth().api.getSession({ headers: await headers(), query: { disableCookieCache: true, disableRefresh: true } });
  if (!session) redirect('/login');
  return <ChangePassword email={session.user.email}/>;
}
