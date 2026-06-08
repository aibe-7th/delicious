import { initSupabase, getSupabase } from './supabase-client.js';
import {
  deleteAccount,
  fetchMyComments,
  fetchMyProfile,
  fetchMyReviews,
  getSession,
  resolveProviderLabel,
  signOut,
  updateNickname,
} from './api.js';
import { MSG } from './msg.js';
import { $, escapeHtml, formatDate, renderEmpty, showToast } from './ui.js';

let currentSession = null;

// 마이페이지를 시작한다
async function initMyPage() {
  initSupabase();
  await loadSession();

  // 로그인 전이면 로그인 페이지로 이동한다
  if (!currentSession) {
    window.location.href = './login.html';
    return;
  }

  bindEvents();
  await Promise.all([renderMyInfo(), loadMyReviews(), loadMyComments()]);
}

// 세션을 불러온다
async function loadSession() {
  // 연결 전이면 종료한다
  if (!getSupabase()) {
    return;
  }

  // 세션을 조회한다
  try {
    currentSession = await getSession();
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 계정 버튼을 연결한다
function bindEvents() {
  $('#nicknameForm').addEventListener('submit', handleNicknameSubmit);
  $('#logoutButton').addEventListener('click', handleLogout);
  $('#deleteAccountButton').addEventListener('click', handleDeleteAccount);
}

// 내 정보를 표시한다
async function renderMyInfo() {
  const { user } = currentSession;

  // 프로필 정보를 조회한다
  try {
    const profile = await fetchMyProfile(user.id);
    $('#nicknameInput').value = profile.nickname ?? '';
    $('#infoIdentifier').textContent = profile.email;
    $('#infoProvider').textContent = resolveProviderLabel(
      user.app_metadata?.provider,
    );
    $('#infoJoinedAt').textContent = formatDate(user.created_at);
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 내가 작성한 글을 불러온다
async function loadMyReviews() {
  const list = $('#myReviews');

  // 리뷰 목록을 조회한다
  try {
    const reviews = await fetchMyReviews(currentSession.user.id);

    // 글이 없으면 빈 상태를 표시한다
    if (!reviews.length) {
      renderEmpty(list, MSG.empty.myReviews);
      return;
    }

    list.innerHTML = reviews.map(renderReviewItem).join('');
  } catch (error) {
    renderEmpty(list, MSG.review.loadFail);
    showToast(error, 'danger');
  }
}

// 리뷰 항목을 렌더링한다
function renderReviewItem(review) {
  return `
    <div class="border rounded-3 bg-white p-3 mb-2">
      <div class="d-flex justify-content-between gap-2">
        <strong>${escapeHtml(review.title)}</strong>
        <a
          class="btn btn-outline-secondary btn-sm align-self-start"
          href="./write.html?id=${review.id}"
        >
          ${MSG.action.edit}
        </a>
      </div>
      <div class="metadata">${escapeHtml(review.restaurant_name)}</div>
      <div class="metadata">${formatDate(review.created_at)}</div>
    </div>
  `;
}

// 내가 작성한 댓글을 불러온다
async function loadMyComments() {
  const list = $('#myComments');

  // 댓글 목록을 조회한다
  try {
    const comments = await fetchMyComments(currentSession.user.id);

    // 댓글이 없으면 빈 상태를 표시한다
    if (!comments.length) {
      renderEmpty(list, MSG.empty.myComments);
      return;
    }

    list.innerHTML = comments.map(renderCommentItem).join('');
  } catch (error) {
    renderEmpty(list, MSG.review.loadFail);
    showToast(error, 'danger');
  }
}

// 댓글 항목을 렌더링한다
function renderCommentItem(comment) {
  const reviewTitle = comment.reviews?.title ?? '';

  return `
    <div class="border rounded-3 bg-white p-3 mb-2">
      <div>${escapeHtml(comment.content)}</div>
      <div class="metadata">${escapeHtml(reviewTitle)}</div>
      <div class="metadata">${formatDate(comment.created_at)}</div>
    </div>
  `;
}

// 닉네임 수정을 처리한다
async function handleNicknameSubmit(event) {
  event.preventDefault();
  const nickname = $('#nicknameInput').value.trim();

  // 닉네임이 비면 안내한다
  if (!nickname) {
    showToast(MSG.profile.nicknameRequired, 'warning');
    return;
  }

  // 닉네임을 저장한다
  try {
    await updateNickname(currentSession.user.id, nickname);
    showToast(MSG.profile.nicknameUpdated, 'success');
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 로그아웃을 처리한다
async function handleLogout() {
  // 로그아웃을 실행한다
  try {
    await signOut();
    window.location.href = './index.html';
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 회원 탈퇴를 처리한다
async function handleDeleteAccount() {
  // 탈퇴 여부를 확인한다
  if (!window.confirm(MSG.confirm.deleteAccount)) {
    return;
  }

  // 탈퇴를 실행한다
  try {
    await deleteAccount();
    showToast(MSG.auth.deleteAccountSuccess, 'success');
    window.location.href = './index.html';
  } catch (error) {
    showToast(error, 'danger');
  }
}

initMyPage();
