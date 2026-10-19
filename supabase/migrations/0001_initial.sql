-- MoApp Run initial schema. Run via Supabase SQL Editor or Supabase CLI.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('manual','csv','strava','gpx','tcx','fit')),
  source_id text,
  name text not null default 'Course à pied',
  start_date timestamptz not null,
  distance_km numeric(8,3) not null check (distance_km > 0),
  duration_min numeric(10,3) not null check (duration_min > 0),
  avg_hr integer check (avg_hr between 30 and 250),
  max_hr integer check (max_hr between 30 and 250),
  elevation_gain_m numeric(8,2),
  notes text,
  effort smallint check (effort between 1 and 5),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists activities_user_source_id_unique
  on public.activities(user_id, source, source_id);
create index if not exists activities_user_start_date_idx on public.activities(user_id, start_date desc);

-- Sensitive Strava tokens: no client policies, no anon/authenticated grants.
create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on public.strava_connections from anon, authenticated;

create table if not exists public.strava_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
revoke all on public.strava_oauth_states from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.strava_connections enable row level security;
alter table public.strava_oauth_states enable row level security;

create policy "profile owner read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profile owner insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profile owner update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "activities owner read" on public.activities for select to authenticated using (auth.uid() = user_id);
create policy "activities owner insert" on public.activities for insert to authenticated with check (auth.uid() = user_id);
create policy "activities owner update" on public.activities for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activities owner delete" on public.activities for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
