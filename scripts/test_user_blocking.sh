#!/bin/bash

# Test completo del sistema di blocco utenti
# Questo script testa l'intero flusso: richiesta → blocco → feedback → sblocco

set -e

BASE_URL="http://localhost:3000"
TEST_USER="TestUser"
TEST_SONG="Test Song"
TEST_ARTIST="Test Artist"

echo "🧪 Test Sistema Blocco Utenti - Inizio"
echo "========================================"

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Funzione per log colorato
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Test 1: Creazione sessione
log_info "1. Creazione sessione di test..."
SETUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/libere/setup" \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Test Blocking System",
    "eventDate": "2024-12-19",
    "djName": "TestDJ",
    "djCode": "test123"
  }')

if echo "$SETUP_RESPONSE" | grep -q '"ok":true'; then
  SESSION_ID=$(echo "$SETUP_RESPONSE" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
  log_success "Sessione creata: $SESSION_ID"
else
  log_error "Errore creazione sessione: $SETUP_RESPONSE"
  exit 1
fi

# Test 2: Prima richiesta dell'utente (dovrebbe funzionare)
log_info "2. Prima richiesta dell'utente (dovrebbe essere accettata)..."
REQUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/libere" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"song_title\": \"$TEST_SONG\",
    \"artist_name\": \"$TEST_ARTIST\",
    \"requester_name\": \"$TEST_USER\",
    \"note\": \"Prima richiesta di test\"
  }")

if echo "$REQUEST_RESPONSE" | grep -q '"ok":true'; then
  REQUEST_ID=$(echo "$REQUEST_RESPONSE" | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)
  log_success "Prima richiesta creata: $REQUEST_ID"
else
  log_error "Errore prima richiesta: $REQUEST_RESPONSE"
  exit 1
fi

# Test 3: Ottenere le richieste dal pannello DJ per trovare l'IP
log_info "3. Recupero informazioni richiesta dal pannello DJ..."
DJ_RESPONSE=$(curl -s "$BASE_URL/api/libere/admin?session_id=$SESSION_ID" \
  -H "x-dj-user: TestDJ" \
  -H "x-dj-secret: test123")

if echo "$DJ_RESPONSE" | grep -q '"ok":true'; then
  USER_IP=$(echo "$DJ_RESPONSE" | grep -o '"client_ip":"[^"]*"' | head -1 | cut -d'"' -f4)
  log_success "IP utente trovato: $USER_IP"
else
  log_error "Errore recupero richieste DJ: $DJ_RESPONSE"
  exit 1
fi

# Test 4: Blocco dell'utente
log_info "4. Blocco dell'utente $TEST_USER (IP: $USER_IP)..."
BLOCK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/libere/blocking" \
  -H "Content-Type: application/json" \
  -H "x-dj-user: TestDJ" \
  -H "x-dj-secret: test123" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"ip\": \"$USER_IP\",
    \"requester_name\": \"$TEST_USER\",
    \"reason\": \"Test blocco automatico\"
  }")

if echo "$BLOCK_RESPONSE" | grep -q '"ok":true'; then
  BLOCK_ID=$(echo "$BLOCK_RESPONSE" | grep -o '"block_id":"[^"]*"' | cut -d'"' -f4)
  log_success "Utente bloccato: $BLOCK_ID"
else
  log_error "Errore blocco utente: $BLOCK_RESPONSE"
  exit 1
fi

# Test 5: Tentativo di seconda richiesta (dovrebbe essere rifiutata)
log_info "5. Tentativo seconda richiesta (dovrebbe essere rifiutata)..."
BLOCKED_REQUEST=$(curl -s -X POST "$BASE_URL/api/libere" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"song_title\": \"Another Song\",
    \"artist_name\": \"Another Artist\",
    \"requester_name\": \"$TEST_USER\",
    \"note\": \"Seconda richiesta - dovrebbe essere bloccata\"
  }")

if echo "$BLOCKED_REQUEST" | grep -q '"error":"Utente bloccato"'; then
  log_success "Richiesta correttamente bloccata"
else
  log_error "Richiesta non bloccata come previsto: $BLOCKED_REQUEST"
  exit 1
fi

# Test 6: Verifica lista utenti bloccati
log_info "6. Verifica lista utenti bloccati..."
BLOCKED_LIST=$(curl -s "$BASE_URL/api/libere/blocking?session_id=$SESSION_ID" \
  -H "x-dj-user: TestDJ" \
  -H "x-dj-secret: test123")

if echo "$BLOCKED_LIST" | grep -q "\"$TEST_USER\"" && echo "$BLOCKED_LIST" | grep -q "\"$USER_IP\""; then
  log_success "Utente trovato nella lista bloccati"
else
  log_error "Utente non trovato nella lista bloccati: $BLOCKED_LIST"
  exit 1
fi

# Test 7: Sblocco dell'utente
log_info "7. Sblocco dell'utente..."
UNBLOCK_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/libere/blocking" \
  -H "Content-Type: application/json" \
  -H "x-dj-user: TestDJ" \
  -H "x-dj-secret: test123" \
  -d "{
    \"block_id\": \"$BLOCK_ID\"
  }")

if echo "$UNBLOCK_RESPONSE" | grep -q '"ok":true'; then
  log_success "Utente sbloccato"
else
  log_error "Errore sblocco utente: $UNBLOCK_RESPONSE"
  exit 1
fi

# Test 8: Terza richiesta dopo sblocco (dovrebbe funzionare)
log_info "8. Terza richiesta dopo sblocco (dovrebbe essere accettata)..."
UNBLOCKED_REQUEST=$(curl -s -X POST "$BASE_URL/api/libere" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"song_title\": \"Final Song\",
    \"artist_name\": \"Final Artist\",
    \"requester_name\": \"$TEST_USER\",
    \"note\": \"Terza richiesta - dopo sblocco\"
  }")

if echo "$UNBLOCKED_REQUEST" | grep -q '"ok":true'; then
  FINAL_REQUEST_ID=$(echo "$UNBLOCKED_REQUEST" | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)
  log_success "Richiesta post-sblocco accettata: $FINAL_REQUEST_ID"
else
  log_error "Richiesta post-sblocco rifiutata: $UNBLOCKED_REQUEST"
  exit 1
fi

# Test 9: Verifica lista bloccati vuota
log_info "9. Verifica che la lista bloccati sia vuota..."
FINAL_BLOCKED_LIST=$(curl -s "$BASE_URL/api/libere/blocking?session_id=$SESSION_ID" \
  -H "x-dj-user: TestDJ" \
  -H "x-dj-secret: test123")

if echo "$FINAL_BLOCKED_LIST" | grep -q '"blocked_users":\[\]'; then
  log_success "Lista bloccati vuota come previsto"
else
  log_error "Lista bloccati non vuota: $FINAL_BLOCKED_LIST"
fi

echo ""
log_success "🎉 TUTTI I TEST COMPLETATI CON SUCCESSO!"
echo "========================================"
echo "✅ Creazione sessione"
echo "✅ Prima richiesta utente"
echo "✅ Blocco utente"
echo "✅ Rifiuto richiesta da utente bloccato"
echo "✅ Verifica lista bloccati"
echo "✅ Sblocco utente"
echo "✅ Accettazione richiesta post-sblocco"
echo "✅ Verifica lista bloccati vuota"
echo ""
log_info "Sistema di blocco utenti completamente funzionante! 🚀"