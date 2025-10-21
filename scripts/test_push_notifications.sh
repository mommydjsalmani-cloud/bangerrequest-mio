#!/bin/bash

# Script per testare il sistema di notifiche push
# Questo script verifica che tutti i componenti necessari siano presenti

echo "🔔 Test Sistema Notifiche Push - Banger Request"
echo "================================================"

# Verifica file necessari
echo "📁 Controllo file necessari..."

FILES=(
    "public/sw.js"
    "src/lib/push.ts"
    "src/components/NotificationManager.tsx"
    "src/app/api/push/subscribe/route.ts"
    "src/app/api/push/unsubscribe/route.ts"
    "src/app/api/push/send/route.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MANCANTE"
    fi
done

echo ""

# Verifica pacchetti NPM
echo "📦 Controllo dipendenze..."
if npm list web-push > /dev/null 2>&1; then
    echo "✅ web-push installato"
else
    echo "❌ web-push - NON INSTALLATO"
fi

echo ""

# Verifica configurazione
echo "⚙️ Controllo configurazione..."

# Controlla se manifest.json ha le configurazioni corrette
if [ -f "public/manifest.json" ]; then
    if grep -q "gcm_sender_id" public/manifest.json; then
        echo "✅ manifest.json configurato per push"
    else
        echo "⚠️ manifest.json potrebbe non essere configurato per push"
    fi
else
    echo "❌ manifest.json mancante"
fi

echo ""

# Mostra le chiavi VAPID generate
echo "🔑 Chiavi VAPID generate:"
echo "Queste variabili devono essere configurate in Vercel:"
echo ""
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=BINCMg0jeWl5eWgn7rZC-Cco_kd5CVGJTZ9VNGQUTVLlgMfPelKR24G21EEHmx-EjffTxbmmyMtZyPsOX973o74"
echo "VAPID_PRIVATE_KEY=ofzsFTO5vextrbW_krAC33rt5fJRlf0LLU_WNbokTHQ"
echo ""

echo "📋 Prossimi passi:"
echo "1. Aggiungi le chiavi VAPID alle variabili d'ambiente di Vercel"
echo "2. Fai il deploy dell'applicazione"
echo "3. Accedi al pannello DJ e attiva le notifiche"
echo "4. Testa inviando una richiesta dalla pagina pubblica"
echo ""

echo "🚀 Sistema di notifiche push pronto!"