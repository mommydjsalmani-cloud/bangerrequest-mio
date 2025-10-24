-- Migrazione per sistema Web Push Notifications
-- Crea tabella push_subscriptions per Banger Request
-- Versione: 1.0.0

-- Crea tabella per le subscription push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Commenti per documentazione
COMMENT ON TABLE push_subscriptions IS 'Subscription notifiche push per DJ panel';
COMMENT ON COLUMN push_subscriptions.id IS 'ID unico subscription';
COMMENT ON COLUMN push_subscriptions.user_id IS 'ID utente (username DJ)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL endpoint push (unico)';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Chiave pubblica ECDH (base64)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Chiave autenticazione (base64)';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'User-Agent del browser';
COMMENT ON COLUMN push_subscriptions.created_at IS 'Data creazione subscription';

-- RLS (Row Level Security) - Opzionale per sicurezza aggiuntiva
-- Commenta questa sezione se non usi RLS
/*
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy per leggere le proprie subscription
CREATE POLICY "Utenti possono leggere le proprie subscription" ON push_subscriptions
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy per inserire le proprie subscription  
CREATE POLICY "Utenti possono inserire le proprie subscription" ON push_subscriptions
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy per aggiornare le proprie subscription
CREATE POLICY "Utenti possono aggiornare le proprie subscription" ON push_subscriptions
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy per eliminare le proprie subscription
CREATE POLICY "Utenti possono eliminare le proprie subscription" ON push_subscriptions
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
*/

-- Funzione per cleanup automatico subscription obsolete (opzionale)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Elimina subscription più vecchie di 30 giorni
    DELETE FROM push_subscriptions 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log operazione
    RAISE NOTICE 'Cleanup push_subscriptions: eliminate % subscription obsolete', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commento sulla funzione
COMMENT ON FUNCTION cleanup_old_push_subscriptions() IS 'Elimina subscription push più vecchie di 30 giorni';

-- Verifica che la migrazione sia stata applicata
DO $$
BEGIN
    -- Test inserimento e rimozione per verificare il funzionamento
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) 
    VALUES ('test_user', 'https://test.endpoint.com/test', 'test_p256dh', 'test_auth', 'Test Browser');
    
    DELETE FROM push_subscriptions WHERE user_id = 'test_user' AND endpoint = 'https://test.endpoint.com/test';
    
    RAISE NOTICE 'Migrazione push_subscriptions completata con successo ✓';
END $$;