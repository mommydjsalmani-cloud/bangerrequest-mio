-- Migrazione per aggiungere il campo duration_ms alla tabella requests
-- Eseguire questo SQL nel dashboard Supabase o tramite CLI

-- Aggiungi il campo duration_ms alla tabella requests
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Crea un indice per performance se necessario (opzionale)
-- CREATE INDEX IF NOT EXISTS idx_requests_duration_ms ON public.requests(duration_ms);

-- Commento: duration_ms contiene la durata del brano in millisecondi (es. 180000 = 3 minuti)
-- Campo nullable perché alcuni brani potrebbero non avere durata disponibile