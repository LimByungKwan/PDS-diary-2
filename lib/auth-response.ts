/** Reject proxy/login HTML instead of treating a 200 page as authentication success. */
export async function readAuthResponse(response: Response): Promise<void> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error(`인증 서버에서 예상과 다른 응답을 받았습니다(HTTP ${response.status}). 페이지를 새로고침한 뒤 다시 시도해 주세요. 가입 버튼을 이미 눌렀다면 로그인 탭에서도 확인해 주세요.`);
  }
  let data: { ok?: boolean; error?: string };
  try { data = await response.json(); }
  catch { throw new Error('서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  if (!response.ok) throw new Error(data?.error || '요청을 처리하지 못했습니다.');
  if (data?.ok !== true) throw new Error('인증 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
