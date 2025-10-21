#!/bin/bash

# Script per testare e configurare le credenziali DJ

BASE_URL="${BASE_URL:-https://bangerrequest-mio.vercel.app}"

echo "🔐 Test Credenziali DJ per BangerRequest"
echo "🌐 Base URL: $BASE_URL"
echo ""

# Test 1: Verifica che le variabili d'ambiente siano configurate
echo "1️⃣ Verifica configurazione variabili d'ambiente..."
auth_response=$(curl -s "$BASE_URL/api/health/auth")
echo "Response: $auth_response"

if echo "$auth_response" | grep -q '"haveUser":true' && echo "$auth_response" | grep -q '"haveSecret":true'; then
    echo "✅ Variabili d'ambiente DJ configurate su Vercel"
else
    echo "❌ Variabili d'ambiente DJ NON configurate su Vercel"
    echo ""
    echo "🔧 Soluzione:"
    echo "1. Vai su Vercel → Project Settings → Environment Variables"
    echo "2. Aggiungi:"
    echo "   DJ_PANEL_USER=mommy"
    echo "   DJ_PANEL_SECRET=<password-sicura>"
    echo "3. Redeploy l'applicazione"
    exit 1
fi

echo ""

# Test 2: Prova credenziali suggerite
echo "2️⃣ Test credenziali comuni..."

declare -A credentials=(
    ["mommy"]="mommy admin password secret BangerDJ2024! 123456"
    ["test"]="test 77 password"
    ["admin"]="admin password secret"
    ["dj"]="dj password secret"
)

found=false

for user in "${!credentials[@]}"; do
    for secret in ${credentials[$user]}; do
        echo "   Testando: $user / $secret"
        response=$(curl -s "$BASE_URL/api/libere/admin?action=sessions" \
            -H "x-dj-secret: $secret" \
            -H "x-dj-user: $user")
        
        if echo "$response" | grep -q '"ok":true'; then
            echo "   ✅ CREDENZIALI TROVATE!"
            echo "   👤 Username: $user"
            echo "   🔑 Password: $secret"
            echo ""
            echo "🎯 Usa queste credenziali nel pannello DJ:"
            echo "   URL: $BASE_URL/dj/login"
            echo "   Username: $user"
            echo "   Password: $secret"
            found=true
            break 2
        elif echo "$response" | grep -q '"error":"unauthorized"'; then
            # Credenziali sbagliate, continua
            continue
        else
            echo "   ⚠️  Errore imprevisto: $response"
        fi
    done
done

if [ "$found" = false ]; then
    echo "❌ Nessuna delle credenziali comuni funziona"
    echo ""
    echo "🔧 Possibili soluzioni:"
    echo ""
    echo "📝 Opzione 1 - Configura credenziali specifiche:"
    echo "   1. Vai su Vercel → bangerrequest-mio → Settings → Environment Variables"
    echo "   2. Modifica:"
    echo "      DJ_PANEL_USER = mommy"
    echo "      DJ_PANEL_SECRET = <password-che-preferisci>"
    echo "   3. Trigger redeploy:"
    echo "      git commit --allow-empty -m 'update credentials'"
    echo "      git push origin develop"
    echo ""
    echo "🔍 Opzione 2 - Trova credenziali attuali:"
    echo "   1. Controlla GitHub → Settings → Secrets → Actions"
    echo "   2. Verifica i valori di DJ_PANEL_SECRET e DJ_PANEL_USER"
    echo "   3. Usa quelli per il login"
    echo ""
    echo "📞 Opzione 3 - Contatta l'amministratore"
    echo "   Le credenziali sono configurate ma non sono quelle standard"
fi

echo ""
echo "🩺 Diagnostica Completa:"
echo "   • Salute Server: $(curl -s "$BASE_URL/api/health" | grep -o '"ok":[^,}]*' | head -1)"
echo "   • Auth Configurato: $(echo "$auth_response" | grep -o '"ok":[^,}]*')"
echo "   • Supabase: $(curl -s "$BASE_URL/api/health/supabase" | grep -o '"ok":[^,}]*')"
echo ""
echo "📖 Documentazione: docs/DJ_CREDENTIALS_ISSUE.md"