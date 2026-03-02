#!/bin/bash

echo "🧪 Test Rate Limiting - Mommy DJ Contact Form"
echo "=============================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Test: Invio 6 richieste rapide (limite: 5 richieste/10min)"
echo ""

for i in {1..6}; do
  echo -n "Richiesta $i: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://www.mommydj.com/api/contact" \
    -H "Content-Type: application/json" \
    -d "{
      \"nome\": \"Test Rate Limit $i\",
      \"email\": \"test$i@example.com\",
      \"recaptchaToken\": \"test-token-$i\",
      \"website\": \"\"
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo -e "${RED}❌ BLOCCATA (429 - Rate Limit)${NC}"
    echo "   Risposta: $(echo $BODY | jq -r '.error' 2>/dev/null || echo $BODY)"
    RETRY_AFTER=$(echo $BODY | jq -r '.retryAfter' 2>/dev/null)
    [ "$RETRY_AFTER" != "null" ] && echo "   Riprova tra: $RETRY_AFTER minuti"
  elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${YELLOW}⚠️  Bloccata da altra protezione (reCAPTCHA/Honeypot/Spam)${NC}"
  elif [ "$HTTP_CODE" = "400" ]; then
    echo -e "${YELLOW}⚠️  Validazione fallita${NC}"
  else
    echo -e "${GREEN}✅ ACCETTATA ($HTTP_CODE)${NC}"
  fi
  
  sleep 0.5
done

echo ""
echo "=============================================="
echo "📊 Risultato atteso:"
echo "   - Richieste 1-5: ✅ Accettate (o bloccate da reCAPTCHA)"
echo "   - Richiesta 6+:  ❌ Bloccate con 429 Rate Limit"
echo ""
echo "Controlla gli headers per vedere:"
echo "   X-RateLimit-Limit: 5"
echo "   X-RateLimit-Remaining: numero richieste rimanenti"
echo "   X-RateLimit-Reset: quando si resetta il contatore"
echo ""
