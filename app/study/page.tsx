import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {getAuth} from '@/lib/auth';
import Study from '@/components/study';
export const dynamic='force-dynamic';
export default async function StudyPage(){const s=await getAuth().api.getSession({headers:await headers(),query:{disableCookieCache:true,disableRefresh:true}});if(!s)redirect('/login');return <Study/>;}
