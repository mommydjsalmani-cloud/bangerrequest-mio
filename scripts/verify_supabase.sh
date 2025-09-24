#!/usr/bin/env bash
# Verifica rapida che l'app parli con Supabase e che le variabili d'ambiente siano settate.
# Uso: ./scripts/verify_supabase.sh http://localhost:3000

BASE_URL=${1:-http://localhost:3000}
set -euo pipefail

echo "Checking health endpoint at ${BASE_URL}/api/health/supabase"
HTTP_STATUS=$(curl -s -o /dev/stderr -w "%{http_code}" "${BASE_URL}/api/health/supabase" || true)

echo "HTTP status: ${HTTP_STATUS}"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Supabase appears configured and reachable (200)."
else
  echo "Supabase not configured or health check failed. If working locally, set .env.local from .env.local.example with Supabase keys."
  exit 1
fi
