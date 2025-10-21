-- Tabella per memorizzare le subscription push dei DJ
CREATE TABLE IF NOT EXISTS dj_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dj_id TEXT NOT NULL, -- Identificativo del DJ (es. DJ_PANEL_USER)
    endpoint TEXT NOT NULL UNIQUE, -- URL endpoint della subscription
    p256dh TEXT NOT NULL, -- Chiave pubblica p256dh
    auth TEXT NOT NULL, -- Token di autenticazione
    user_agent TEXT, -- User agent del browser
    is_active BOOLEAN DEFAULT true, -- Se la subscription è attiva
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    error_reason TEXT -- Motivo di eventuale errore
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_id ON dj_push_subscriptions(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_active ON dj_push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_endpoint ON dj_push_subscriptions(endpoint);

-- RLS (Row Level Security) - Solo il DJ può accedere alle proprie subscription
ALTER TABLE dj_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a DJ autenticati di gestire le proprie subscription
CREATE POLICY "DJ can manage own push subscriptions" ON dj_push_subscriptions
    FOR ALL USING (
        -- Verifica che l'utente sia autenticato come DJ
        -- Nota: Questa policy può essere raffinata in base al sistema di auth specifico
        dj_id = current_setting('app.current_dj_id', true)
    );

-- Policy per il service role (per operazioni server-side)
CREATE POLICY "Service role can manage all push subscriptions" ON dj_push_subscriptions
    FOR ALL USING (
        -- Permetti accesso completo al service role
        auth.role() = 'service_role'
    );

-- Commenti per documentazione
COMMENT ON TABLE dj_push_subscriptions IS 'Memorizza le subscription push per i DJ del panel';
COMMENT ON COLUMN dj_push_subscriptions.dj_id IS 'Identificativo del DJ (deve corrispondere a DJ_PANEL_USER)';
COMMENT ON COLUMN dj_push_subscriptions.endpoint IS 'URL endpoint della push subscription (unico per browser/dispositivo)';
COMMENT ON COLUMN dj_push_subscriptions.p256dh IS 'Chiave pubblica p256dh per la crittografia';
COMMENT ON COLUMN dj_push_subscriptions.auth IS 'Token di autenticazione per la subscription';
COMMENT ON COLUMN dj_push_subscriptions.is_active IS 'Indica se la subscription è attualmente attiva';
COMMENT ON COLUMN dj_push_subscriptions.error_reason IS 'Motivo di disattivazione (es. subscription expired, invalid endpoint, etc.)';
