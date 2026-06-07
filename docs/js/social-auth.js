import { signInWithProvider } from './api.js';
import { showToast } from './ui.js';

// 소셜 로그인 버튼을 연결한다
export function bindSocialButtons() {
  document.querySelectorAll('[data-provider]').forEach((button) => {
    button.addEventListener('click', handleSocialClick);
  });
}

// 소셜 로그인 클릭을 처리한다
async function handleSocialClick(event) {
  const { provider } = event.currentTarget.dataset;
  const redirectTo = new URL('./index.html', window.location.href).href;

  // Supabase OAuth를 시작한다
  try {
    await signInWithProvider(provider, redirectTo);
  } catch (error) {
    showToast(error, 'danger');
  }
}
