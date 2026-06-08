import { initSupabase, getSupabase } from './supabase-client.js';
import { fetchReview, getSession, resolveUserIdentity, saveReview } from './api.js';
import { hasMapConfig } from './config.js';
import { renderPreviewMap, searchPlaces } from './place-search.js';
import { MSG } from './msg.js';
import { $, escapeHtml, getFormValues, showToast } from './ui.js';

let currentSession = null;
let currentIdentity = null;
let editingReviewId = null;
let placeResults = [];

// 작성 페이지를 시작한다
async function initWritePage() {
  initSupabase();
  $('#reviewForm').addEventListener('submit', handleReviewSubmit);
  bindPlaceSearch();
  await refreshSession();

  // 로그인 전이면 로그인 페이지로 이동한다
  if (!currentSession) {
    window.location.href = './login.html';
    return;
  }

  await loadEditingReview();
}

// 장소 검색 UI를 연결한다
function bindPlaceSearch() {
  const queryInput = $('#placeQuery');

  // 지도 설정이 없으면 검색을 비활성화한다
  if (!hasMapConfig()) {
    queryInput.disabled = true;
    $('#placeSearchBtn').disabled = true;
    $('#placeHint').textContent = MSG.place.notConfigured;
    return;
  }

  $('#placeSearchBtn').addEventListener('click', handlePlaceSearch);
  $('#placeResults').addEventListener('click', handlePlaceSelect);

  // 엔터 입력으로도 검색한다
  queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePlaceSearch();
    }
  });
}

// 주소로 장소를 검색한다 (geocoder라 상호명 검색은 불가)
async function handlePlaceSearch() {
  const query = $('#placeQuery').value.trim();

  // 검색어가 없으면 안내한다
  if (!query) {
    showToast(MSG.place.queryRequired, 'warning');
    return;
  }

  // 검색을 요청한다
  try {
    placeResults = await searchPlaces(query);
    renderPlaceResults();
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 검색 결과를 프리뷰로 표시한다
function renderPlaceResults() {
  const list = $('#placeResults');

  // 결과가 없으면 안내한다
  if (!placeResults.length) {
    list.classList.add('d-none');
    $('#placeHint').textContent = MSG.place.empty;
    return;
  }

  list.innerHTML = placeResults
    .map((place, index) => placeItemMarkup(place, index))
    .join('');
  list.classList.remove('d-none');
  $('#placeHint').textContent = '';
}

// 검색 결과 한 건의 마크업을 만든다
function placeItemMarkup(place, index) {
  const address = place.roadAddress || place.jibunAddress;

  return `
    <button type="button" class="list-group-item list-group-item-action" data-index="${index}">
      <span class="fw-semibold d-block">${escapeHtml(place.name)}</span>
      <small class="text-secondary">${escapeHtml(address)}</small>
    </button>
  `;
}

// 검색 결과를 선택해 폼에 채운다
async function handlePlaceSelect(event) {
  const button = event.target.closest('[data-index]');

  // 항목 외 영역이면 종료한다
  if (!button) {
    return;
  }

  const place = placeResults[Number(button.dataset.index)];
  $('#latitude').value = place.latitude;
  $('#longitude').value = place.longitude;

  // 상호명이 비어 있고 건물명이 있으면 채운다
  if (place.buildingName && !$('#restaurantName').value.trim()) {
    $('#restaurantName').value = place.buildingName;
  }

  $('#placeResults').classList.add('d-none');
  $('#placeHint').textContent = place.roadAddress || place.jibunAddress;
  showToast(MSG.place.selected, 'success');
  await showPreviewMap(place);
}

// 선택한 위치의 미니 지도를 보여준다
async function showPreviewMap(place) {
  const mapBox = $('#placeMap');

  // 지도 렌더링 실패는 무시한다
  try {
    mapBox.classList.remove('d-none');
    await renderPreviewMap(mapBox, place);
  } catch (error) {
    mapBox.classList.add('d-none');
  }
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
