import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import DeleteAccount from '@/components/delete-account';
export const dynamic = 'force-dynamic';
export default async function DeleteAccountPage() {
  const session = await getAuth().api.getSession({ headers: await headers(), query: { disableCookieCache: true, disableRefresh: true } });
  if (!session) redirect('/login');
  return <DeleteAccount email={session.user.email}/>;
}
