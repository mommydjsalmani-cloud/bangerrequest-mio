#!/usr/bin/env node

/**
 * Script per configurare il webhook con il nuovo bot
 */

import { readFileSync } from 'fs';

// Carica variabili da .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const TOKEN = envVars.TELEGRAM_BOT_TOKEN;
const SECRET = envVars.TELEGRAM_WEBHOOK_SECRET;
const BASE_URL = process.argv[2] || 'https://bangerrequest.vercel.app';

async function setupWebhook() {
  try {
    console.log('🔗 Configurazione webhook nuovo bot...');
    console.log(`   URL: ${BASE_URL}/api/telegram/webhook`);
    console.log(`   Secret: ${SECRET.substring(0, 8)}...`);
    
    // Rimuovi webhook esistente
    console.log('\n1️⃣ Rimozione webhook precedente...');
    const deleteResp = await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
    const deleteResult = await deleteResp.json();
    console.log(deleteResult.ok ? '   ✅ Webhook precedente rimosso' : '   ⚠️  Nessun webhook da rimuovere');
    
    // Imposta nuovo webhook
    console.log('\n2️⃣ Impostazione nuovo webhook...');
    const setResp = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${BASE_URL}/api/telegram/webhook`,
        secret_token: SECRET,
        max_connections: 40,
        allowed_updates: ['callback_query', 'message']
      })
    });
    
    const setResult = await setResp.json();
    
    if (setResult.ok) {
      console.log('   ✅ Webhook configurato con successo!');
    } else {
      console.log('   ❌ Errore:', setResult.description);
      return;
    }
    
    // Verifica webhook
    console.log('\n3️⃣ Verifica configurazione...');
    const infoResp = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const info = await infoResp.json();
    
    if (info.ok && info.result.url) {
      console.log('   ✅ URL:', info.result.url);
      console.log('   ✅ Pending:', info.result.pending_update_count || 0);
      console.log('   ✅ Last Error:', info.result.last_error_message || 'Nessuno');
      console.log('   ✅ Max Connections:', info.result.max_connections || 'N/A');
    }
    
    console.log('\n🎉 Configurazione completata!');
    console.log('\n🧪 Test webhook:');
    console.log(`   curl -X POST "${BASE_URL}/api/notify/test" \\`);
    console.log('        -H "x-dj-user: test" \\');
    console.log('        -H "x-dj-secret: 77"');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

setupWebhook();