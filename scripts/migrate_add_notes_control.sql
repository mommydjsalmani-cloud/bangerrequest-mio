-- Migrazione: Aggiunge controllo note/commenti nelle sessioni libere
-- Data: 2025-10-06

-- Aggiungi campo per controllare se le note sono abilitate
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS notes_enabled boolean NOT NULL DEFAULT true;

-- Crea indice per performance
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_notes_enabled 
ON public.sessioni_libere(notes_enabled);

-- Commento per documentazione
COMMENT ON COLUMN public.sessioni_libere.notes_enabled 
IS 'Controlla se gli utenti possono lasciare note/commenti nelle richieste (default: true)';