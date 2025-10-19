-- Migrazione PRODUZIONE: Sistema codici evento per richieste libere
-- Data: 2025-10-19
-- Applicare su database Supabase PRODUZIONE

-- STEP 1: Verifica tabelle esistenti
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('richieste_libere', 'sessioni_libere');

-- STEP 2: Aggiungi colonne codice evento alla tabella richieste
ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS event_code TEXT NULL;

ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS event_code_upper TEXT NULL;

-- STEP 3: Aggiungi setting controllo codice evento nelle sessioni
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS require_event_code BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS current_event_code TEXT NULL;

-- STEP 4: Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_richieste_libere_event_code_upper 
ON public.richieste_libere(event_code_upper) 
WHERE event_code_upper IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_richieste_libere_session_event 
ON public.richieste_libere(session_id, event_code_upper) 
WHERE event_code_upper IS NOT NULL;

-- STEP 5: Aggiungi commenti documentazione
COMMENT ON COLUMN public.richieste_libere.event_code IS 'Codice evento inserito dall''utente (originale con case)';
COMMENT ON COLUMN public.richieste_libere.event_code_upper IS 'Codice evento normalizzato in maiuscolo per ricerche case-insensitive';
COMMENT ON COLUMN public.sessioni_libere.require_event_code IS 'Se true, richiede codice evento obbligatorio per nuove richieste';
COMMENT ON COLUMN public.sessioni_libere.current_event_code IS 'Codice evento corrente impostato dal DJ per questa sessione';

-- STEP 6: Verifica migrazione completata
SELECT 
  'MIGRAZIONE COMPLETATA - Verifica colonne:' as status,
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('richieste_libere', 'sessioni_libere') 
  AND column_name IN ('event_code', 'event_code_upper', 'require_event_code', 'current_event_code')
ORDER BY table_name, column_name;

-- STEP 7: Verifica indici creati
SELECT 
  'INDICI CREATI:' as status,
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename IN ('richieste_libere', 'sessioni_libere')
  AND indexname LIKE '%event%';
