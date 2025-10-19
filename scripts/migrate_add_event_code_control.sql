-- Migrazione: Aggiunta supporto codice evento nelle richieste libere

-- Aggiungi colonne per codice evento
ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS event_code TEXT NULL;

ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS event_code_upper TEXT NULL;

-- Indice per ricerche case-insensitive sul codice evento
CREATE INDEX IF NOT EXISTS idx_richieste_libere_event_code_upper 
ON public.richieste_libere(event_code_upper) 
WHERE event_code_upper IS NOT NULL;

-- Indice composto per sessione + codice evento (per filtri DJ)
CREATE INDEX IF NOT EXISTS idx_richieste_libere_session_event 
ON public.richieste_libere(session_id, event_code_upper) 
WHERE event_code_upper IS NOT NULL;

-- Commenti per documentazione
COMMENT ON COLUMN public.richieste_libere.event_code IS 'Codice evento inserito dall''utente (originale con case)';
COMMENT ON COLUMN public.richieste_libere.event_code_upper IS 'Codice evento normalizzato in maiuscolo per ricerche case-insensitive';

-- Aggiungi colonna per impostazione requireEventCode nelle sessioni libere
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS require_event_code BOOLEAN NOT NULL DEFAULT false;

-- Commento per la nuova impostazione
COMMENT ON COLUMN public.sessioni_libere.require_event_code IS 'Se true, richiede codice evento obbligatorio per nuove richieste';

-- Verifica migrazione
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name IN ('richieste_libere', 'sessioni_libere') 
  AND column_name IN ('event_code', 'event_code_upper', 'require_event_code')
ORDER BY table_name, column_name;
