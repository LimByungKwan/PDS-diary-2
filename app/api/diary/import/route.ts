import { env } from 'cloudflare:workers';
import { accountSession, requireSameOrigin } from '@/lib/auth';
import { importDiary } from '@/lib/import-diary';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try{
    const session=await accountSession(req);
    if(!session)return Response.json({error:'로그인이 필요합니다.'},{status:401,headers});
    if(!requireSameOrigin(req))return Response.json({error:'같은 사이트에서 요청해 주세요.'},{status:403,headers});
    if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON 파일을 선택해 주세요.'},{status:415,headers});
    const text=await req.text();if(text.length>2000000)return Response.json({error:'2MB 이하의 파일을 선택해 주세요.'},{status:413,headers});
    const counts=await importDiary(env.DB!,session.user.id,JSON.parse(text));
    return Response.json({ok:true,counts},{headers});
  }catch{return Response.json({error:'가져오지 못했습니다. 빈 계정인지, 파일의 ID·날짜·시간·연결이 올바른지 확인해 주세요. 원본 자료는 수정하지 않았습니다.'},{status:400,headers});}
}
