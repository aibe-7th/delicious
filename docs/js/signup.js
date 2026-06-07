import { initSupabase } from './supabase-client.js';
import { signUp } from './api.js';
import { MSG } from './msg.js';
import { $, getFormValues, showToast } from './ui.js';

// 회원가입 페이지를 시작한다
function initSignupPage() {
  initSupabase();
  $('#signupForm').addEventListener('submit', handleSignupSubmit);
}

// 회원가입 제출을 처리한다
async function handleSignupSubmit(event) {
  event.preventDefault();

  const { email, password } = getFormValues(event.currentTarget);
  const emailRedirectTo = new URL('./login.html?verified=1', window.location.href)
    .href;

  // 가입을 실행한다
  try {
    await signUp(email, password, emailRedirectTo);
    renderVerifyNotice(event.currentTarget);
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 인증 안내를 표시한다
function renderVerifyNotice(form) {
  form.classList.add('d-none');
  $('#verifyTitle').textContent = MSG.auth.verifyTitle;
  $('#verifyDescription').textContent = MSG.auth.verifyDescription;
  $('#verifyLoginLink').textContent = MSG.auth.loginAction;
  $('#verifyNotice').classList.remove('d-none');
}

initSignupPage();
