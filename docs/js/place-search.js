// 장소 검색 provider (네이버 Geocoding, 카카오 키워드)
// 네이버는 주소 검색, 카카오는 상호·주소 키워드 검색에 사용한다.
import {
  KAKAO_MAP_JS_KEY,
  NAVER_MAP_CLIENT_ID,
  hasKakaoMapConfig,
  hasNaverMapConfig,
} from './config.js';
import { MSG } from './msg.js';
import { escapeHtml } from './ui.js';

export const MAP_PROVIDER = {
  NAVER: 'naver',
  KAKAO: 'kakao',
};

// 지도 SDK 로딩 상태를 provider별로 보관한다
let naverSdkPromise = null;
let kakaoSdkPromise = null;

// 미리보기 지도와 마커를 보관한다
let previewState = {
  provider: '',
  map: null,
  marker: null,
};

// 네이버 지도 SDK를 지연 로딩한다
function loadNaverSdk() {
  // 이미 로딩 중이면 재사용한다
  if (naverSdkPromise) {
    return naverSdkPromise;
  }

  // 설정이 없으면 중단한다
  if (!hasNaverMapConfig()) {
    return Promise.reject(new Error(MSG.place.notConfigured));
  }

  naverSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({
      ncpKeyId: NAVER_MAP_CLIENT_ID,
      submodules: 'geocoder',
    });

    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${params}`;
    // 동적 주입 시 geocoder 서브모듈은 onload 이후에도 늦게 준비된다
    script.onload = () => waitForGeocoder(resolve, reject);
    script.onerror = () => reject(new Error(MSG.place.sdkFail));
    document.head.append(script);
  });

  return naverSdkPromise;
}

// 카카오 지도 SDK를 지연 로딩한다
function loadKakaoSdk() {
  // 이미 로딩 중이면 재사용한다
  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  // 설정이 없으면 중단한다
  if (!hasKakaoMapConfig()) {
    return Promise.reject(new Error(MSG.place.notConfigured));
  }

  kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({
      appkey: KAKAO_MAP_JS_KEY,
      autoload: 'false',
      libraries: 'services',
    });

    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?${params}`;
    // services 라이브러리까지 준비된 뒤 반환한다
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new Error(MSG.place.sdkFail));
    document.head.append(script);
  });

  return kakaoSdkPromise;
}

// geocoder 서브모듈이 준비될 때까지 기다린다
function waitForGeocoder(resolve, reject, attempts = 0) {
  // 준비되면 SDK를 반환한다
  if (window.naver?.maps?.Service?.geocode) {
    resolve(window.naver);
    return;
  }

  // 5초가 지나면 실패로 처리한다
  if (attempts >= 50) {
    reject(new Error(MSG.place.sdkFail));
    return;
  }

  window.setTimeout(() => waitForGeocoder(resolve, reject, attempts + 1), 100);
}

// 선택한 provider로 장소를 검색한다
export async function searchPlaces(query, provider) {
  // provider별 검색 함수를 호출한다
  if (provider === MAP_PROVIDER.KAKAO) {
    return searchKakaoPlaces(query);
  }

  return searchNaverPlaces(query);
}

// 네이버 주소 검색을 실행한다
async function searchNaverPlaces(query) {
  const naver = await loadNaverSdk();

  return new Promise((resolve, reject) => {
    naver.maps.Service.geocode({ query }, (status, response) => {
      // 검색 실패를 전달한다
      if (status !== naver.maps.Service.Status.OK) {
        reject(new Error(MSG.place.searchFail));
        return;
      }

      const addresses = response.v2?.addresses ?? [];
      resolve(addresses.map(normalizeNaverPlace));
    });
  });
}

// 카카오 키워드 검색을 실행한다
async function searchKakaoPlaces(query) {
  const kakao = await loadKakaoSdk();
  const places = new kakao.maps.services.Places();

  return new Promise((resolve, reject) => {
    places.keywordSearch(query, (results, status) => {
      // 결과가 없으면 빈 배열을 반환한다
      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        searchKakaoAddress(kakao, query).then(resolve).catch(reject);
        return;
      }

      // 검색 실패를 전달한다
      if (status !== kakao.maps.services.Status.OK) {
        reject(new Error(MSG.place.searchFail));
        return;
      }

      resolve(results.map(normalizeKakaoPlace));
    });
  });
}

// 카카오 주소 검색을 실행한다
async function searchKakaoAddress(kakao, query) {
  const geocoder = new kakao.maps.services.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.addressSearch(query, (results, status) => {
      // 결과가 없으면 빈 배열을 반환한다
      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        resolve([]);
        return;
      }

      // 검색 실패를 전달한다
      if (status !== kakao.maps.services.Status.OK) {
        reject(new Error(MSG.place.searchFail));
        return;
      }

      resolve(results.map(normalizeKakaoAddress));
    });
  });
}

// 선택한 위치를 미니 지도로 미리 본다
export async function renderPreviewMap(container, place, provider) {
  // 선택한 provider의 지도를 렌더링한다
  if (provider === MAP_PROVIDER.KAKAO) {
    return renderKakaoPreviewMap(container, place);
  }

  return renderNaverPreviewMap(container, place);
}

// 네이버 미리보기 지도를 표시한다
async function renderNaverPreviewMap(container, place) {
  const naver = await loadNaverSdk();
  const position = new naver.maps.LatLng(place.latitude, place.longitude);

  // provider가 바뀌면 컨테이너를 비운다
  resetPreviewMap(container, MAP_PROVIDER.NAVER);

  // 지도를 처음 한 번만 생성한다
  if (!previewState.map) {
    previewState.map = new naver.maps.Map(container, {
      center: position,
      zoom: 16,
      draggable: false,
      scrollWheel: false,
      pinchZoom: false,
      disableDoubleClickZoom: true,
      disableDoubleTapZoom: true,
      disableKineticPan: true,
    });
    previewState.marker = new naver.maps.Marker({
      position,
      map: previewState.map,
    });
    return;
  }

  // 기존 지도의 중심과 마커를 옮긴다
  previewState.map.setCenter(position);
  previewState.marker.setPosition(position);
}

// 카카오 미리보기 지도를 표시한다
async function renderKakaoPreviewMap(container, place) {
  const kakao = await loadKakaoSdk();
  const position = new kakao.maps.LatLng(place.latitude, place.longitude);

  // provider가 바뀌면 컨테이너를 비운다
  resetPreviewMap(container, MAP_PROVIDER.KAKAO);

  // 지도를 처음 한 번만 생성한다
  if (!previewState.map) {
    previewState.map = new kakao.maps.Map(container, {
      center: position,
      level: 5,
    });
    // 카카오는 생성 후 메서드로 조작을 막는다
    previewState.map.setDraggable(false);
    previewState.map.setZoomable(false);
    previewState.marker = new kakao.maps.Marker({
      position,
      map: previewState.map,
    });
    return;
  }

  // 기존 지도의 중심과 마커를 옮긴다
  previewState.map.setCenter(position);
  previewState.marker.setPosition(position);
}

// provider 변경 시 미리보기 상태를 초기화한다
function resetPreviewMap(container, provider) {
  // 같은 provider면 유지한다
  if (previewState.provider === provider) {
    return;
  }

  container.innerHTML = '';
  previewState = {
    provider,
    map: null,
    marker: null,
  };
}

// 좌표 위치를 지도에 표시한다 (목록용, 매번 새 지도를 만든다)
export async function renderMap(container, place, provider = getDefaultProvider()) {
  // 선택한 provider의 지도를 렌더링한다
  if (provider === MAP_PROVIDER.KAKAO) {
    return renderKakaoMap(container, place);
  }

  return renderNaverMap(container, place);
}

// 네이버 목록 지도를 표시한다
async function renderNaverMap(container, place) {
  const naver = await loadNaverSdk();
  const position = new naver.maps.LatLng(place.latitude, place.longitude);

  // 목록 스크롤과 겹치지 않도록 조작을 제한한다
  const map = new naver.maps.Map(container, {
    center: position,
    zoom: 16,
    draggable: false,
    scrollWheel: false,
    pinchZoom: false,
    disableDoubleClickZoom: true,
  });

  const marker = new naver.maps.Marker({ position, map });

  // 이름과 (가능하면) 주소를 정보창으로 표시한다
  const address = await reverseGeocode(
    place.latitude,
    place.longitude,
    MAP_PROVIDER.NAVER,
  );
  const infoWindow = new naver.maps.InfoWindow({
    content: mapInfoContent(place.name, address),
    backgroundColor: '#ffffff',
    borderColor: '#198754',
    borderWidth: 1,
    anchorColor: '#ffffff',
    disableAnchor: false,
    pixelOffset: new naver.maps.Point(0, -4),
  });

  infoWindow.open(map, marker);
  return map;
}

// 카카오 목록 지도를 표시한다
async function renderKakaoMap(container, place) {
  const kakao = await loadKakaoSdk();
  const position = new kakao.maps.LatLng(place.latitude, place.longitude);
  const map = new kakao.maps.Map(container, {
    center: position,
    level: 5,
  });
  const marker = new kakao.maps.Marker({ position, map });

  // 목록 스크롤과 겹치지 않도록 조작을 제한한다
  map.setDraggable(false);
  map.setZoomable(false);

  const address = await reverseGeocode(
    place.latitude,
    place.longitude,
    MAP_PROVIDER.KAKAO,
  );
  const infoWindow = new kakao.maps.InfoWindow({
    content: mapInfoContent(place.name, address),
  });

  infoWindow.open(map, marker);
  return map;
}

// 좌표를 주소로 역변환한다 (실패 시 빈 문자열)
export async function reverseGeocode(
  latitude,
  longitude,
  provider = getDefaultProvider(),
) {
  // provider별 역지오코딩을 실행한다
  if (provider === MAP_PROVIDER.KAKAO) {
    return reverseGeocodeWithKakao(latitude, longitude);
  }

  return reverseGeocodeWithNaver(latitude, longitude);
}

// 네이버 좌표를 주소로 역변환한다
async function reverseGeocodeWithNaver(latitude, longitude) {
  const naver = await loadNaverSdk();

  return new Promise((resolve) => {
    // Reverse Geocoding을 못 쓰면 주소를 비운다
    if (!naver.maps.Service?.reverseGeocode) {
      resolve('');
      return;
    }

    naver.maps.Service.reverseGeocode(
      {
        coords: new naver.maps.LatLng(latitude, longitude),
        orders: [
          naver.maps.Service.OrderType.ROAD_ADDR,
          naver.maps.Service.OrderType.ADDR,
        ].join(','),
      },
      (status, response) => {
        // 실패해도 지도는 이름만으로 표시한다
        if (status !== naver.maps.Service.Status.OK) {
          resolve('');
          return;
        }

        const address = response.v2?.address ?? {};
        resolve(address.roadAddress || address.jibunAddress || '');
      },
    );
  });
}

// 카카오 좌표를 주소로 역변환한다
async function reverseGeocodeWithKakao(latitude, longitude) {
  const kakao = await loadKakaoSdk();
  const geocoder = new kakao.maps.services.Geocoder();

  return new Promise((resolve) => {
    geocoder.coord2Address(longitude, latitude, (results, status) => {
      // 실패해도 지도는 이름만으로 표시한다
      if (status !== kakao.maps.services.Status.OK) {
        resolve('');
        return;
      }

      const address = results[0]?.road_address || results[0]?.address;
      resolve(address?.address_name ?? '');
    });
  });
}

// 지도 정보창 내용을 만든다
function mapInfoContent(name, address) {
  const safeName = escapeHtml(name ?? '');
  const safeAddress = escapeHtml(address ?? '');

  return `
    <div class="map-info">
      <strong class="map-info-name">${safeName}</strong>
      ${safeAddress ? `<div class="map-info-address">${safeAddress}</div>` : ''}
    </div>
  `;
}

// 한국 영역 안의 좌표인지 확인한다
export function isWithinKorea(latitude, longitude) {
  return (
    latitude >= 33 &&
    latitude <= 38.7 &&
    longitude >= 124.5 &&
    longitude <= 132
  );
}

// 검색 결과를 공통 형식으로 변환한다
function normalizeNaverPlace(item) {
  const buildingName = findElement(item.addressElements, 'BUILDING_NAME');

  return {
    name: buildingName || item.roadAddress || item.jibunAddress,
    buildingName,
    roadAddress: item.roadAddress,
    jibunAddress: item.jibunAddress,
    latitude: Number(item.y),
    longitude: Number(item.x),
    provider: MAP_PROVIDER.NAVER,
  };
}

// 카카오 검색 결과를 공통 형식으로 변환한다
function normalizeKakaoPlace(item) {
  return {
    name: item.place_name || item.road_address_name || item.address_name,
    buildingName: item.place_name,
    roadAddress: item.road_address_name,
    jibunAddress: item.address_name,
    latitude: Number(item.y),
    longitude: Number(item.x),
    provider: MAP_PROVIDER.KAKAO,
  };
}

// 카카오 주소 결과를 공통 형식으로 변환한다
function normalizeKakaoAddress(item) {
  return {
    name: item.road_address?.building_name || item.address_name,
    buildingName: item.road_address?.building_name || '',
    roadAddress: item.road_address?.address_name || '',
    jibunAddress: item.address_name,
    latitude: Number(item.y),
    longitude: Number(item.x),
    provider: MAP_PROVIDER.KAKAO,
  };
}

// 기본 지도 provider를 정한다
function getDefaultProvider() {
  // 네이버 설정이 있으면 기존 표시를 유지한다
  if (hasNaverMapConfig()) {
    return MAP_PROVIDER.NAVER;
  }

  // 카카오만 있으면 카카오로 표시한다
  if (hasKakaoMapConfig()) {
    return MAP_PROVIDER.KAKAO;
  }

  return MAP_PROVIDER.NAVER;
}

// 주소 구성요소에서 특정 타입을 찾는다
function findElement(elements, type) {
  const found = (elements ?? []).find((element) =>
    element.types?.includes(type),
  );

  return found?.longName ?? '';
}
