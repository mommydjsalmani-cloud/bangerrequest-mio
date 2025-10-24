#!/usr/bin/env node

/**
 * Script per ottenere il chat ID con il nuovo bot
 */

// Carica manualmente le variabili da .env.local
import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const TOKEN = envVars.TELEGRAM_BOT_TOKEN;

if (!TOKEN || TOKEN === 'IL_TUO_NUOVO_TOKEN_QUI') {
  console.log('❌ Token non trovato o non aggiornato nel file .env.local');
  console.log('   Token attuale:', TOKEN ? TOKEN.substring(0, 20) + '...' : 'undefined');
  process.exit(1);
}

console.log('✅ Token caricato:', TOKEN.substring(0, 20) + '...');

async function getChatId() {
  try {
    console.log('🔍 Cercando messaggi recenti...\n');
    
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
    const data = await response.json();
    
    if (!data.ok) {
      console.log('❌ Errore:', data.description);
      return;
    }
    
    if (data.result.length === 0) {
      console.log('📱 ISTRUZIONI:');
      console.log('1. Vai su Telegram');
      console.log('2. Cerca il tuo nuovo bot');
      console.log('3. Scrivi /start');
      console.log('4. Riesegui questo script');
      return;
    }
    
    const updates = data.result;
    console.log('📋 Messaggi trovati:');
    
    updates.forEach((update, i) => {
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || 'N/A';
        const name = msg.from.first_name || 'N/A';
        
        console.log(`\n${i+1}. Chat ID: ${chatId}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Username: @${username}`);
        console.log(`   Nome: ${name}`);
        console.log(`   Messaggio: ${msg.text || 'N/A'}`);
      }
    });
    
    // Prendi l'ultimo messaggio
    const lastUpdate = updates[updates.length - 1];
    if (lastUpdate.message) {
      const chatId = lastUpdate.message.chat.id;
      const userId = lastUpdate.message.from.id;
      
      console.log('\n✅ CONFIGURAZIONE CONSIGLIATA:');
      console.log(`TELEGRAM_CHAT_ID=${chatId}`);
      console.log(`TELEGRAM_USER_ID=${userId}`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

getChatId();