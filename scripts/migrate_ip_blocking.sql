-- Script per aggiungere gestione blocco IP
-- Eseguire su Supabase SQL Editor

-- 1. Creare tabella per IP bloccati
CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by TEXT, -- Nome del DJ che ha bloccato
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aggiungere indice per performance
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- 3. Aggiungere campo client_ip alle tabelle esistenti per tracking
ALTER TABLE libere_requests ADD COLUMN IF NOT EXISTS client_ip INET;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS client_ip INET;

-- 4. RLS (Row Level Security) - solo lettura per ora
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- 5. Policy per permettere lettura (per check blocchi)
CREATE POLICY IF NOT EXISTS "Allow read blocked_ips for all" ON blocked_ips
    FOR SELECT USING (true);

-- 6. Policy per permettere insert/update/delete (per DJ che bloccano)
CREATE POLICY IF NOT EXISTS "Allow manage blocked_ips for authenticated" ON blocked_ips
    FOR ALL USING (true);

-- Query di test
-- SELECT * FROM blocked_ips;
-- INSERT INTO blocked_ips (ip_address, reason, blocked_by) VALUES ('192.168.1.100', 'Test block', 'DJ Test');