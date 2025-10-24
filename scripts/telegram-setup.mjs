#!/usr/bin/env node
// Script helper per configurazione Telegram Bot
// Uso: node scripts/telegram-setup.mjs <BOT_TOKEN>

const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('❌ Specifica il bot token: node scripts/telegram-setup.mjs <TOKEN>');
  process.exit(1);
}

console.log('🤖 Configurazione Telegram Bot per Banger Request\n');

// Step 1: Test bot token
async function testBot() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
    const data = await res.json();
    
    if (!data.ok) {
      console.error('❌ Token non valido:', data.description);
      return false;
    }
    
    console.log('✅ Bot verificato:');
    console.log(`   Nome: ${data.result.first_name}`);
    console.log(`   Username: @${data.result.username}`);
    console.log(`   ID: ${data.result.id}\n`);
    return true;
  } catch (e) {
    console.error('❌ Errore connessione Telegram:', e.message);
    return false;
  }
}

// Step 2: Ottieni chat updates per trovare chat ID
async function getChatIds() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
    const data = await res.json();
    
    if (!data.ok) {
      console.error('❌ Errore getUpdates:', data.description);
      return;
    }
    
    const chats = new Set();
    const users = new Set();
    
    data.result.forEach(update => {
      if (update.message) {
        const chat = update.message.chat;
        const from = update.message.from;
        
        chats.add(`${chat.id} (${chat.type}: ${chat.title || chat.first_name || 'N/A'})`);
        users.add(`${from.id} (${from.username || from.first_name || 'N/A'})`);
      }
    });
    
    console.log('💬 Chat trovate (manda un messaggio al bot per vederle qui):');
    if (chats.size === 0) {
      console.log('   ⚠️  Nessuna chat trovata. Manda "/start" al bot o aggiungilo a un gruppo\n');
    } else {
      chats.forEach(chat => console.log(`   ${chat}`));
      console.log('');
    }
    
    console.log('👥 Utenti trovati:');
    if (users.size === 0) {
      console.log('   ⚠️  Nessun utente trovato. Manda "/start" al bot\n');
    } else {
      users.forEach(user => console.log(`   ${user}`));
      console.log('');
    }
    
  } catch (e) {
    console.error('❌ Errore getUpdates:', e.message);
  }
}

// Step 3: Genera esempio configurazione
function printConfig() {
  const webhookSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  console.log('⚙️  Configurazione Vercel Environment Variables:\n');
  console.log('ENABLE_TELEGRAM_NOTIFICATIONS=true');
  console.log(`TELEGRAM_BOT_TOKEN=${TOKEN}`);
  console.log('TELEGRAM_CHAT_ID=SOSTITUISCI_CON_CHAT_ID_SOPRA');
  console.log('# TELEGRAM_THREAD_ID=123 # opzionale per topic nei supergruppi');
  console.log('DJ_PANEL_URL=https://bangerrequest.vercel.app/dj');
  console.log(`TELEGRAM_WEBHOOK_SECRET=${webhookSecret}`);
  console.log('ALLOWED_TELEGRAM_USER_IDS=SOSTITUISCI_CON_USER_ID_SOPRA');
  console.log('');
  
  console.log('📝 Prossimi passi:');
  console.log('1. Manda "/start" al bot o aggiungilo a un gruppo');
  console.log('2. Rilancia questo script per vedere chat/user ID');
  console.log('3. Configura le variabili ENV su Vercel');
  console.log('4. Imposta webhook: node scripts/set-webhook.mjs <DOMAIN>');
  console.log('5. Testa: POST /api/notify/test con credenziali DJ');
}

// Esegui setup
async function main() {
  const botOk = await testBot();
  if (!botOk) return;
  
  await getChatIds();
  printConfig();
}

main().catch(console.error);