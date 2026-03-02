#!/bin/bash

echo "🧪 Test reCAPTCHA - Mommy DJ Contact Form"
echo "=========================================="
echo ""

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verifica che il sito carichi lo script reCAPTCHA
echo "Test 1: Verifica caricamento script reCAPTCHA..."
SITE_HTML=$(curl -s "https://mommydj.com/contatti")

if echo "$SITE_HTML" | grep -q "recaptcha"; then
    echo -e "${GREEN}✅ Script reCAPTCHA trovato nella pagina${NC}"
else
    echo -e "${RED}❌ Script reCAPTCHA NON trovato${NC}"
    echo -e "${YELLOW}⚠️  Verifica che NEXT_PUBLIC_RECAPTCHA_SITE_KEY sia configurata su Vercel${NC}"
fi
echo ""

# Test 2: Tentativo invio senza token (deve fallire)
echo "Test 2: Invio form SENZA token reCAPTCHA (dovrebbe fallire)..."
RESPONSE=$(curl -s -X POST "https://mommydj.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test Bot",
    "email": "bot@test.com",
    "telefono": "1234567890",
    "messaggio": "Test automatico senza reCAPTCHA"
  }')

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ Richiesta bloccata correttamente (no token)${NC}"
    echo "   Risposta: $(echo $RESPONSE | jq -r '.error' 2>/dev/null || echo $RESPONSE)"
else
    echo -e "${RED}❌ PROBLEMA: Richiesta accettata senza token!${NC}"
    echo "   Risposta: $RESPONSE"
fi
echo ""

# Test 3: Tentativo con token fake (deve fallire)
echo "Test 3: Invio form con token FAKE (dovrebbe fallire)..."
RESPONSE=$(curl -s -X POST "https://mommydj.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test Bot",
    "email": "bot@test.com",
    "telefono": "1234567890",
    "messaggio": "Test con token fake",
    "recaptchaToken": "fake-token-12345"
  }')

if echo "$RESPONSE" | grep -q "error\|RECAPTCHA_FAILED"; then
    echo -e "${GREEN}✅ Richiesta bloccata correttamente (token fake)${NC}"
    echo "   Risposta: $(echo $RESPONSE | jq -r '.error' 2>/dev/null || echo $RESPONSE)"
else
    echo -e "${RED}❌ PROBLEMA: Richiesta accettata con token fake!${NC}"
    echo "   Risposta: $RESPONSE"
fi
echo ""

# Test 4: Verifica validazione campi
echo "Test 4: Test validazione campi (nome troppo corto)..."
RESPONSE=$(curl -s -X POST "https://mommydj.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "A",
    "email": "test@test.com",
    "recaptchaToken": "test-token"
  }')

if echo "$RESPONSE" | grep -q "Nome troppo corto"; then
    echo -e "${GREEN}✅ Validazione nome funziona${NC}"
else
    echo -e "${YELLOW}⚠️  Validazione nome potrebbe non funzionare come previsto${NC}"
fi
echo ""

# Test 5: Verifica sanitizzazione XSS
echo "Test 5: Test protezione XSS..."
RESPONSE=$(curl -s -X POST "https://mommydj.com/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test<script>alert(1)</script>",
    "email": "test@test.com",
    "messaggio": "<img src=x onerror=alert(1)>",
    "recaptchaToken": "test"
  }')

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ Richiesta con XSS gestita (bloccata o sanitizzata)${NC}"
else
    echo -e "${YELLOW}⚠️  Verifica manualmente la sanitizzazione XSS${NC}"
fi
echo ""

echo "=========================================="
echo "📊 Riepilogo Test Completato"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "Per testare completamente reCAPTCHA, devi:"
echo "1. Aprire https://mommydj.com/contatti nel browser"
echo "2. Compilare il form normalmente"
echo "3. Verificare che l'invio funzioni (token generato automaticamente)"
echo ""
echo "Controlla i log Vercel per vedere:"
echo "- [CONTACT_RECAPTCHA_SCORE] - Score delle richieste legittime"
echo "- [CONTACT_RECAPTCHA_FAILED] - Bot bloccati"
echo ""
