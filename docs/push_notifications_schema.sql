-- Supabase SQL for Push Notifications
-- Execute in Supabase SQL Editor

-- Create dj_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.dj_push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dj_id text NOT NULL,
    endpoint text UNIQUE NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_active 
ON public.dj_push_subscriptions(dj_id, is_active);

CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_endpoint 
ON public.dj_push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE public.dj_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role access
CREATE POLICY "allow_service_role_all" ON public.dj_push_subscriptions
FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to service role
GRANT ALL ON public.dj_push_subscriptions TO service_role;