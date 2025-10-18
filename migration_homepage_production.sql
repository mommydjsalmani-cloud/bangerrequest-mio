-- MIGRAZIONE HOMEPAGE CONTROLS
-- Eseguire questo SQL nel dashboard Supabase → SQL Editor

-- Aggiungi campi per controllo homepage
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS homepage_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS homepage_priority timestamptz;

-- Indice per query efficiente delle sessioni visibili ordinata per priorità
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_homepage_visible 
ON public.sessioni_libere(homepage_visible, homepage_priority DESC) 
WHERE homepage_visible = true;

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.homepage_visible IS 'Se true, mostra la sessione come pulsante sulla homepage';
COMMENT ON COLUMN public.sessioni_libere.homepage_priority IS 'Timestamp per ordinare le sessioni visibili sulla homepage (più recente = priorità alta)';

-- Verifica che la migrazione sia avvenuta correttamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessioni_libere' 
  AND column_name IN ('homepage_visible', 'homepage_priority')
ORDER BY column_name;