import { initSupabase, getSupabase } from './supabase-client.js';
import {
  deleteComment,
  deleteReview,
  fetchReviews,
  getSession,
  resolveUserIdentity,
  saveComment,
  signOut,
} from './api.js';
import { handleAuthRedirect } from './auth-redirect.js';
import { hasMapConfig } from './config.js';
import { isWithinKorea, renderMap } from './place-search.js';
import { MSG } from './msg.js';
import { $, escapeHtml, formatDate, getFormValues, renderEmpty, showToast } from './ui.js';

let currentSession = null;
let currentIdentity = null;
let reviews = [];

// 목록 페이지를 시작한다
async function initFeedPage() {
  initSupabase();
  if (await handleAuthRedirect()) {
    return;
  }
  bindFeedEvents();
  await refreshSession();
  await loadReviews();
}

// 목록 이벤트를 연결한다
function bindFeedEvents() {
  $('#refreshButton').addEventListener('click', loadReviews);
  document.querySelectorAll('[data-logout-button]').forEach((button) => {
    button.addEventListener('click', handleLogoutClick);
  });
  $('#reviewsList').addEventListener('click', handleReviewClick);
  $('#reviewsList').addEventListener('submit', handleCommentSubmit);
}

// 로그아웃을 처리한다
async function handleLogoutClick() {
  // 연결 전이면 종료한다
  if (!getSupabase()) {
    console.warn('Supabase client is not configured.');
    return;
  }

  // 로그아웃을 실행한다
  try {
    await signOut();
    currentSession = null;
    renderSession();
    showToast(MSG.auth.logoutSuccess, 'success');
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 리뷰 클릭을 처리한다
async function handleReviewClick(event) {
  const button = event.target.closest('button[data-action]');

  // 버튼이 아니면 종료한다
  if (!button) {
    return;
  }

  const { action, reviewId, commentId } = button.dataset;

  // 리뷰 삭제를 처리한다
  if (action === 'delete-review') {
    await removeReview(reviewId);
  }

  // 댓글 삭제를 처리한다
  if (action === 'delete-comment') {
    await removeComment(commentId);
  }
}

// 댓글 제출을 처리한다
async function handleCommentSubmit(event) {
  event.preventDefault();

  // 댓글 폼이 아니면 종료한다
  if (!event.target.matches('.comment-form')) {
    return;
  }

  // 로그인 여부를 확인한다
  if (!currentSession) {
    showToast(MSG.auth.loginRequiredForComment, 'warning');
    return;
  }

  const { reviewId, content } = getFormValues(event.target);

  // 댓글을 저장한다
  try {
    await saveComment({
      review_id: reviewId,
      user_id: currentSession.user.id,
      content,
    });
    event.target.reset();
    await loadReviews();
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 세션을 갱신한다
async function refreshSession() {
  // 연결 전이면 안내한다
  if (!getSupabase()) {
    currentSession = null;
    currentIdentity = null;
    renderSession();
    return;
  }

  // 세션을 조회한다
  try {
    currentSession = await getSession();
    currentIdentity = currentSession
      ? await resolveUserIdentity(currentSession.user)
      : null;
  } catch (error) {
    showToast(error, 'danger');
  }

  renderSession();
}

// 세션 상태를 표시한다
function renderSession() {
  const sessionText = $('#sessionText');
  const authLinks = document.querySelectorAll('[data-auth-link]');
  const sessionLinks = document.querySelectorAll('[data-session-link]');
  const writeLinks = document.querySelectorAll('[data-write-link]');

  // 로그인 상태를 표시한다
  if (currentSession) {
    sessionText.textContent = currentIdentity
      ? `${currentIdentity.label} · ${currentIdentity.provider}`
      : '';
    sessionText.classList.remove('d-none');
    authLinks.forEach((link) => {
      link.classList.add('d-none');
    });
    sessionLinks.forEach((element) => {
      element.classList.remove('d-none');
    });
    writeLinks.forEach((link) => {
      link.href = './write.html';
    });
    return;
  }

  sessionText.textContent = '';
  sessionText.classList.add('d-none');
  authLinks.forEach((link) => {
    link.classList.remove('d-none');
  });
  sessionLinks.forEach((element) => {
    element.classList.add('d-none');
  });
  writeLinks.forEach((link) => {
    link.href = './login.html';
  });
}

// 리뷰를 불러온다
async function loadReviews() {
  const list = $('#reviewsList');

  // 연결 전이면 빈 상태를 표시한다
  if (!getSupabase()) {
    console.warn('Supabase client is not configured.');
    renderEmpty(list, MSG.empty.reviews);
    return;
  }

  // 리뷰 목록을 조회한다
  try {
    reviews = await fetchReviews();
    renderReviews();
  } catch (error) {
    renderEmpty(list, MSG.review.loadFail);
    showToast(error, 'danger');
  }
}

// 리뷰 목록을 렌더링한다
function renderReviews() {
  const list = $('#reviewsList');

  // 리뷰가 없으면 빈 상태를 표시한다
  if (!reviews.length) {
    renderEmpty(list, MSG.empty.reviews);
    return;
  }

  list.innerHTML = reviews.map(renderReviewCard).join('');
  renderReviewMaps();
}

// 리뷰 카드에 위치 지도를 그린다
function renderReviewMaps() {
  // 지도 설정이 없으면 종료한다
  if (!hasMapConfig()) {
    return;
  }

  reviews.forEach((review) => {
    const latitude = Number(review.latitude);
    const longitude = Number(review.longitude);

    // 한국 범위 밖이면 건너뛴다
    if (!isWithinKorea(latitude, longitude)) {
      return;
    }

    const container = $(`#map-${review.id}`);

    // 컨테이너가 없으면 건너뛴다
    if (!container) {
      return;
    }

    // 지도 렌더링 실패는 무시한다
    renderMap(container, {
      latitude,
      longitude,
      name: review.restaurant_name,
    }).catch(() => {
      container.classList.add('d-none');
    });
  });
}

// 리뷰 카드를 렌더링한다
function renderReviewCard(review) {
  const comments = review.comments ?? [];
  const isOwner = currentSession?.user.id === review.user_id;
  const authorName =
    review.profiles?.nickname || review.profiles?.email || '알 수 없는 사용자';

  return `
    <article class="review-card">
      <div class="d-flex justify-content-between gap-3">
        <div>
          <h3>${escapeHtml(review.title)}</h3>
          <div class="review-author">${escapeHtml(authorName)}</div>
          <div class="metadata">${formatDate(review.created_at)}</div>
        </div>
        <div class="btn-group align-self-start ${isOwner ? '' : 'd-none'}">
          <a
            class="btn btn-outline-secondary btn-sm"
            href="./write.html?id=${review.id}"
          >
            ${MSG.action.edit}
          </a>
          <button
            class="btn btn-outline-danger btn-sm"
            data-action="delete-review"
            data-review-id="${review.id}"
          >
            ${MSG.action.delete}
          </button>
        </div>
      </div>
      <p class="review-content mt-3">${escapeHtml(review.content)}</p>
      ${renderMapSection(review)}
      <div class="border-top pt-3 mt-3">
        <div class="comment-list vstack gap-2 mb-3">
          ${comments.map(renderComment).join('') || `<div class="metadata">${MSG.comment.empty}</div>`}
        </div>
        ${renderCommentControl(review.id)}
      </div>
    </article>
  `;
}

// 리뷰 위치 지도 또는 경고를 렌더링한다
function renderMapSection(review) {
  const latitude = Number(review.latitude);
  const longitude = Number(review.longitude);

  // 한국 범위를 벗어나면 경고를 표시한다
  if (!isWithinKorea(latitude, longitude)) {
    return `
      <div class="alert alert-warning mt-3 mb-0" role="alert">
        ${MSG.place.outOfKorea}
      </div>
    `;
  }

  // 지도 설정이 없으면 지도를 생략한다
  if (!hasMapConfig()) {
    return '';
  }

  return `<div class="review-map border rounded-3 mt-3" id="map-${review.id}"></div>`;
}

// 댓글 입력 영역을 렌더링한다
function renderCommentControl(reviewId) {
  // 로그인 전이면 로그인 안내를 표시한다
  if (!currentSession) {
    return `
      <div class="comment-login">
        <span>${MSG.auth.loginRequiredCommentCta}</span>
        <a class="btn btn-outline-success btn-sm" href="./login.html">
          ${MSG.auth.loginAction}
        </a>
      </div>
    `;
  }

  return `
    <form class="comment-form d-flex gap-2">
      <input type="hidden" name="reviewId" value="${reviewId}" />
      <input
        class="form-control form-control-sm"
        name="content"
        placeholder="${MSG.comment.placeholder}"
        required
      />
      <button class="btn btn-outline-success btn-sm">${MSG.action.register}</button>
    </form>
  `;
}

// 댓글을 렌더링한다
function renderComment(comment) {
  const isOwner = currentSession?.user.id === comment.user_id;
  const authorName =
    comment.profiles?.nickname || comment.profiles?.email || '알 수 없는 사용자';

  return `
    <div class="comment-box d-flex justify-content-between gap-2">
      <div>
        <div class="comment-author">${escapeHtml(authorName)}</div>
        <div>${escapeHtml(comment.content)}</div>
        <div class="metadata">${formatDate(comment.created_at)}</div>
      </div>
      <button
        class="btn btn-outline-danger btn-sm ${isOwner ? '' : 'd-none'}"
        data-action="delete-comment"
        data-comment-id="${comment.id}"
      >
        ${MSG.action.delete}
      </button>
    </div>
  `;
}

// 리뷰를 삭제한다
async function removeReview(reviewId) {
  // 삭제 여부를 확인한다
  if (!window.confirm(MSG.confirm.deleteReview)) {
    return;
  }

  // 삭제를 실행한다
  try {
    await deleteReview(reviewId);
    await loadReviews();
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 댓글을 삭제한다
async function removeComment(commentId) {
  // 삭제를 실행한다
  try {
    await deleteComment(commentId);
    await loadReviews();
  } catch (error) {
    showToast(error, 'danger');
  }
}

initFeedPage();
