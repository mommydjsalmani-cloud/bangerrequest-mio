#!/usr/bin/env node

/**
 * Test del nuovo bot inviando un messaggio di prova
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
const CHAT_ID = envVars.TELEGRAM_CHAT_ID;

async function testBot() {
  try {
    console.log('🧪 Test nuovo bot Telegram...\n');
    
    // Test 1: Info bot
    console.log('1️⃣ Verifica info bot...');
    const meResp = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
    const me = await meResp.json();
    
    if (me.ok) {
      console.log(`   ✅ Bot: @${me.result.username}`);
      console.log(`   ✅ ID: ${me.result.id}`);
    } else {
      console.log('   ❌ Errore:', me.description);
      return;
    }
    
    // Test 2: Invio messaggio di prova
    console.log('\n2️⃣ Invio messaggio di prova...');
    const message = `🔄 <b>Test Nuovo Bot</b>

🤖 Bot rigenerato con successo!
📅 ${new Date().toLocaleString('it-IT')}

✅ Token aggiornato
✅ Chat ID confermato
✅ Connessione attiva

🔧 Ora configureremo il webhook...`;

    const sendResp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    const sendResult = await sendResp.json();
    
    if (sendResult.ok) {
      console.log('   ✅ Messaggio inviato con successo!');
      console.log(`   📱 Message ID: ${sendResult.result.message_id}`);
    } else {
      console.log('   ❌ Errore invio:', sendResult.description);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

testBot();