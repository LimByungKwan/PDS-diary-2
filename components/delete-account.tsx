'use client';
import { useState } from 'react';
import { Leaf, Trash2 } from 'lucide-react';
import { readAuthResponse } from '@/lib/auth-response';

export default function DeleteAccount({ email }: { email: string }) {
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState(''), [confirmation, setConfirmation] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || done || confirmation !== '계정 삭제') return;
    const form = e.currentTarget, data = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ password: String(data.get('password') ?? ''), confirmation }) });
      await readAuthResponse(response); form.reset(); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : '연결을 확인하고 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-intro"><a className="auth-brand" href="/diary"><Leaf size={27}/> 플랜두씨</a><p className="eyebrow">MY PRIVATE JOURNAL</p><h1>계정과 자료<br/>삭제하기.</h1><p>계정을 삭제하면 이 계정의 계획·수정 이력·할 일·실행 기록·돌아보기·5일 관찰과 이전 이력이 함께 영구 삭제됩니다. 모든 기기에서 로그아웃되며 복구할 수 없습니다.</p><p>필요한 자료는 먼저 다이어리의 ‘전체 자료 내보내기’로 보관하세요. 이미 내려받은 파일과 별도로 공개한 과제 6 자료는 삭제되지 않습니다.</p><a href="/diary">다이어리로 돌아가기</a></section><section className="auth-card"><h2><Trash2 size={22}/> 계정 삭제</h2><p>{email}</p>{error && <div role="alert" className="message error">{error}</div>}{done ? <div role="status"><p>계정과 연결 자료를 삭제했습니다. 모든 로그인 세션이 종료됐습니다.</p><a className="primary" href="/login">로그인 화면으로</a></div> : <form onSubmit={submit}><input name="username" value={email} autoComplete="username" readOnly hidden/><label className="field"><span>현재 비밀번호</span><input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label><label className="field"><span>확인 문구: 계정 삭제</span><input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" required/></label><p>위에 표시된 계정과 자료를 영구 삭제합니다.</p><button className="primary" style={{ background: '#a33732' }} disabled={busy || confirmation !== '계정 삭제'}>{busy ? '삭제 중…' : '내 계정과 자료 영구 삭제'}</button><a href="/diary">취소하고 돌아가기</a></form>}</section></main>;
}
