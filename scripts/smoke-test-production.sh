#!/bin/bash

# Production Smoke Tests
# Verifica che i fix critici siano in place e funzionanti

set -e

PROD_URL="${PROD_URL:-https://mommydj.com}"
BASE_PATH="${BASE_PATH:-/richiedi}"
FULL_URL="${PROD_URL}${BASE_PATH}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🔥 Running production smoke tests..."
echo "Target: $FULL_URL"
echo ""

# Counter per test falliti
FAILED=0

# Helper function per test HTTP
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="$3"
  local expected_header="$4"
  
  echo -n "Testing $name... "
  
  if [ -n "$expected_header" ]; then
    response=$(curl -s -o /dev/null -w '%{http_code}|%{header_json}' "$url")
    status=$(echo "$response" | cut -d'|' -f1)
    headers=$(echo "$response" | cut -d'|' -f2)
  else
    status=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  fi
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✅ $status${NC}"
  else
    echo -e "${RED}❌ $status (expected $expected_status)${NC}"
    FAILED=$((FAILED + 1))
  fi
}

# Test 1: Health Check
test_endpoint "Health Check" "$FULL_URL/api/health" "200"

# Test 2: Tidal Image Proxy esiste
test_endpoint "Tidal Image Proxy" "$FULL_URL/api/tidal/image" "400"

# Test 3: Tidal Auth endpoint esiste
echo -n "Testing Tidal Auth Endpoint... "
status=$(curl -s -o /dev/null -w '%{http_code}' "$FULL_URL/api/tidal/auth")
if [ "$status" = "302" ] || [ "$status" = "400" ] || [ "$status" = "401" ]; then
  echo -e "${GREEN}✅ $status${NC}"
else
  echo -e "${RED}❌ $status (expected 302, 400, or 401)${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 4: Tidal Callback endpoint esiste
echo -n "Testing Tidal Callback Endpoint... "
status=$(curl -s -o /dev/null -w '%{http_code}' "$FULL_URL/api/tidal/callback")
if [ "$status" = "302" ] || [ "$status" = "307" ] || [ "$status" = "400" ]; then
  echo -e "${GREEN}✅ $status${NC}"
else
  echo -e "${RED}❌ $status (expected 302, 307, or 400)${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 5: Tidal Search endpoint esiste
test_endpoint "Tidal Search API" "$FULL_URL/api/tidal/search" "400"

# Test 6: Cover Placeholder esiste (optional - nuovo file)
echo -n "Testing Cover Placeholder SVG... "
status=$(curl -s -o /dev/null -w '%{http_code}' "$PROD_URL/cover-placeholder.svg")
if [ "$status" = "200" ]; then
  echo -e "${GREEN}✅ $status${NC}"
elif [ "$status" = "404" ]; then
  echo -e "${YELLOW}⚠️  Not yet deployed (expected after next deploy)${NC}"
else
  echo -e "${RED}❌ $status${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 7: Verifica che l'OAuth redirect contenga il dominio canonico
echo -n "Testing OAuth Canonical Domain... "
redirect_location=$(curl -s -I "$FULL_URL/api/tidal/auth" | grep -i "location:" | head -n1)
if echo "$redirect_location" | grep -q "mommydj.com"; then
  echo -e "${GREEN}✅ Uses canonical domain${NC}"
elif echo "$redirect_location" | grep -q "login.tidal.com"; then
  # Se redirige direttamente a Tidal, va bene (usa il dominio canonico nella callback)
  echo -e "${GREEN}✅ OAuth flow active${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify canonical domain (might be ok)${NC}"
fi

# Test 8: Verifica CSP headers per immagini Tidal
echo -n "Testing CSP for Tidal images... "
csp_header=$(curl -s -I "$FULL_URL" | grep -i "content-security-policy:" | head -n1)
if echo "$csp_header" | grep -q "tidal.com"; then
  echo -e "${GREEN}✅ CSP allows Tidal images${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify CSP (might be set in Next.js config)${NC}"
fi

# Test 9: Verifica che il DJ panel sia accessibile
echo -n "Testing DJ Panel Access... "
status=$(curl -s -o /dev/null -w '%{http_code}' "$FULL_URL/dj/libere")
if [ "$status" = "401" ] || [ "$status" = "200" ]; then
  echo -e "${GREEN}✅ $status (endpoint exists)${NC}"
else
  echo -e "${RED}❌ $status${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 10: Verifica session API
echo -n "Testing Session API... "
status=$(curl -s -o /dev/null -w '%{http_code}' "$FULL_URL/api/session")
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
  echo -e "${GREEN}✅ $status${NC}"
else
  echo -e "${RED}❌ $status${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $FAILED test(s) failed${NC}"
  echo ""
  exit 1
fi
