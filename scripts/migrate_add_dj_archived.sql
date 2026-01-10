-- Migrazione per separare vista DJ e vista utente
-- Eseguire su Supabase SQL Editor

-- 1. Aggiungere colonna dj_archived alla tabella richieste_libere
-- Questa colonna controlla solo la vista del DJ, non quella degli utenti
ALTER TABLE public.richieste_libere
ADD COLUMN IF NOT EXISTS dj_archived boolean NOT NULL DEFAULT false;

-- 2. Aggiungere colonna dj_archived_at per tracciare quando è stato archiviato lato DJ
ALTER TABLE public.richieste_libere
ADD COLUMN IF NOT EXISTS dj_archived_at timestamptz;

-- 3. Indice per query veloci sulla vista DJ
CREATE INDEX IF NOT EXISTS idx_richieste_libere_dj_archived 
ON public.richieste_libere(dj_archived);

-- 4. Indice combinato per query DJ (session + dj_archived)
CREATE INDEX IF NOT EXISTS idx_richieste_libere_session_dj_archived 
ON public.richieste_libere(session_id, dj_archived);

-- Note:
-- - dj_archived = true: nascosto dalla vista DJ (reset morbido)
-- - archived = true: nascosto da TUTTE le viste (eliminazione definitiva)
-- - Gli utenti vedono tutte le richieste con archived = false (ignorano dj_archived)
