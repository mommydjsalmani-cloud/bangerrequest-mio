-- Migration: Add push notifications support
-- Description: Create table for DJ push notification subscriptions

CREATE TABLE IF NOT EXISTS dj_push_subscriptions (
    id SERIAL PRIMARY KEY,
    dj_user VARCHAR(50) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_notification_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one active subscription per DJ per endpoint
    UNIQUE(dj_user, endpoint)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_user_active 
ON dj_push_subscriptions(dj_user, is_active) 
WHERE is_active = true;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_created_at 
ON dj_push_subscriptions(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dj_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_dj_push_subscriptions_updated_at ON dj_push_subscriptions;
CREATE TRIGGER update_dj_push_subscriptions_updated_at
    BEFORE UPDATE ON dj_push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_dj_push_subscriptions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE dj_push_subscriptions IS 'Stores push notification subscriptions for DJ users';
COMMENT ON COLUMN dj_push_subscriptions.dj_user IS 'DJ username who subscribed to notifications';
COMMENT ON COLUMN dj_push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN dj_push_subscriptions.p256dh_key IS 'Public key for push message encryption';
COMMENT ON COLUMN dj_push_subscriptions.auth_key IS 'Authentication secret for push messages';
COMMENT ON COLUMN dj_push_subscriptions.is_active IS 'Whether this subscription is currently active';
COMMENT ON COLUMN dj_push_subscriptions.last_notification_at IS 'Timestamp of last notification sent to this subscription';