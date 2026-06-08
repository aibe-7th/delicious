create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 가입 시 프로필을 생성한다 (이메일 미제공 시 openid를 단방향 해싱해 식별자로 사용)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hashed text;
begin
  -- openid(sub)를 SHA-256 16진수 8자리로 단방향 해싱한다
  hashed := left(
    encode(digest(coalesce(new.raw_user_meta_data ->> 'sub', new.id::text), 'sha256'), 'hex'),
    8
  );

  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    coalesce(new.email, hashed),
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'nickname',
      case when new.email is null then hashed end
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 현재 로그인 유저를 탈퇴 처리한다 (auth.users 삭제 → 프로필/리뷰/댓글 cascade)
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
