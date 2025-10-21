#!/bin/bash

# Test script per verificare push notifications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🧪 Test Push Notifications Sistema"
echo "📍 Base URL: $BASE_URL"
echo ""

# Check required environment variables
if [ -z "$DJ_PANEL_SECRET" ] || [ -z "$DJ_PANEL_USER" ]; then
    echo "❌ ERRORE: Variabili d'ambiente DJ_PANEL_SECRET e DJ_PANEL_USER richieste"
    echo "Esempio:"
    echo "export DJ_PANEL_SECRET='your-secret'"
    echo "export DJ_PANEL_USER='your-username'"
    exit 1
fi

# Test 1: Check push API endpoints exist
echo "🔍 Test 1: Verifica endpoint API push..."

for endpoint in "subscribe" "unsubscribe" "send"; do
    echo "  Testando /api/push/$endpoint..."
    
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$BASE_URL/api/push/$endpoint" \
        -H "Content-Type: application/json" \
        -H "x-dj-secret: $DJ_PANEL_SECRET" \
        -H "x-dj-user: $DJ_PANEL_USER" \
        -d '{}')
    
    if [ "$response" != "000" ]; then
        echo "  ✅ $endpoint endpoint raggiungibile (HTTP $response)"
    else
        echo "  ❌ $endpoint endpoint non raggiungibile"
        exit 1
    fi
done

# Test 2: Test send notification (should handle empty subscriptions gracefully)
echo ""
echo "📤 Test 2: Test invio notifica..."

response=$(curl -s "$BASE_URL/api/push/send" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-dj-secret: $DJ_PANEL_SECRET" \
    -H "x-dj-user: $DJ_PANEL_USER" \
    -d '{
        "notification": {
            "title": "🧪 Test Push Notification",
            "body": "Test delle notifiche push dal sistema BangerRequest",
            "icon": "/icon-192.png",
            "data": {
                "action": "test",
                "url": "/dj/libere"
            }
        }
    }')

echo "Response: $response"

# Check if response contains expected fields
if echo "$response" | grep -q '"ok":true'; then
    echo "✅ Test invio notifica superato"
else
    echo "❌ Test invio notifica fallito"
    echo "Response: $response"
fi

# Test 3: Check service worker file
echo ""
echo "🔧 Test 3: Verifica service worker..."

sw_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/sw.js")

if [ "$sw_response" = "200" ]; then
    echo "✅ Service worker disponibile (/sw.js)"
else
    echo "❌ Service worker non trovato (HTTP $sw_response)"
fi

# Test 4: Check VAPID public key
echo ""
echo "🔑 Test 4: Verifica VAPID public key..."

# Try to get VAPID public key from API or environment
if [ -n "$NEXT_PUBLIC_VAPID_PUBLIC_KEY" ]; then
    echo "✅ VAPID public key trovata in environment: ${NEXT_PUBLIC_VAPID_PUBLIC_KEY:0:20}..."
else
    echo "⚠️  VAPID public key non trovata in environment"
    echo "   Assicurati di aver impostato NEXT_PUBLIC_VAPID_PUBLIC_KEY"
fi

# Test 5: Check push subscription integration with libere API
echo ""
echo "🎵 Test 5: Verifica integrazione con richieste libere..."

# This is a basic check to see if the libere API loads without errors
libere_response=$(curl -s -w "%{http_code}" -o /dev/null \
    "$BASE_URL/api/libere/admin?action=sessions" \
    -H "x-dj-secret: $DJ_PANEL_SECRET" \
    -H "x-dj-user: $DJ_PANEL_USER")

if [ "$libere_response" = "200" ]; then
    echo "✅ API libere integrazione OK"
else
    echo "⚠️  API libere potrebbe avere problemi (HTTP $libere_response)"
fi

echo ""
echo "🎯 Test Summary:"
echo "   • API push endpoints: ✅"
echo "   • Service worker: $([ "$sw_response" = "200" ] && echo "✅" || echo "❌")"
echo "   • VAPID keys: $([ -n "$NEXT_PUBLIC_VAPID_PUBLIC_KEY" ] && echo "✅" || echo "⚠️")"
echo "   • Libere integration: $([ "$libere_response" = "200" ] && echo "✅" || echo "⚠️")"
echo ""
echo "📋 Passi per completare il setup:"
echo "   1. Applica schema database: ./scripts/apply_push_notifications.sh"
echo "   2. Configura VAPID keys su Vercel (vedi docs/VAPID_KEYS.md)"
echo "   3. Testa dal pannello DJ su dispositivo reale"
echo "   4. Verifica notifiche su Android Chrome e iOS PWA"
