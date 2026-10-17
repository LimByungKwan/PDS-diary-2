'use client';
import { useState } from 'react';
import { Eye, EyeOff, Leaf, LockKeyhole } from 'lucide-react';
import { readAuthResponse } from '@/lib/auth-response';

function PasswordInput({ name, label, current = false }: { name: string; label: string; current?: boolean }) {
  const [visible, setVisible] = useState(false);
  const id = 'change-' + name;
  return <div className="field"><label htmlFor={id}>{label}</label><div className="password-input"><input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={current ? 'current-password' : 'new-password'} required minLength={current ? 1 : 12} maxLength={128}/><button className="password-toggle" type="button" aria-label={label + (visible ? ' 숨기기' : ' 표시')} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></div>;
}

export default function ChangePassword({ email }: { email: string }) {
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || done) return;
    const form = e.currentTarget, values = new FormData(form);
    const currentPassword = String(values.get('current') ?? ''), newPassword = String(values.get('new') ?? '');
    if (newPassword !== values.get('confirm')) { setError('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    if (currentPassword === newPassword) { setError('현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }) });
      await readAuthResponse(response);
      form.reset(); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : '연결을 확인하고 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-intro"><a className="auth-brand" href="/diary"><Leaf size={27}/> 플랜두씨</a><p className="eyebrow">MY PRIVATE JOURNAL</p><h1>비밀번호를<br/>새롭게.</h1><p>비밀번호를 바꾸면 모든 기기의 로그인 상태가 종료됩니다.<br/>새 비밀번호로 다시 로그인해 주세요.</p><div className="auth-promise"><LockKeyhole size={20}/><span>변경 전 발급된 세션도 사용할 수 없게 됩니다.</span></div></section><section className="auth-card"><h2>비밀번호 변경</h2><p>{email}</p>{error && <div role="alert" className="message error">{error}</div>}{done ? <div role="status"><p>비밀번호를 변경했습니다. 모든 로그인 세션이 종료됐습니다.</p><a className="primary" href="/login">새 비밀번호로 로그인</a></div> : <form onSubmit={submit}><input name="username" value={email} autoComplete="username" readOnly hidden/><PasswordInput name="current" label="현재 비밀번호" current/><PasswordInput name="new" label="새 비밀번호 (12자 이상)"/><PasswordInput name="confirm" label="새 비밀번호 확인"/><button className="primary" disabled={busy}>{busy ? '변경 중…' : '비밀번호 변경하고 모든 기기 로그아웃'}</button><a href="/diary">다이어리로 돌아가기</a></form>}<p className="auth-footnote">비밀번호는 대화나 제출문에 적지 마세요.</p></section></main>;
}
