#!/bin/bash
# Test per verificare duplicati e evidenziazione

echo "🧪 TESTING DUPLICATE LOGIC"
echo "=========================="

cd /workspaces/bangerrequest-mio

# Setup test environment
export DJ_PANEL_SECRET="test-secret"
export DJ_PANEL_USER="test-user"

# Avvia il server in background per test
npm run dev &
SERVER_PID=$!
echo "Server avviato con PID: $SERVER_PID"

# Aspetta che il server sia pronto
sleep 5

# Funzione per creare richieste
create_request() {
    local title="$1"
    local artists="$2"
    local event_code="$3"
    local track_id="$4"
    
    curl -s -X POST "http://localhost:3000/api/requests" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"$title\",
            \"artists\": \"$artists\",
            \"event_code\": \"$event_code\",
            \"track_id\": \"$track_id\",
            \"duration_ms\": 185000
        }"
}

# Crea evento test
echo "📅 Creando evento test..."
curl -s -X POST "http://localhost:3000/api/events" \
    -H "Content-Type: application/json" \
    -H "x-dj-secret: test-secret" \
    -H "x-dj-user: test-user" \
    -d '{"name": "Test Duplicates", "code": "TESTDUP"}'

echo ""
echo "🎵 Creando 3 richieste identiche..."

# Prima richiesta
echo "1️⃣ Prima richiesta..."
create_request "Test Song" "Test Artist" "TESTDUP" "track123" | jq '.'

sleep 1

# Seconda richiesta (duplicato)  
echo "2️⃣ Seconda richiesta (duplicato)..."
create_request "Test Song" "Test Artist" "TESTDUP" "track123" | jq '.'

sleep 1

# Terza richiesta (duplicato)
echo "3️⃣ Terza richiesta (duplicato)..."
create_request "Test Song" "Test Artist" "TESTDUP" "track123" | jq '.'

echo ""
echo "📋 Lista completa richieste:"
curl -s "http://localhost:3000/api/requests?event_code=TESTDUP" | jq '.requests | map({id: .id, title: .title, created_at: .created_at})'

# Ferma il server
kill $SERVER_PID

echo ""
echo "✅ Test completato!"
echo "🔍 Verifica nel browser se tutti e 3 gli elementi sono visibili"
echo "🟠 E se la 2a e 3a richiesta hanno il contorno arancione"