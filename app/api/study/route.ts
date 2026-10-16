import { env } from 'cloudflare:workers';
import {accountSession,requireSameOrigin} from '@/lib/auth';
import {readStudy,mutateStudy,studySummary} from '@/lib/study';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{const s=await accountSession(req);if(!s)return json({error:'로그인이 필요합니다.'},401);const state=await readStudy(env.DB!,s.user.id);return json({...state,summary:studySummary(state.days)});}catch{return json({error:'관찰 기록을 불러오지 못했습니다.'},503)}}
export async function POST(req:Request){let s;try{s=await accountSession(req)}catch{return json({error:'인증 서비스를 사용할 수 없습니다.'},503)}if(!s)return json({error:'로그인이 필요합니다.'},401);if(!requireSameOrigin(req))return json({error:'같은 사이트에서 요청해 주세요.'},403);if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON 형식이 필요합니다.'},415);const raw=await req.text();if(raw.length>5000)return json({error:'입력이 너무 깁니다.'},413);try{await mutateStudy(env.DB!,s.user.id,JSON.parse(raw));return json({ok:true})}catch(e){return json({error:e instanceof Error&&!/SQL|D1|constraint|UNIQUE/i.test(e.message)?e.message:'기록이 이미 있거나 저장하지 못했습니다. 새로고침 후 확인해 주세요.'},400)}}
