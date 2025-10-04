-- Schema per Richieste Libere
-- Estensione per UUID/random (già presente)
create extension if not exists pgcrypto;

-- Tabella sessioni richieste libere
create table if not exists public.sessioni_libere (
  id uuid primary key default gen_random_uuid(),
  token text not null unique, -- token per accesso pubblico (?s=token)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active', -- 'active' | 'paused'
  name text default 'Sessione Richieste Libere', -- nome personalizzabile
  reset_count integer not null default 0, -- numero di reset eseguiti
  last_reset_at timestamptz, -- ultimo reset
  archived boolean not null default false -- per soft delete
);

create index if not exists idx_sessioni_libere_token on public.sessioni_libere(token);
create index if not exists idx_sessioni_libere_status on public.sessioni_libere(status);
create index if not exists idx_sessioni_libere_active on public.sessioni_libere(archived, status);

-- Tabella richieste libere
create table if not exists public.richieste_libere (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessioni_libere(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Dati del brano (da Spotify API o input manuale)
  track_id text, -- Spotify track ID (nullable per fallback manuale)
  uri text, -- Spotify URI
  title text not null, -- sempre obbligatorio
  artists text, -- artisti
  album text, -- album
  cover_url text, -- copertina
  isrc text,
  explicit boolean,
  preview_url text,
  duration_ms integer,
  
  -- Dati richiesta
  requester_name text, -- nome opzionale del richiedente
  client_ip text not null, -- per rate limiting
  user_agent text, -- per tracking
  source text not null default 'manual', -- 'spotify' | 'manual'
  
  -- Stato e gestione
  status text not null default 'new', -- 'new' | 'accepted' | 'rejected' | 'archived'
  note text, -- note aggiuntive
  archived boolean not null default false, -- per soft delete
  
  -- Timestamp metadata
  accepted_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz
);

create index if not exists idx_richieste_libere_session on public.richieste_libere(session_id);
create index if not exists idx_richieste_libere_created_at on public.richieste_libere(created_at desc);
create index if not exists idx_richieste_libere_status on public.richieste_libere(status);
create index if not exists idx_richieste_libere_ip_time on public.richieste_libere(client_ip, created_at desc);
create index if not exists idx_richieste_libere_active on public.richieste_libere(archived, status);

-- Tabella rate limiting
create table if not exists public.libere_rate_limit (
  id uuid primary key default gen_random_uuid(),
  client_ip text not null,
  session_id uuid not null references public.sessioni_libere(id) on delete cascade,
  last_request_at timestamptz not null default now(),
  request_count integer not null default 1,
  blocked_until timestamptz, -- per blocchi temporanei
  created_at timestamptz not null default now()
);

create unique index if not exists idx_libere_rate_limit_unique on public.libere_rate_limit(client_ip, session_id);
create index if not exists idx_libere_rate_limit_ip on public.libere_rate_limit(client_ip);
create index if not exists idx_libere_rate_limit_blocked on public.libere_rate_limit(blocked_until);

-- Function per cleanup automatico rate limit (rimuove entries > 24h)
create or replace function cleanup_libere_rate_limit()
returns void as $$
begin
  delete from public.libere_rate_limit 
  where created_at < now() - interval '24 hours';
end;
$$ language plpgsql;

-- Function per incrementare reset count
create or replace function increment_reset_count(session_id uuid)
returns integer as $$
declare
  new_count integer;
begin
  update public.sessioni_libere 
  set reset_count = reset_count + 1
  where id = session_id
  returning reset_count into new_count;
  
  return coalesce(new_count, 0);
end;
$$ language plpgsql;

-- Function per aggiornare updated_at automaticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger per aggiornare updated_at su sessioni_libere
drop trigger if exists update_sessioni_libere_updated_at on public.sessioni_libere;
create trigger update_sessioni_libere_updated_at
  before update on public.sessioni_libere
  for each row execute function update_updated_at_column();

-- Inserimento sessione di default per testing
insert into public.sessioni_libere (token, name, status)
values ('demo-token-libere-2024', 'Sessione Demo Richieste Libere', 'active')
on conflict (token) do nothing;