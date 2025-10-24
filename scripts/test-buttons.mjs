#!/usr/bin/env node

/**
 * Test diretto per inviare un messaggio con pulsanti e vedere se il webhook funziona
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

async function testButtons() {
  try {
    console.log('🧪 Test pulsanti Telegram...\n');
    
    const testId = 'test-' + Date.now();
    const message = `🧪 <b>TEST PULSANTI</b>

🎤 <b>Canzone:</b> Test Song
👤 <b>Artista:</b> Test Artist  
👤 <b>Da:</b> Test User
📅 ${new Date().toLocaleString('it-IT')}

<i>Clicca un pulsante per testare il webhook!</i>`;

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Accetta Test', callback_data: `accept:${testId}` },
        { text: '❌ Rifiuta Test', callback_data: `reject:${testId}` }
      ]]
    };

    console.log('📤 Invio messaggio con pulsanti...');
    console.log('   Test ID:', testId);
    
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: keyboard
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Messaggio inviato!');
      console.log('   Message ID:', result.result.message_id);
      console.log('\n🔍 Ora clicca i pulsanti e controlla se il webhook riceve le chiamate!');
      console.log('\n📋 Callback data che dovrebbero arrivare:');
      console.log(`   - accept:${testId}`);
      console.log(`   - reject:${testId}`);
    } else {
      console.log('❌ Errore:', result.description);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

testButtons();