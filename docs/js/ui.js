import { getMessage } from './msg.js';

// DOM 요소를 찾는다
export function $(selector) {
  return document.querySelector(selector);
}

// 폼 값을 객체로 변환한다
export function getFormValues(form) {
  const formData = new FormData(form);

  return Object.fromEntries(formData.entries());
}

// 날짜를 화면용으로 변환한다
export function formatDate(value) {
  // 날짜가 없으면 빈 값을 반환한다
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}. ${month}. ${day}. ${hour}:${minute}`;
}

// HTML 특수문자를 이스케이프한다
export function escapeHtml(value) {
  const div = document.createElement('div');

  div.textContent = value ?? '';
  return div.innerHTML;
}

// 토스트 메시지를 표시한다
export function showToast(message, variant = 'dark') {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  const safeMessage = escapeHtml(getMessage(message));

  toast.className = `toast align-items-center text-bg-${variant} border-0 show`;
  toast.role = 'alert';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${safeMessage}</div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        aria-label="닫기"
      ></button>
    </div>
  `;

  container.append(toast);
  toast.querySelector('button').addEventListener('click', () => toast.remove());
  window.setTimeout(() => toast.remove(), 3000);
}

// 빈 목록을 렌더링한다
export function renderEmpty(target, message) {
  const safeMessage = escapeHtml(message);

  target.innerHTML = `
    <div class="border rounded-3 bg-white p-4 text-center text-secondary">
      ${safeMessage}
    </div>
  `;
}
