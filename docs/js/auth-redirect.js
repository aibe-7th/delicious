import { getSupabase } from './supabase-client.js';

// 인증 콜백 해시 여부를 확인한다
export function hasAuthRedirectHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));

  return Boolean(params.get('access_token') && params.get('type'));
}

// 이메일 인증 콜백을 로그인 화면으로 보낸다
export async function handleAuthRedirect() {
  const supabase = getSupabase();

  // 인증 콜백이 아니면 종료한다
  if (!supabase || !hasAuthRedirectHash()) {
    return false;
  }

  // Supabase가 해시 세션을 저장하도록 기다린다
  await supabase.auth.getSession();

  window.history.replaceState({}, '', window.location.pathname);
  window.location.replace('./login.html?verified=1');
  return true;
}
