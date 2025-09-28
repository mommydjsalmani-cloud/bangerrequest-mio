-- Migrazione Supabase: Aggiungere supporto duration_ms
-- Eseguire questo script nel SQL Editor di Supabase

-- 1. Aggiungi colonna se non esiste
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS duration_ms integer;

-- 2. Aggiungi commento per documentazione
COMMENT ON COLUMN public.requests.duration_ms IS 'Durata traccia in millisecondi';

-- 3. Verifica risultato
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'requests' 
  AND column_name = 'duration_ms';

-- 4. Test query di esempio
SELECT id, title, artists, duration_ms
FROM public.requests
WHERE duration_ms IS NOT NULL
LIMIT 5;

-- 5. (Opzionale) Se hai dati esistenti e conosci durate, aggiornali:
-- UPDATE public.requests SET duration_ms = 180000 WHERE title = 'Example Song';

-- 6. IMPORTANTE: Reload schema cache PostgREST
-- Dopo aver eseguito questo script, vai in:
-- Dashboard Supabase → Settings → API → Schema Cache → "Reload schema cache"
--
-- Oppure esegui via API:
-- POST https://YOUR_PROJECT_ID.supabase.co/rest/v1/rpc/reload_schema_cache
-- Headers: apikey: YOUR_ANON_KEY, Authorization: Bearer YOUR_SERVICE_ROLE_KEY

-- 7. Test finale API
-- curl "https://YOUR_PROJECT_URL.supabase.co/rest/v1/requests?select=id,duration_ms&limit=1" \
--   -H 'apikey: YOUR_ANON_KEY'