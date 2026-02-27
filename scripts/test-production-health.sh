#!/bin/bash
# Test production health check (simula GitHub Actions workflow)

PROD_URL="https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app"

echo "🔍 Checking health endpoints..."
echo "Production URL: ${PROD_URL}"
echo ""

# Check main health endpoint
echo "Checking ${PROD_URL}/api/health..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/health" || echo "000")
if [ "$response" = "200" ]; then
  echo "✅ Main health check passed"
else
  echo "❌ Main health check failed (HTTP $response)"
  exit 1
fi

# Check Supabase health
echo "Checking ${PROD_URL}/api/health/supabase..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/health/supabase" || echo "000")
if [ "$response" = "200" ]; then
  echo "✅ Supabase health check passed"
else
  echo "⚠️ Supabase health check failed (HTTP $response)"
fi

# Check Deezer health
echo "Checking ${PROD_URL}/api/deezer/health..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/deezer/health" || echo "000")
if [ "$response" = "200" ]; then
  echo "✅ Deezer health check passed"
else
  echo "⚠️ Deezer health check failed (HTTP $response)"
fi

# Check main page loads
echo "Checking ${PROD_URL}/..."
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/" || echo "000")
if [ "$response" = "200" ]; then
  echo "✅ Homepage loads successfully"
else
  echo "❌ Homepage failed to load (HTTP $response)"
  exit 1
fi

echo ""
echo "🎉 Health check completed successfully!"
echo ""
echo "Running detailed health check..."
node scripts/check_health.cjs "${PROD_URL}/api/health/supabase"
