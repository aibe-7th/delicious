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

  const user = data.user;

  // 유저가 있으면 프로필을 저장한다
  if (user) {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
    });
  }

  return data;
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

// 로그아웃을 진행한다
export async function signOut() {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut();

  // 로그아웃 오류를 전달한다
  if (error) {
    throw error;
  }
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
      updated_at
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
