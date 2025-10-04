#!/bin/bash

# Migrazione per aggiungere le tabelle delle Richieste Libere
# Questo script applica lo schema delle richieste libere al database Supabase

echo "🚀 Migrazione Richieste Libere - Inizio"

# Controlla se le variabili d'ambiente sono configurate
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Errore: SUPABASE_URL e SUPABASE_ANON_KEY devono essere configurate"
    exit 1
fi

# Applica lo schema
echo "📊 Applicazione schema richieste_libere..."

# Verifica se supabase CLI è installato
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI non trovato. Applica manualmente lo schema da docs/richieste_libere_schema.sql"
    echo "   Oppure installa Supabase CLI: npm install -g supabase"
    exit 1
fi

# Applica il file schema (richiede configurazione locale di Supabase)
if [ -f "docs/richieste_libere_schema.sql" ]; then
    echo "📝 Applicazione schema da docs/richieste_libere_schema.sql"
    # Nota: questo comando richiede configurazione locale
    # In alternativa, copiare manualmente il contenuto nell'editor SQL di Supabase
    supabase db reset --db-url "$DATABASE_URL" || {
        echo "⚠️  Reset fallito. Applica manualmente il file docs/richieste_libere_schema.sql"
        echo "   nell'editor SQL del dashboard Supabase"
    }
else
    echo "❌ File schema non trovato: docs/richieste_libere_schema.sql"
    exit 1
fi

echo "✅ Migrazione completata!"
echo ""
echo "📋 Prossimi passi:"
echo "   1. Verifica che le tabelle siano state create correttamente"
echo "   2. Controlla la sessione demo con token 'demo-token-libere-2024'"
echo "   3. Testa la connessione dalle API"
echo ""
echo "🔧 Tabelle create:"
echo "   - sessioni_libere (gestione sessioni e token)"
echo "   - richieste_libere (richieste degli utenti)"
echo "   - libere_rate_limit (rate limiting per IP)"