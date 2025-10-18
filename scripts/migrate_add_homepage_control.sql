-- Migrazione: Aggiunta campi controllo homepage per LibereSession

-- Aggiungi campo per visibilità homepage
ALTER TABLE public.libere_sessions 
ADD COLUMN IF NOT EXISTS homepage_visible BOOLEAN NOT NULL DEFAULT false;

-- Aggiungi campo per priorità homepage (timestamp per ordinamento)
ALTER TABLE public.libere_sessions 
ADD COLUMN IF NOT EXISTS homepage_priority TIMESTAMPTZ;

-- Indice per query efficiente delle sessioni visibili ordinata per priorità
CREATE INDEX IF NOT EXISTS idx_libere_sessions_homepage_visible 
ON public.libere_sessions(homepage_visible, homepage_priority DESC) 
WHERE homepage_visible = true;

-- Commento sui campi aggiunti
COMMENT ON COLUMN public.libere_sessions.homepage_visible IS 'Determina se la sessione è visibile come pulsante sulla homepage';
COMMENT ON COLUMN public.libere_sessions.homepage_priority IS 'Timestamp per ordinare le sessioni visibili sulla homepage (più recente = priorità alta)';
