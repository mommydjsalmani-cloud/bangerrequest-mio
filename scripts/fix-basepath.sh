#!/bin/bash
# Script per ripristinare la configurazione corretta del basePath
# Esegui con: bash scripts/fix-basepath.sh

set -e

echo "🔧 Ripristino configurazione basePath..."

# 1. Verifica next.config.ts
echo ""
echo "1️⃣ Controllo next.config.ts..."
if grep -q "basePath: process.env.NODE_ENV === 'production' ? '/richiedi' : ''" next.config.ts; then
  echo "✅ next.config.ts corretto"
else
  echo "❌ next.config.ts NON corretto"
  echo "   Deve contenere: basePath: process.env.NODE_ENV === 'production' ? '/richiedi' : ''"
fi

# 2. Verifica apiPath.ts
echo ""
echo "2️⃣ Controllo src/lib/apiPath.ts..."
if grep -q "const BASE_PATH = process.env.NODE_ENV === 'production' ? '/richiedi' : ''" src/lib/apiPath.ts; then
  echo "✅ apiPath.ts corretto"
else
  echo "❌ apiPath.ts NON corretto"
  echo "   Deve contenere: const BASE_PATH = process.env.NODE_ENV === 'production' ? '/richiedi' : ''"
fi

# 3. Verifica .env.local
echo ""
echo "3️⃣ Controllo .env.local..."
if grep -q "^# NEXT_PUBLIC_BASE_PATH" .env.local || ! grep -q "NEXT_PUBLIC_BASE_PATH" .env.local; then
  echo "✅ .env.local corretto (NEXT_PUBLIC_BASE_PATH commentato o assente)"
else
  echo "⚠️  .env.local ha NEXT_PUBLIC_BASE_PATH attivo"
  echo "   Dovrebbe essere commentato: # NEXT_PUBLIC_BASE_PATH=/richiedi"
fi

# 4. Test endpoint locale (se server in esecuzione)
echo ""
echo "4️⃣ Test endpoint locale..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Server locale raggiungibile su /api/health"
else
  echo "⚠️  Server locale non risponde (potrebbe non essere avviato)"
  echo "   Avvia con: npm run dev"
fi

# 5. Riepilogo
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RIEPILOGO CONFIGURAZIONE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Sviluppo (localhost):   NO basePath (/api/...)"
echo "Produzione (Vercel):    basePath /richiedi (/richiedi/api/...)"
echo ""
echo "URL Sviluppo:"
echo "  - Login:    http://localhost:3000/dj/login"
echo "  - API:      http://localhost:3000/api/health"
echo ""
echo "URL Produzione:"
echo "  - Login:    https://www.mommydj.com/richiedi/dj/login"
echo "  - API:      https://www.mommydj.com/richiedi/api/health"
echo ""
echo "✅ Configurazione verificata!"
