import { initSupabase, getSupabase } from './supabase-client.js';
import { fetchReview, getSession, resolveUserIdentity, saveReview } from './api.js';
import { hasKakaoMapConfig, hasMapConfig, hasNaverMapConfig } from './config.js';
import { MAP_PROVIDER, renderPreviewMap, searchPlaces } from './place-search.js';
import { MSG } from './msg.js';
import { $, escapeHtml, getFormValues, showToast } from './ui.js';

let currentSession = null;
let currentIdentity = null;
let editingReviewId = null;
let placeResults = [];
const WRITE_MAP_PROVIDER_KEY = 'delicious.writeMapProvider';
let defaultCenter = null;

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
  await initDefaultMap();
}

// 장소 검색 UI를 연결한다
function bindPlaceSearch() {
  const queryInput = $('#placeQuery');
  setupMapProviderControls();

  // 지도 설정이 없으면 검색을 비활성화한다
  if (!hasMapConfig()) {
    queryInput.disabled = true;
    $('#placeSearchBtn').disabled = true;
    $('#currentLocationBtn').disabled = true;
    $('#placeHint').textContent = MSG.place.notConfigured;
    return;
  }

  $('#placeSearchBtn').addEventListener('click', handlePlaceSearch);
  $('#currentLocationBtn').addEventListener('click', handleCurrentLocation);
  $('#placeResults').addEventListener('click', handlePlaceSelect);

  // 엔터 입력으로도 검색한다
  queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePlaceSearch();
    }
  });
}

// 지도 provider 선택 상태를 구성한다
function setupMapProviderControls() {
  const naverInput = $('#mapProviderNaver');
  const kakaoInput = $('#mapProviderKakao');

  naverInput.disabled = !hasNaverMapConfig();
  kakaoInput.disabled = !hasKakaoMapConfig();
  restoreMapProviderSelection();

  // 네이버 설정이 없고 카카오 설정이 있으면 카카오를 선택한다
  if (!isSelectedProviderEnabled() && !hasNaverMapConfig() && hasKakaoMapConfig()) {
    kakaoInput.checked = true;
  }

  // 저장된 provider가 비활성 상태면 기본값으로 보정한다
  if (!isSelectedProviderEnabled()) {
    naverInput.checked = hasNaverMapConfig();
    kakaoInput.checked = !hasNaverMapConfig() && hasKakaoMapConfig();
  }

  saveMapProviderSelection();

  // 설정된 provider가 없으면 선택 UI를 비활성화한다
  if (!hasMapConfig()) {
    naverInput.disabled = true;
    kakaoInput.disabled = true;
  }

  document.querySelectorAll('input[name="mapProvider"]').forEach((input) => {
    input.addEventListener('change', handleProviderChange);
  });
}

// 저장된 지도 provider 선택을 복원한다
function restoreMapProviderSelection() {
  const provider = sessionStorage.getItem(WRITE_MAP_PROVIDER_KEY);
  const input = provider
    ? document.querySelector(`input[name="mapProvider"][value="${provider}"]`)
    : null;

  // 저장값이 없으면 기존 선택을 유지한다
  if (!input) {
    return;
  }

  input.checked = true;
}

// 지도 provider 선택을 저장한다
function saveMapProviderSelection() {
  sessionStorage.setItem(WRITE_MAP_PROVIDER_KEY, getSelectedProvider());
}

// 현재 선택한 provider가 사용 가능한지 확인한다
function isSelectedProviderEnabled() {
  const provider = getSelectedProvider();

  // 네이버 설정 여부를 확인한다
  if (provider === MAP_PROVIDER.NAVER) {
    return hasNaverMapConfig();
  }

  // 카카오 설정 여부를 확인한다
  if (provider === MAP_PROVIDER.KAKAO) {
    return hasKakaoMapConfig();
  }

  return false;
}

// 현재 선택한 지도 provider를 반환한다
function getSelectedProvider() {
  return (
    document.querySelector('input[name="mapProvider"]:checked')?.value ||
    MAP_PROVIDER.NAVER
  );
}

// 지도 provider 변경을 처리한다 (좌표는 유지)
function handleProviderChange() {
  saveMapProviderSelection();

  // 검색 결과 목록은 provider별이라 비운다
  placeResults = [];
  $('#placeResults').innerHTML = '';
  $('#placeResults').classList.add('d-none');

  const place = getActivePlace();

  // 표시할 좌표가 없으면 지도를 비운다
  if (!place) {
    $('#placeMap').classList.add('d-none');
    return;
  }

  // 좌표를 새 provider 지도로 다시 표시한다
  showPreviewMap(place, getSelectedProvider());
}

// 현재 지도에 표시할 좌표를 구한다 (선택 좌표 우선, 없으면 기본 중심)
function getActivePlace() {
  const latitude = $('#latitude').value;
  const longitude = $('#longitude').value;

  // 선택한 좌표가 있으면 그 좌표를 쓴다
  if (latitude && longitude) {
    return { latitude: Number(latitude), longitude: Number(longitude) };
  }

  return defaultCenter;
}

// 페이지 로드 시 기본 지도를 띄운다
async function initDefaultMap() {
  // 지도 설정이 없으면 종료한다
  if (!hasMapConfig()) {
    return;
  }

  const place = getActivePlace();

  // 수정 중이라 좌표가 있으면 그 위치를 표시한다
  if (place) {
    defaultCenter = place;
    await showPreviewMap(place, getSelectedProvider());
    return;
  }

  // 신규 작성이면 현재 위치를 기본 지도로 띄운다 (표시용)
  try {
    defaultCenter = await getCurrentPosition();
    await showPreviewMap(defaultCenter, getSelectedProvider());
  } catch (error) {
    // 권한 거부 등으로 못 띄우면 상태를 안내한다
    $('#placeMap').classList.add('d-none');
    $('#placeHint').textContent = MSG.place.geolocationDenied;
  }
}

// 현재 위치 버튼을 처리한다 (좌표로 입력)
async function handleCurrentLocation() {
  // 권한이 차단된 상태면 재요청이 불가하므로 안내한다
  if ((await getGeolocationPermission()) === 'denied') {
    showToast(MSG.place.geolocationBlocked, 'warning');
    $('#placeHint').textContent = MSG.place.geolocationBlocked;
    return;
  }

  // 현재 위치를 받아 좌표로 채운다 (prompt 상태면 권한 요청이 다시 뜸)
  try {
    const place = await getCurrentPosition();
    defaultCenter = place;
    $('#latitude').value = place.latitude;
    $('#longitude').value = place.longitude;
    $('#placeResults').classList.add('d-none');
    $('#placeHint').textContent = MSG.place.currentLocationSet;
    showToast(MSG.place.currentLocationSet, 'success');
    await showPreviewMap(place, getSelectedProvider());
  } catch (error) {
    showToast(error, 'danger');
  }
}

// 위치 권한 상태를 조회한다 (조회 불가면 빈 문자열)
async function getGeolocationPermission() {
  // Permissions API 미지원이면 알 수 없음으로 둔다
  if (!navigator.permissions?.query) {
    return '';
  }

  // 권한 상태 조회 실패는 무시한다
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    return '';
  }
}

// 현재 위치 좌표를 가져온다
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    // 브라우저가 지원하지 않으면 실패로 처리한다
    if (!navigator.geolocation) {
      reject(new Error(MSG.place.geolocationFail));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error(MSG.place.geolocationFail)),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

// 선택한 provider로 장소를 검색한다
async function handlePlaceSearch() {
  const query = $('#placeQuery').value.trim();
  const provider = getSelectedProvider();

  // 검색어가 없으면 안내한다
  if (!query) {
    showToast(MSG.place.queryRequired, 'warning');
    return;
  }

  // 검색을 요청한다
  try {
    placeResults = await searchPlaces(query, provider);
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
    renderEmptyResult();
    return;
  }

  list.innerHTML = placeResults
    .map((place, index) => placeItemMarkup(place, index))
    .join('');
  list.classList.remove('d-none');
  $('#placeHint').textContent = '';
}

// 결과 없음 안내와 카카오 전환 유도를 표시한다
function renderEmptyResult() {
  const hint = $('#placeHint');
  const canSuggestKakao =
    getSelectedProvider() === MAP_PROVIDER.NAVER && hasKakaoMapConfig();

  // 네이버에서 못 찾았고 카카오를 쓸 수 있으면 전환을 권한다
  if (canSuggestKakao) {
    const link = `<a href="#" id="switchKakaoBtn" class="alert-link">${escapeHtml(MSG.place.kakaoLink)}</a>`;
    const question = MSG.place.searchKakao.replace('{link}', link);

    hint.innerHTML = `${escapeHtml(MSG.place.emptyNaver)} ${question}`;
    $('#switchKakaoBtn').addEventListener('click', searchWithKakao);
    return;
  }

  hint.textContent = MSG.place.empty;
}

// 카카오 지도로 전환해 같은 검색어로 다시 검색한다
async function searchWithKakao(event) {
  event.preventDefault();
  $('#mapProviderKakao').checked = true;
  saveMapProviderSelection();
  await handlePlaceSearch();
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
  await showPreviewMap(place, place.provider);
}

// 선택한 위치의 미니 지도를 보여준다
async function showPreviewMap(place, provider) {
  const mapBox = $('#placeMap');

  // 지도 렌더링 실패는 무시한다
  try {
    mapBox.classList.remove('d-none');
    await renderPreviewMap(mapBox, place, provider);
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

  // 좌표는 장소 검색으로만 채우므로 선택 여부를 확인한다
  if (!values.latitude || !values.longitude) {
    showToast(MSG.place.locationRequired, 'warning');
    return;
  }

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
