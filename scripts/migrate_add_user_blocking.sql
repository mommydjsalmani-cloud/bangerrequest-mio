-- Script per aggiungere sistema di blocco utenti
-- Eseguire in Supabase SQL Editor

-- Tabella per blocchi utenti
create table if not exists public.libere_blocked_users (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessioni_libere(id) on delete cascade,
  
  -- Identificatori utente (almeno uno deve essere presente)
  client_ip text, -- IP dell'utente 
  requester_name text, -- nome utente (case-insensitive)
  
  -- Metadata blocco
  created_at timestamptz not null default now(),
  blocked_by text not null default 'DJ', -- chi ha eseguito il blocco
  reason text, -- motivo del blocco (opzionale)
  
  -- Vincoli per evitare duplicati
  unique(session_id, client_ip),
  unique(session_id, lower(requester_name))
);

-- Indici per performance
create index if not exists idx_libere_blocked_session_ip on public.libere_blocked_users(session_id, client_ip);
create index if not exists idx_libere_blocked_session_name on public.libere_blocked_users(session_id, lower(requester_name));
create index if not exists idx_libere_blocked_created_at on public.libere_blocked_users(created_at desc);

-- Verifica che almeno un identificatore sia presente
alter table public.libere_blocked_users 
add constraint check_has_identifier 
check (client_ip is not null or requester_name is not null);

-- Commenti per documentazione
comment on table public.libere_blocked_users is 'Gestisce blocchi utenti per richieste libere - blocco per IP e/o nome';
comment on column public.libere_blocked_users.client_ip is 'IP address dell''utente bloccato';
comment on column public.libere_blocked_users.requester_name is 'Nome utente bloccato (case-insensitive)';
comment on column public.libere_blocked_users.reason is 'Motivo del blocco (spam, contenuto inappropriato, etc.)';