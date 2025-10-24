#!/usr/bin/env node

/**
 * Script per debuggare webhook Telegram
 */

const TELEGRAM_BOT_TOKEN = '8432695702:AAEcn3epbPwg8N-2eUX1ERzJ9ME8rvZ8PpI';

async function debugWebhook() {
  try {
    console.log('🔍 Debug webhook Telegram...\n');
    
    // 1. Controllo info bot
    console.log('1️⃣ Controllo info bot...');
    const meResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const me = await meResp.json();
    console.log('   Bot:', me.result?.username || 'N/A');
    console.log('   ID:', me.result?.id || 'N/A\n');
    
    // 2. Controllo webhook
    console.log('2️⃣ Controllo webhook...');
    const webhookResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const webhook = await webhookResp.json();
    
    if (webhook.result?.url) {
      console.log('   URL:', webhook.result.url);
      console.log('   Pending:', webhook.result.pending_update_count || 0);
      console.log('   Last Error:', webhook.result.last_error_message || 'Nessuno');
      console.log('   Error Date:', webhook.result.last_error_date ? new Date(webhook.result.last_error_date * 1000).toLocaleString() : 'N/A');
    } else {
      console.log('   ❌ Webhook non configurato');
    }
    
    // 3. Controllo updates
    console.log('\n3️⃣ Controllo updates recenti...');
    const updatesResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=5`);
    const updates = await updatesResp.json();
    
    if (updates.result?.length > 0) {
      console.log(`   Trovati ${updates.result.length} updates recenti:`);
      updates.result.forEach((update, i) => {
        if (update.callback_query) {
          console.log(`   ${i+1}. Callback: ${update.callback_query.data} da ${update.callback_query.from?.username || 'N/A'}`);
        } else if (update.message) {
          console.log(`   ${i+1}. Messaggio: ${update.message.text || 'N/A'} da ${update.message.from?.username || 'N/A'}`);
        }
      });
    } else {
      console.log('   Nessun update recente');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

debugWebhook();