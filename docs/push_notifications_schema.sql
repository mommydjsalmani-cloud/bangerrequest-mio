-- Push Notifications Subscription Schema
-- Tabella per persistere le subscription push dei DJ

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_user TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indici per performance
  UNIQUE(dj_user, endpoint)
);

-- Indice per query veloci per DJ
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_dj_user ON push_subscriptions(dj_user);

-- Indice per cleanup automatico delle subscription vecchie
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Funzione per pulire subscription vecchie (chiamabile manualmente o via cron)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions 
  WHERE last_used_at < now() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commenti per documentazione
COMMENT ON TABLE push_subscriptions IS 'Subscription browser per notifiche push ai DJ';
COMMENT ON COLUMN push_subscriptions.dj_user IS 'Username del DJ (es. dj-anonymous per utenti non autenticati)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL endpoint FCM/browser per push';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Chiave pubblica p256dh per crittografia';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Chiave auth per autenticazione';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Ultimo utilizzo (per cleanup automatico)';
