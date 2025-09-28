-- Estensione per UUID/random (necessaria per gen_random_uuid())
create extension if not exists pgcrypto;

-- Tabella richieste
create table if not exists public.requests (
  id text primary key,
  created_at timestamptz not null default now(),
  track_id text not null,
  uri text,
  title text,
  artists text,
  album text,
  cover_url text,
  isrc text,
  explicit boolean,
  preview_url text,
  note text,
  event_code text,
  requester text,
  status text not null default 'new',
  duplicates integer not null default 0,
  -- Log dei duplicati (solo POST duplicati). Array di oggetti: [{ at, requester, note }]
  duplicates_log jsonb
);

create index if not exists idx_requests_event_code on public.requests(event_code);
create index if not exists idx_requests_created_at on public.requests(created_at desc);

-- Tabella eventi
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true, -- legacy boolean
  status text not null default 'active' -- 'active' | 'paused' | 'closed'
);

create index if not exists idx_events_active on public.events(active);
create index if not exists idx_events_status on public.events(status);

-- MIGRAZIONE (se tabella già esistente):
-- alter table public.events add column if not exists status text not null default 'active';
-- update public.events set status = case when active then 'active' else 'paused' end where status is null or status not in ('active','paused','closed');
-- create index concurrently if not exists idx_events_status on public.events(status);
-- Per aggiungere il log duplicati se mancante:
-- alter table public.requests add column if not exists duplicates_log jsonb;
-- (opzionale) aggiornare i record esistenti senza log: update public.requests set duplicates_log = '[]'::jsonb where duplicates_log is null;
