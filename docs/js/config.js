// Supabase 프로젝트 URL을 입력한다
export const SUPABASE_URL = "https://wxznnfhwuyklusjdsrky.supabase.co";

// Supabase Publishable key를 입력한다
export const SUPABASE_PUB_KEY =
  "sb_publishable_B-VBtc-DU3aA1zXmt_o72g_4BGILB5G";

// 연결 가능 여부를 확인한다
export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_PUB_KEY);
}

// 네이버 지도 Client ID(NCP ncpKeyId)를 입력한다
export const NAVER_MAP_CLIENT_ID = "a0ox0ah0p3";

// 카카오 지도 JavaScript 키를 입력한다
export const KAKAO_MAP_JS_KEY = "8c0817d3206ff4912b525b58fc2bdda9";

// 네이버 지도 사용 가능 여부를 확인한다
export function hasNaverMapConfig() {
  return Boolean(NAVER_MAP_CLIENT_ID);
}

// 카카오 지도 사용 가능 여부를 확인한다
export function hasKakaoMapConfig() {
  return Boolean(KAKAO_MAP_JS_KEY);
}

// 지도 검색 사용 가능 여부를 확인한다
export function hasMapConfig() {
  return hasNaverMapConfig() || hasKakaoMapConfig();
}
