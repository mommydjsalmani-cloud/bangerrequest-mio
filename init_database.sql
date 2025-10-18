-- Schema completo per Richieste Libere
-- Estensione per UUID/random
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabella sessioni richieste libere
CREATE TABLE IF NOT EXISTS public.sessioni_libere (
  id uuid primary key default gen_random_uuid(),
  token text not null unique, -- token per accesso pubblico (?s=token)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active', -- 'active' | 'paused'
  name text default 'Sessione Richieste Libere', -- nome personalizzabile
  reset_count integer not null default 0, -- numero di reset eseguiti
  last_reset_at timestamptz, -- ultimo reset
  archived boolean not null default false, -- per soft delete
  -- Rate limiting controls
  rate_limit_enabled boolean not null default true, -- abilita rate limiting
  rate_limit_seconds integer not null default 60, -- secondi tra richieste
  -- Notes control
  notes_enabled boolean not null default true, -- abilita note/commenti degli utenti
  -- Homepage control (NOVITÀ)
  homepage_visible boolean not null default false, -- visibilità sulla homepage
  homepage_priority timestamptz -- timestamp per ordinamento homepage
);

CREATE INDEX IF NOT EXISTS idx_sessioni_libere_token ON public.sessioni_libere(token);
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_status ON public.sessioni_libere(status);
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_active ON public.sessioni_libere(archived, status);
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_homepage_visible 
ON public.sessioni_libere(homepage_visible, homepage_priority DESC) 
WHERE homepage_visible = true;

-- Tabella richieste libere
CREATE TABLE IF NOT EXISTS public.richieste_libere (
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
  status text not null default 'new', -- 'new' | 'accepted' | 'rejected' | 'cancelled' | 'archived'
  note text, -- note aggiuntive
  archived boolean not null default false, -- per soft delete
  
  -- Timestamp metadata
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_richieste_libere_session ON public.richieste_libere(session_id);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_created_at ON public.richieste_libere(created_at desc);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_status ON public.richieste_libere(status);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_ip_time ON public.richieste_libere(client_ip, created_at desc);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_active ON public.richieste_libere(archived, status);

-- Tabella rate limiting
CREATE TABLE IF NOT EXISTS public.libere_rate_limit (
  id uuid primary key default gen_random_uuid(),
  client_ip text not null,
  session_id uuid not null references public.sessioni_libere(id) on delete cascade,
  last_request_at timestamptz not null default now(),
  request_count integer not null default 1,
  blocked_until timestamptz, -- per blocchi temporanei
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_libere_rate_limit_unique ON public.libere_rate_limit(client_ip, session_id);
CREATE INDEX IF NOT EXISTS idx_libere_rate_limit_ip ON public.libere_rate_limit(client_ip);
CREATE INDEX IF NOT EXISTS idx_libere_rate_limit_blocked ON public.libere_rate_limit(blocked_until);

-- Functions
CREATE OR REPLACE FUNCTION cleanup_libere_rate_limit()
RETURNS void AS $$
BEGIN
  DELETE FROM public.libere_rate_limit 
  WHERE created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_reset_count(session_uuid uuid)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.sessioni_libere 
  SET reset_count = reset_count + 1,
      last_reset_at = now()
  WHERE id = session_uuid
  RETURNING reset_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Dati di test
INSERT INTO public.sessioni_libere (name, token, status, homepage_visible, homepage_priority) 
VALUES 
  ('Sessione Demo 1', 'demo1', 'active', true, now()),
  ('Sessione Demo 2', 'demo2', 'active', true, now() - interval '1 hour'),
  ('Sessione Test', 'test', 'paused', false, null)
ON CONFLICT (token) DO NOTHING;

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.homepage_visible IS 'Se true, mostra la sessione come pulsante sulla homepage';
COMMENT ON COLUMN public.sessioni_libere.homepage_priority IS 'Timestamp per ordinare le sessioni visibili sulla homepage (più recente = priorità alta)';