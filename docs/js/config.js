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

// 지도 검색 사용 가능 여부를 확인한다
export function hasMapConfig() {
  return Boolean(NAVER_MAP_CLIENT_ID);
}
