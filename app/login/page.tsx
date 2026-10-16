'use client';
import { useState } from 'react';
import { Leaf, LockKeyhole, ArrowRight } from 'lucide-react';
export default function Login() {
  const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = e.currentTarget; const f = new FormData(form);
    const password = String(f.get('password') ?? '');
    if (signup && password !== f.get('confirm')) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch(signup ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: String(f.get('email')).trim().toLowerCase(), password, ...(signup ? { name: String(f.get('name')).trim() } : {}) }) });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? '요청을 처리하지 못했습니다.');
      form.reset();
      if (signup) { setSignup(false); setNotice('가입 요청을 처리했습니다. 이미 가입한 이메일이면 기존 비밀번호로 로그인해 주세요.'); }
      else window.location.replace('/diary');
    } catch (err) { setError(err instanceof Error ? err.message : '연결을 확인하고 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-intro"><a className="auth-brand" href="/"><Leaf size={27}/> 플랜두씨</a><p className="eyebrow">A LITTLE BETTER, EVERY DAY</p><h1>나의 계획,<br/>나만의 공간.</h1><p>계획하고, 실제를 기록하고, 내일을 바꿔요.<br/>다이어리 기록은 로그인한 내 계정에 저장됩니다.</p><div className="auth-promise"><LockKeyhole size={20}/><span>로그인 전에는 기록을 표시하지 않습니다.</span></div><small>PLAN → DO → SEE</small></section><section className="auth-card"><div className="auth-tabs"><button type="button" aria-pressed={!signup} onClick={()=>{setSignup(false);setError('');setNotice('')}}>로그인</button><button type="button" aria-pressed={signup} onClick={()=>{setSignup(true);setError('');setNotice('')}}>회원가입</button></div><h2>{signup ? '나만의 다이어리 만들기' : '다시 만나 반가워요.'}</h2><p>{signup ? '이메일과 12자 이상의 비밀번호로 시작하세요.' : '가입한 이메일과 비밀번호를 입력하세요.'}</p>{error&&<div role="alert" className="message error">{error}</div>}{notice&&<div role="status" className="message success">{notice}</div>}<form onSubmit={submit} key={signup?'signup':'login'}>{signup&&<label className="field"><span>이름 또는 닉네임</span><input name="name" autoComplete="nickname" required maxLength={50}/></label>}<label className="field"><span>이메일</span><input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label className="field"><span>비밀번호</span><input name="password" type="password" autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128}/></label>{signup&&<label className="field"><span>비밀번호 확인</span><input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>}<button className="primary" disabled={busy}>{busy?'처리 중…':signup?'계정 만들기':'로그인'}<ArrowRight size={17}/></button></form><p className="auth-footnote">비밀번호는 대화나 과제 제출문에 적지 마세요.<br/>이메일 확인·비밀번호 찾기는 아직 제공하지 않습니다.</p></section></main>;
}
