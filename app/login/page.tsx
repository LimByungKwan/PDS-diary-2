'use client';
import { useState } from 'react';
import { readAuthResponse } from '@/lib/auth-response';
import { Leaf, LockKeyhole, ArrowRight, Eye, EyeOff } from 'lucide-react';
function PasswordField({name,label,signup=false}:{name:string,label:string,signup?:boolean}) {
  const [visible,setVisible]=useState(false);
  const inputId='auth-'+name;
  return <div className="field"><label htmlFor={inputId}>{label}</label><div className="password-input"><input id={inputId} name={name} type={visible?'text':'password'} autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128}/><button className="password-toggle" type="button" aria-label={label+(visible?' 숨기기':' 표시')} aria-pressed={visible} aria-controls={inputId} title={visible?'비밀번호 숨기기':'비밀번호 표시'} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={20} aria-hidden="true"/>:<Eye size={20} aria-hidden="true"/>}</button></div></div>;
}
export default function Login() {
  const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [blockedEmail,setBlockedEmail]=useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || (signup && blockedEmail)) return;
    const form = e.currentTarget; const f = new FormData(form);
    const password = String(f.get('password') ?? '');
    if (signup && password !== f.get('confirm')) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch(signup ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: String(f.get('email')).trim().toLowerCase(), password, ...(signup ? { name: String(f.get('name')).trim() } : {}) }) });
      await readAuthResponse(r);
      form.reset();
      if (signup) { setSignup(false); setBlockedEmail(''); setNotice('회원가입이 완료되었습니다. 가입한 이메일과 비밀번호로 로그인해 주세요.'); }
      else window.location.replace('/diary');
    } catch (err) { if(signup && (err as {code?:string})?.code==='EMAIL_ALREADY_EXISTS')setBlockedEmail(String(f.get('email')).trim().toLowerCase()); setError(err instanceof Error ? err.message : '연결을 확인하고 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-intro"><a className="auth-brand" href="/"><Leaf size={27}/> 플랜두씨</a><p className="eyebrow">A LITTLE BETTER, EVERY DAY</p><h1>나의 계획,<br/>나만의 공간.</h1><p>계획하고, 실제를 기록하고, 내일을 바꿔요.<br/>다이어리 기록은 로그인한 내 계정에 저장됩니다.</p><div className="auth-promise"><LockKeyhole size={20}/><span>로그인 전에는 기록을 표시하지 않습니다.</span></div><small>PLAN → DO → SEE</small></section><section className="auth-card"><div className="auth-tabs"><button type="button" aria-pressed={!signup} onClick={()=>{setSignup(false);setBlockedEmail('');setError('');setNotice('')}}>로그인</button><button type="button" aria-pressed={signup} onClick={()=>{setSignup(true);setBlockedEmail('');setError('');setNotice('')}}>회원가입</button></div><h2>{signup ? '나만의 다이어리 만들기' : '다시 만나 반가워요.'}</h2><p>{signup ? '이메일과 12자 이상의 비밀번호로 시작하세요.' : '가입한 이메일과 비밀번호를 입력하세요.'}</p>{error&&<div role="alert" className="message error">{error}</div>}{notice&&<div role="status" className="message success">{notice}</div>}<form onSubmit={submit} key={signup?'signup':'login'}>{signup&&<label className="field"><span>이름 또는 닉네임</span><input name="name" autoComplete="nickname" required maxLength={50}/></label>}<label className="field"><span>이메일</span><input name="email" type="email" autoComplete="username" required maxLength={254} onChange={e=>{if(blockedEmail&&e.target.value.trim().toLowerCase()!==blockedEmail){setBlockedEmail('');setError('')}}} aria-invalid={signup&&!!blockedEmail}/></label><PasswordField name="password" label="비밀번호" signup={signup}/>{signup&&<PasswordField name="confirm" label="비밀번호 확인" signup/>}<button className="primary" disabled={busy||(signup&&!!blockedEmail)}>{busy?'처리 중…':signup&&blockedEmail?'다른 이메일을 입력해 주세요':signup?'계정 만들기':'로그인'}<ArrowRight size={17}/></button></form><p className="auth-footnote">비밀번호는 대화나 과제 제출문에 적지 마세요.<br/>이메일 확인·비밀번호 찾기는 아직 제공하지 않습니다.</p></section></main>;
}
