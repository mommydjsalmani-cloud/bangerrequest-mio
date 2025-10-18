-- MIGRAZIONE CODICE EVENTO RICHIESTE LIBERE
-- Eseguire questo SQL nel dashboard Supabase → SQL Editor

-- Aggiungi campo per controllo codice evento alle sessioni
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS event_code_required boolean NOT NULL DEFAULT false;

-- Aggiungi il codice evento valido impostato dal DJ
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS event_code text;

-- Aggiungi campo event_code alle richieste libere (quello inserito dall'utente)
ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS user_event_code text;

-- Indice per ricerca veloce per codice evento
CREATE INDEX IF NOT EXISTS idx_richieste_libere_user_event_code ON public.richieste_libere(user_event_code);

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.event_code_required IS 'Se true, richiede il codice evento per fare richieste';
COMMENT ON COLUMN public.sessioni_libere.event_code IS 'Codice evento valido impostato dal DJ';
COMMENT ON COLUMN public.richieste_libere.user_event_code IS 'Codice evento fornito dall utente per la richiesta';

-- Verifica che la migrazione sia avvenuta correttamente
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name IN ('sessioni_libere', 'richieste_libere')
  AND column_name IN ('event_code_required', 'event_code')
ORDER BY table_name, column_name;