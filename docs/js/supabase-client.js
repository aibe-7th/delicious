import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_PUB_KEY, SUPABASE_URL, hasSupabaseConfig } from "./config.js";
import { MSG } from './msg.js';

let client = null;

// Supabase 클라이언트를 만든다
export function initSupabase() {
  // 설정이 없으면 연결하지 않는다
  if (!hasSupabaseConfig()) {
    client = null;
    return client;
  }

  client = createClient(SUPABASE_URL, SUPABASE_PUB_KEY);
  return client;
}

// Supabase 클라이언트를 반환한다
export function getSupabase() {
  return client;
}

// Supabase 연결을 검증한다
export function requireSupabase() {
  // 연결 전이면 오류를 알린다
  if (!client) {
    throw new Error(MSG.system.notReady);
  }

  return client;
}
