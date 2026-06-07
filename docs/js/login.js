import { initSupabase } from './supabase-client.js';
import { signIn } from './api.js';
import { handleAuthRedirect, hasAuthRedirectHash } from './auth-redirect.js';
import { MSG } from './msg.js';
import { $, getFormValues, showToast } from './ui.js';

// 로그인 페이지를 시작한다
async function initLoginPage() {
  initSupabase();
  if (hasAuthRedirectHash()) {
    await handleAuthRedirect();
    return;
  }
  showVerifiedMessage();
  $('#loginForm').addEventListener('submit', handleLoginSubmit);
}

// 이메일 인증 완료 안내를 표시한다
function showVerifiedMessage() {
  const params = new URLSearchParams(window.location.search);

  // 인증 완료 진입이 아니면 종료한다
  if (params.get('verified') !== '1') {
    return;
  }

  showToast(MSG.auth.emailVerified, 'success');
  window.history.replaceState({}, '', './login.html');
}

// 로그인 제출을 처리한다
async function handleLoginSubmit(event) {
  event.preventDefault();

  const { email, password } = getFormValues(event.currentTarget);

  // 로그인을 실행한다
  try {
    await signIn(email, password);
    window.location.href = './index.html';
  } catch (error) {
    showToast(error, 'danger');
  }
}

initLoginPage();
