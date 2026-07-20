-- Nidham — Postgres schema (Supabase). Plain SQL + standard Postgres features only
-- (uuid, RLS, check constraints, triggers) so it lifts to any Postgres later. Run in
-- the Supabase SQL editor. Auth is Supabase Auth; every row is scoped to auth.users
-- and protected by row-level security.

-- ---------------------------------------------------------------- profiles ---
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  lang          text not null default 'en' check (lang in ('en', 'tr', 'ar')),
  -- prayer-time location + method (used by the app / agent)
  latitude      double precision,
  longitude     double precision,
  calc_method   int not null default 13,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are self-owned" on public.profiles;
create policy "profiles are self-owned" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------------- items ---
-- Mirrors the app's single `Item` model (src/types/item.ts). The app's semantic id
-- (e.g. "p_fajr", "x_email", "cap_…") is unique per user, so the primary key is
-- composite (user_id, id) and upserts target that pair.
create table if not exists public.items (
  user_id     uuid not null references auth.users (id) on delete cascade,
  id          text not null,
  title       text not null,
  category    text not null check (category in ('prayer','tesbihat','wird','task','project','milestone','step','errand')),
  day         date,                                -- null = unscheduled (Tasks backlog)
  prayer_window text not null check (prayer_window in ('fajr','morning','dhuhr','afternoon','asr','maghrib','isha','evening','anytime')),
  sort_time   text not null,                       -- "HH:mm"
  urgency     text not null check (urgency in ('now','today','soon','someday')),
  energy      text not null check (energy in ('deep','light','admin')),
  area        text check (area in ('chore','admin','personal','self-dev','spiritual','errand','project')),
  sort_order  int,                                 -- stable order for backlog milestones/steps
  due_date    date,
  parent_id   text,
  steps       text[],                              -- ordered child step ids (projects)
  start_here  boolean,
  status      text not null check (status in ('pending','now','done','pushed')),
  protected   boolean,
  note        text,
  in_feed     boolean not null default false,      -- shows in the Capture "just captured" feed
  feed_order  int,                                 -- feed position (lower = newer/top)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists items_user_day_idx    on public.items (user_id, day);
create index if not exists items_user_parent_idx on public.items (user_id, parent_id);
create index if not exists items_user_feed_idx   on public.items (user_id, in_feed, feed_order);

alter table public.items enable row level security;

drop policy if exists "items are self-owned" on public.items;
create policy "items are self-owned" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------- updated_at touch ---
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------ auto-create a profile row ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
