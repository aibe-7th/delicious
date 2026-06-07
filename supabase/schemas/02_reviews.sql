create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint reviews_user_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  restaurant_name text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_latitude_range check (
    latitude between -90 and 90
  ),
  constraint reviews_longitude_range check (
    longitude between -180 and 180
  )
);

create index if not exists reviews_user_id_idx
on public.reviews(user_id);

create index if not exists reviews_created_at_idx
on public.reviews(created_at desc);

alter table public.reviews enable row level security;

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

drop policy if exists "Reviews are readable by everyone" on public.reviews;
create policy "Reviews are readable by everyone"
on public.reviews
for select
using (true);

drop policy if exists "Signed in users can create reviews" on public.reviews;
create policy "Signed in users can create reviews"
on public.reviews
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their reviews" on public.reviews;
create policy "Users can update their reviews"
on public.reviews
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their reviews" on public.reviews;
create policy "Users can delete their reviews"
on public.reviews
for delete
using (auth.uid() = user_id);
