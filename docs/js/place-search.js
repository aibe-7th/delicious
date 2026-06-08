// 장소 검색 provider (현재: 네이버 지도 Geocoding)
// 주의: geocode는 주소(도로명/지번) 변환기라 상호·가게 이름으로는 검색되지 않는다.
//       상호 키워드(POI) 검색이 필요하면 지역검색 API 프록시나 카카오 로컬로 이 모듈만 교체한다.
import { NAVER_MAP_CLIENT_ID, hasMapConfig } from './config.js';
import { MSG } from './msg.js';
import { escapeHtml } from './ui.js';

// 지도 SDK 로딩 상태를 보관한다
let sdkPromise = null;

// 미리보기 지도와 마커를 보관한다
let previewMap = null;
let previewMarker = null;

// 네이버 지도 SDK를 지연 로딩한다
function loadNaverSdk() {
  // 이미 로딩 중이면 재사용한다
  if (sdkPromise) {
    return sdkPromise;
  }

  // 설정이 없으면 중단한다
  if (!hasMapConfig()) {
    return Promise.reject(new Error(MSG.place.notConfigured));
  }

  sdkPromise = new Promise((resolve, reject) => {
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

  return sdkPromise;
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

// 주소로 장소를 검색한다 (상호명이 아닌 도로명/지번 주소 기준)
export async function searchPlaces(query) {
  const naver = await loadNaverSdk();

  return new Promise((resolve, reject) => {
    naver.maps.Service.geocode({ query }, (status, response) => {
      // 검색 실패를 전달한다
      if (status !== naver.maps.Service.Status.OK) {
        reject(new Error(MSG.place.searchFail));
        return;
      }

      const addresses = response.v2?.addresses ?? [];
      resolve(addresses.map(normalizePlace));
    });
  });
}

// 선택한 위치를 미니 지도로 미리 본다
export async function renderPreviewMap(container, place) {
  const naver = await loadNaverSdk();
  const position = new naver.maps.LatLng(place.latitude, place.longitude);

  // 지도를 처음 한 번만 생성한다
  if (!previewMap) {
    previewMap = new naver.maps.Map(container, { center: position, zoom: 16 });
    previewMarker = new naver.maps.Marker({ position, map: previewMap });
    return;
  }

  // 기존 지도의 중심과 마커를 옮긴다
  previewMap.setCenter(position);
  previewMarker.setPosition(position);
}

// 좌표 위치를 지도에 표시한다 (목록용, 매번 새 지도를 만든다)
export async function renderMap(container, place) {
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
  const address = await reverseGeocode(place.latitude, place.longitude);
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

// 좌표를 주소로 역변환한다 (실패 시 빈 문자열)
export async function reverseGeocode(latitude, longitude) {
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
function normalizePlace(item) {
  const buildingName = findElement(item.addressElements, 'BUILDING_NAME');

  return {
    name: buildingName || item.roadAddress || item.jibunAddress,
    buildingName,
    roadAddress: item.roadAddress,
    jibunAddress: item.jibunAddress,
    latitude: Number(item.y),
    longitude: Number(item.x),
  };
}

// 주소 구성요소에서 특정 타입을 찾는다
function findElement(elements, type) {
  const found = (elements ?? []).find((element) =>
    element.types?.includes(type),
  );

  return found?.longName ?? '';
}
