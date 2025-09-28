#!/bin/bash
# Script per testare duplicati e durata in produzione

# Configura le tue variabili
APP_URL="${1:-https://bangerrequest-mio.vercel.app}"
DJ_SECRET="${2:-TUO_SECRET}"
DJ_USER="${3:-TUO_USER}"

echo "🧪 Testing su: $APP_URL"
echo

# 1. Test salute API
echo "1️⃣ Test health endpoint..."
curl -s "$APP_URL/api/health" | jq -r '.ok // "ERRORE"'
echo

# 2. Crea evento test
echo "2️⃣ Creazione evento TEST..."
EVENT_RESPONSE=$(curl -s -X POST "$APP_URL/api/events" \
  -H "x-dj-secret: $DJ_SECRET" \
  -H "x-dj-user: $DJ_USER" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Duplicati","code":"TESTDUP"}')

echo "$EVENT_RESPONSE" | jq '.'
echo

# 3. Prima richiesta con durata
echo "3️⃣ Prima richiesta..."
FIRST_REQ=$(curl -s -X POST "$APP_URL/api/requests" \
  -H 'Content-Type: application/json' \
  -d '{"event_code":"TESTDUP","track_id":"testtrack123","title":"Canzone Test","artists":"Artista Test","duration_ms":185000}')

echo "$FIRST_REQ" | jq '.'
echo

# 4. Seconda richiesta (duplicato)
echo "4️⃣ Seconda richiesta (duplicato)..."
SECOND_REQ=$(curl -s -X POST "$APP_URL/api/requests" \
  -H 'Content-Type: application/json' \
  -d '{"event_code":"TESTDUP","track_id":"testtrack123","title":"Canzone Test","artists":"Artista Test","duration_ms":185000}')

echo "$SECOND_REQ" | jq '.'
echo

# 5. Lista richieste
echo "5️⃣ Lista richieste per evento TESTDUP..."
curl -s "$APP_URL/api/requests?event_code=TESTDUP" | jq '.requests | length as $total | "Totale richieste: \($total)" | . + "\n" + (map("\(.id) - \(.title) - created: \(.created_at) - duration_ms: \(.duration_ms // "null")") | join("\n"))'
echo

echo "✅ Test completato!"
echo "🎯 Vai su $APP_URL/dj e verifica:"
echo "   - Highlight giallo sull'ultima card duplicata"
echo "   - Durata 3:05 visibile"
echo "   - Badge 'dup latest'"