-- Migration: Aggiungi supporto Tidal
-- Data: 2026-03-01
-- Descrizione: Aggiunge colonne per integrazione Tidal (OAuth, playlist, catalogo)

-- 1. Aggiungi colonne a sessioni_libere per Tidal
ALTER TABLE sessioni_libere
ADD COLUMN IF NOT EXISTS catalog_type TEXT DEFAULT 'deezer' CHECK (catalog_type IN ('deezer', 'tidal')),
ADD COLUMN IF NOT EXISTS tidal_playlist_id TEXT,
ADD COLUMN IF NOT EXISTS tidal_access_token TEXT,
ADD COLUMN IF NOT EXISTS tidal_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS tidal_user_id TEXT,
ADD COLUMN IF NOT EXISTS tidal_token_expires_at TIMESTAMPTZ;

-- 2. Aggiungi colonne a richieste_libere per tracking Tidal
ALTER TABLE richieste_libere
ADD COLUMN IF NOT EXISTS tidal_added_status TEXT CHECK (tidal_added_status IN ('pending', 'success', 'failed')),
ADD COLUMN IF NOT EXISTS tidal_added_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tidal_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tidal_last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tidal_error_message TEXT;

-- 3. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_sessioni_catalog_type ON sessioni_libere(catalog_type);
CREATE INDEX IF NOT EXISTS idx_richieste_tidal_status ON richieste_libere(tidal_added_status) WHERE tidal_added_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_richieste_tidal_pending ON richieste_libere(tidal_added_status, tidal_retry_count) WHERE tidal_added_status = 'pending';

-- 4. Commenti per documentazione
COMMENT ON COLUMN sessioni_libere.catalog_type IS 'Catalogo attivo: deezer o tidal';
COMMENT ON COLUMN sessioni_libere.tidal_playlist_id IS 'ID playlist Tidal creata per questa sessione';
COMMENT ON COLUMN sessioni_libere.tidal_access_token IS 'Access token Tidal (criptato)';
COMMENT ON COLUMN sessioni_libere.tidal_refresh_token IS 'Refresh token Tidal (criptato)';
COMMENT ON COLUMN sessioni_libere.tidal_user_id IS 'User ID Tidal autenticato';
COMMENT ON COLUMN sessioni_libere.tidal_token_expires_at IS 'Scadenza access token Tidal';

COMMENT ON COLUMN richieste_libere.tidal_added_status IS 'Stato aggiunta a playlist Tidal: pending, success, failed';
COMMENT ON COLUMN richieste_libere.tidal_added_at IS 'Timestamp aggiunta a playlist Tidal';
COMMENT ON COLUMN richieste_libere.tidal_retry_count IS 'Numero tentativi aggiunta a Tidal';
COMMENT ON COLUMN richieste_libere.tidal_last_retry_at IS 'Ultimo tentativo aggiunta a Tidal';
COMMENT ON COLUMN richieste_libere.tidal_error_message IS 'Messaggio errore Tidal (se fallito)';
