import { initSupabase, getSupabase } from './supabase-client.js';
import { fetchReview, getSession, resolveUserIdentity, saveReview } from './api.js';
import { MSG } from './msg.js';
import { $, getFormValues, showToast } from './ui.js';

let currentSession = null;
let currentIdentity = null;
let editingReviewId = null;

// 작성 페이지를 시작한다
async function initWritePage() {
  initSupabase();
  $('#reviewForm').addEventListener('submit', handleReviewSubmit);
  await refreshSession();

  // 로그인 전이면 로그인 페이지로 이동한다
  if (!currentSession) {
    window.location.href = './login.html';
    return;
  }

  await loadEditingReview();
}

// 세션을 갱신한다
async function refreshSession() {
  // 연결 전이면 안내한다
  if (!getSupabase()) {
    console.warn('Supabase client is not configured.');
    return;
  }

  // 세션을 조회한다
  try {
    currentSession = await getSession();
    currentIdentity = currentSession
      ? await resolveUserIdentity(currentSession.user)
      : null;
    renderSession();
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 세션 상태를 표시한다
function renderSession() {
  const sessionText = $('#sessionText');

  // 로그인 상태만 표시한다
  if (currentSession) {
    sessionText.textContent = currentIdentity
      ? `${currentIdentity.label} · ${currentIdentity.provider}`
      : '';
    sessionText.classList.remove('d-none');
    return;
  }

  sessionText.textContent = '';
  sessionText.classList.add('d-none');
}

// 수정할 리뷰를 불러온다
async function loadEditingReview() {
  const params = new URLSearchParams(window.location.search);
  editingReviewId = params.get('id');

  // 신규 작성이면 종료한다
  if (!editingReviewId) {
    return;
  }

  // 리뷰를 조회한다
  try {
    const review = await fetchReview(editingReviewId);
    fillReviewForm(review);
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 리뷰 제출을 처리한다
async function handleReviewSubmit(event) {
  event.preventDefault();

  // 로그인 여부를 확인한다
  if (!currentSession) {
    showToast(MSG.auth.loginRequiredForReview, 'warning');
    return;
  }

  const values = getFormValues(event.currentTarget);
  const payload = {
    id: values.reviewId || undefined,
    user_id: currentSession.user.id,
    title: values.title,
    content: values.content,
    restaurant_name: values.restaurantName,
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
  };

  // 리뷰를 저장한다
  try {
    await saveReview(payload);
    window.location.href = './index.html';
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 리뷰 폼에 값을 채운다
function fillReviewForm(review) {
  $('#formTitle').textContent = MSG.form.editReviewTitle;
  $('#reviewId').value = review.id;
  $('#title').value = review.title;
  $('#restaurantName').value = review.restaurant_name;
  $('#latitude').value = review.latitude;
  $('#longitude').value = review.longitude;
  $('#content').value = review.content;
}

initWritePage();
