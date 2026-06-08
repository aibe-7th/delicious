import { requireSupabase } from './supabase-client.js';

// 현재 세션을 조회한다
export async function getSession() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();

  // 세션 오류를 전달한다
  if (error) {
    throw error;
  }

  return data.session;
}

// 이메일 회원가입을 진행한다
export async function signUp(email, password, emailRedirectTo) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  // 가입 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 로그인 수단을 한글 라벨로 바꾼다
export function resolveProviderLabel(provider) {
  if (!provider || provider === 'email') {
    return '이메일';
  }
  if (provider.includes('kakao')) {
    return '카카오';
  }
  if (provider.includes('google')) {
    return '구글';
  }
  return provider;
}

// 우측 상단 표시용 로그인 정보를 만든다 (가입 시 트리거가 저장한 식별자를 읽는다)
export async function resolveUserIdentity(user) {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  return {
    label: data?.email ?? user.email ?? user.id,
    provider: resolveProviderLabel(user.app_metadata?.provider),
  };
}

// 이메일 로그인을 진행한다
export async function signIn(email, password) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 로그인 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 소셜 로그인을 진행한다
export async function signInWithProvider(provider, redirectTo) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  // 소셜 로그인 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 로그아웃을 진행한다
export async function signOut() {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut();

  // 로그아웃 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 회원 탈퇴를 진행한다
export async function deleteAccount() {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('delete_current_user');

  // 탈퇴 오류를 전달한다
  if (error) {
    throw error;
  }

  // 남은 로컬 세션을 정리한다
  await supabase.auth.signOut();
}

// 리뷰 목록을 조회한다
export async function fetchReviews() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      user_id,
      title,
      content,
      restaurant_name,
      latitude,
      longitude,
      created_at,
      updated_at,
      profiles!reviews_user_profile_fkey (
        email,
        nickname
      ),
      comments (
        id,
        user_id,
        content,
        created_at,
        profiles!comments_user_profile_fkey (
          email,
          nickname
        )
      )
    `,
    )
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'comments', ascending: true });

  // 조회 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 리뷰 하나를 조회한다
export async function fetchReview(id) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      user_id,
      title,
      content,
      restaurant_name,
      latitude,
      longitude,
      created_at,
      updated_at,
      profiles!reviews_user_profile_fkey (
        email,
        nickname
      )
    `,
    )
    .eq('id', id)
    .single();

  // 조회 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 리뷰를 저장한다
export async function saveReview(payload) {
  const supabase = requireSupabase();
  const { id, ...values } = payload;
  const query = id
    ? supabase.from('reviews').update(values).eq('id', id)
    : supabase.from('reviews').insert(values);
  const { error } = await query;

  // 저장 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 리뷰를 삭제한다
export async function deleteReview(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('reviews').delete().eq('id', id);

  // 삭제 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 댓글을 저장한다
export async function saveComment(payload) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('comments').insert(payload);

  // 댓글 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 댓글을 삭제한다
export async function deleteComment(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('comments').delete().eq('id', id);

  // 댓글 삭제 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 닉네임을 수정한다
export async function updateNickname(userId, nickname) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);

  // 수정 오류를 전달한다
  if (error) {
    throw error;
  }
}

// 내 프로필 정보를 조회한다
export async function fetchMyProfile(userId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('email, nickname, created_at')
    .eq('id', userId)
    .single();

  // 조회 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 내가 작성한 리뷰를 조회한다
export async function fetchMyReviews(userId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, title, restaurant_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 조회 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}

// 내가 작성한 댓글을 조회한다
export async function fetchMyComments(userId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, created_at, review_id, reviews ( title )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 조회 오류를 전달한다
  if (error) {
    throw error;
  }

  return data;
}
