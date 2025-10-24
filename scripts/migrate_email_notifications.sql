-- Migrazione: Tabella configurazione notifiche email DJ
-- File: scripts/migrate_email_notifications.sql

CREATE TABLE IF NOT EXISTS dj_email_config (
    id SERIAL PRIMARY KEY,
    dj_user VARCHAR(255) NOT NULL UNIQUE,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    email_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_dj_email_config_user ON dj_email_config(dj_user);
CREATE INDEX IF NOT EXISTS idx_dj_email_config_enabled ON dj_email_config(email_enabled);

-- Commenti per documentazione
COMMENT ON TABLE dj_email_config IS 'Configurazione notifiche email per DJ';
COMMENT ON COLUMN dj_email_config.dj_user IS 'Username DJ';
COMMENT ON COLUMN dj_email_config.email_enabled IS 'Se le notifiche email sono abilitate';
COMMENT ON COLUMN dj_email_config.email_address IS 'Indirizzo email per le notifiche';