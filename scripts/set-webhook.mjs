#!/usr/bin/env node
// Script per impostare webhook Telegram
// Uso: node scripts/set-webhook.mjs <DOMAIN> [BOT_TOKEN] [WEBHOOK_SECRET]

const DOMAIN = process.argv[2];
const TOKEN = process.argv[3] || process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.argv[4] || process.env.TELEGRAM_WEBHOOK_SECRET;

if (!DOMAIN) {
  console.error('❌ Specifica il dominio: node scripts/set-webhook.mjs https://bangerrequest.vercel.app');
  process.exit(1);
}

if (!TOKEN) {
  console.error('❌ TOKEN mancante. Passa come argomento o imposta TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

if (!SECRET) {
  console.error('❌ SECRET mancante. Passa come argomento o imposta TELEGRAM_WEBHOOK_SECRET');
  process.exit(1);
}

async function setWebhook() {
  const webhookUrl = `${DOMAIN.replace(/\/$/, '')}/api/telegram/webhook`;
  
  console.log('🔗 Impostazione webhook Telegram...');
  console.log(`   URL: ${webhookUrl}`);
  console.log(`   Secret: ${SECRET.substring(0, 8)}...`);
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      console.log('✅ Webhook impostato con successo!');
      console.log(`   Descrizione: ${data.description || 'N/A'}`);
    } else {
      console.error('❌ Errore webhook:', data.description);
    }
  } catch (e) {
    console.error('❌ Errore rete:', e.message);
  }
}

async function getWebhookInfo() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const data = await res.json();
    
    if (data.ok) {
      console.log('\n📋 Info webhook corrente:');
      console.log(`   URL: ${data.result.url || 'Nessuno'}`);
      console.log(`   Pending: ${data.result.pending_update_count || 0}`);
      console.log(`   Last Error: ${data.result.last_error_message || 'Nessuno'}`);
      console.log(`   Max Connections: ${data.result.max_connections || 'N/A'}`);
    }
  } catch (e) {
    console.error('❌ Errore getWebhookInfo:', e.message);
  }
}

async function main() {
  await setWebhook();
  await getWebhookInfo();
  
  console.log('\n🧪 Test webhook:');
  console.log(`   curl -X POST "${DOMAIN}/api/notify/test" \\`);
  console.log(`        -H "x-dj-user: ${process.env.DJ_PANEL_USER || 'DJ_USER'}" \\`);
  console.log(`        -H "x-dj-secret: ${process.env.DJ_PANEL_SECRET || 'DJ_SECRET'}"`);
}

main().catch(console.error);