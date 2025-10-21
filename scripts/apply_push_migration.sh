#!/bin/bash
# Script per applicare la migrazione delle notifiche push

echo "🚀 Applicando migrazione notifiche push..."

# Leggi il file SQL e eseguilo tramite Supabase CLI o tramite API
if [ -f "scripts/migrate_add_push_notifications.sql" ]; then
    echo "📄 Trovato file migrazione: scripts/migrate_add_push_notifications.sql"
    
    # Prova con supabase CLI se disponibile
    if command -v supabase &> /dev/null; then
        echo "🔧 Usando Supabase CLI..."
        supabase db reset --linked
    else
        echo "⚠️  Supabase CLI non trovato, usa il dashboard Supabase per applicare manualmente:"
        echo "📋 Copia e incolla questo SQL nel SQL Editor di Supabase:"
        echo "----------------------------------------"
        cat scripts/migrate_add_push_notifications.sql
        echo "----------------------------------------"
    fi
else
    echo "❌ File migrazione non trovato!"
    exit 1
fi

echo "✅ Migrazione completata (o pronta per essere applicata manualmente)"