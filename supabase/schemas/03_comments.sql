create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint comments_user_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_review_id_idx
on public.comments(review_id);

create index if not exists comments_user_id_idx
on public.comments(user_id);

alter table public.comments enable row level security;

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments
for select
using (true);

drop policy if exists "Signed in users can create comments" on public.comments;
create policy "Signed in users can create comments"
on public.comments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their comments" on public.comments;
create policy "Users can update their comments"
on public.comments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their comments" on public.comments;
create policy "Users can delete their comments"
on public.comments
for delete
using (auth.uid() = user_id);
