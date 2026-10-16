import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import Diary from '@/components/diary';
export const dynamic = 'force-dynamic';
export default async function ProtectedDiary() {
  const s = await getAuth().api.getSession({ headers: await headers(), query: { disableCookieCache: true, disableRefresh: true } });
  if (!s) redirect('/login');
  return <Diary user={{ id: s.user.id, name: s.user.name, email: s.user.email }}/>;
}
