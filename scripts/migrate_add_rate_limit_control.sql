-- Migrazione: Aggiungi controllo rate limiting alle sessioni libere

-- Aggiungi campo per abilitare/disabilitare rate limiting
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS rate_limit_enabled boolean NOT NULL DEFAULT true;

-- Aggiungi campo per personalizzare l'intervallo rate limit (in secondi)
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS rate_limit_seconds integer NOT NULL DEFAULT 60;

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.rate_limit_enabled IS 'Se true, applica rate limiting alle richieste';
COMMENT ON COLUMN public.sessioni_libere.rate_limit_seconds IS 'Secondi di attesa tra richieste consecutive';