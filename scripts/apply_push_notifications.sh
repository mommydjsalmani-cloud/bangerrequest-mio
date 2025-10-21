#!/bin/bash

# Script per applicare lo schema delle push notifications

set -e

echo "🚀 Applicando schema push notifications..."

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ ERRORE: Variabili d'ambiente SUPABASE_URL e SUPABASE_ANON_KEY richieste"
    echo "Esempio:"
    echo "export SUPABASE_URL='https://your-project.supabase.co'"
    echo "export SUPABASE_ANON_KEY='your-anon-key'"
    exit 1
fi

# Apply the push notifications schema
echo "📊 Creando tabella dj_push_subscriptions..."

curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "-- Tabella per memorizzare le push subscriptions dei DJ\nCREATE TABLE IF NOT EXISTS dj_push_subscriptions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  dj_id VARCHAR(255) NOT NULL,\n  endpoint TEXT NOT NULL UNIQUE,\n  p256dh TEXT NOT NULL,\n  auth TEXT NOT NULL,\n  user_agent TEXT,\n  is_active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Indici per ottimizzare le query\nCREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_id ON dj_push_subscriptions(dj_id);\nCREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_active ON dj_push_subscriptions(is_active);\nCREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_endpoint ON dj_push_subscriptions(endpoint);\n\n-- RLS policies\nALTER TABLE dj_push_subscriptions ENABLE ROW LEVEL SECURITY;\n\n-- Policy per permettere la lettura tramite service role\nCREATE POLICY \"Allow service role to manage push subscriptions\" ON dj_push_subscriptions\n  FOR ALL USING (auth.role() = '\''service_role'\'');\n\n-- Policy per permettere inserimenti autenticati (dai DJ)\nCREATE POLICY \"Allow authenticated DJ to insert own subscriptions\" ON dj_push_subscriptions\n  FOR INSERT WITH CHECK (true);"
  }' || {
    echo "❌ Fallimento creazione tabella tramite API REST"
    echo "💡 Soluzione alternativa: copia il contenuto di docs/push_notifications_schema.sql e incollalo nel SQL Editor di Supabase"
    exit 1
  }

echo "✅ Schema push notifications applicato con successo!"
echo ""
echo "🔑 Passi successivi:"
echo "1. Imposta le variabili d'ambiente VAPID su Vercel:"
echo "   - NEXT_PUBLIC_VAPID_PUBLIC_KEY"
echo "   - VAPID_PRIVATE_KEY" 
echo "   - VAPID_SUBJECT"
echo "2. Vedi docs/VAPID_KEYS.md per i valori"
echo "3. Testa le notifiche dal pannello DJ"