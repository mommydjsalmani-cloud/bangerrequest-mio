#!/usr/bin/env node

/**
 * Script per aggiornare la configurazione dopo la compromissione del token
 */

console.log('🔐 AGGIORNAMENTO CONFIGURAZIONE SICUREZZA');
console.log('==========================================\n');

console.log('⚠️  Il vecchio token è stato compromesso e revocato.');
console.log('📋 Segui questi passaggi:\n');

console.log('1️⃣ CREA NUOVO BOT:');
console.log('   - Vai su @BotFather su Telegram');
console.log('   - Scrivi /newbot');
console.log('   - Nome: "Banger Request Bot v2"');
console.log('   - Username: bangerrequest_v2_bot');
console.log('   - Copia il NUOVO token\n');

console.log('2️⃣ AGGIORNA FILE LOCALE:');
console.log('   - Modifica .env.local');
console.log('   - Sostituisci TELEGRAM_BOT_TOKEN con il nuovo valore');
console.log('   - Genera nuovo TELEGRAM_WEBHOOK_SECRET\n');

console.log('3️⃣ AGGIORNA VERCEL:');
console.log('   - Vai su vercel.com/dashboard');
console.log('   - Settings > Environment Variables');
console.log('   - Aggiorna TELEGRAM_BOT_TOKEN');
console.log('   - Aggiorna TELEGRAM_WEBHOOK_SECRET');
console.log('   - Redeploy\n');

console.log('4️⃣ RICONFIGURA WEBHOOK:');
console.log('   - Esegui: npm run telegram:webhook:update\n');

console.log('🔒 IMPORTANTE: Non condividere mai più il token nei commit!');

// Generiamo un nuovo webhook secret sicuro
const newSecret = Array.from({length: 32}, () => 
  Math.random().toString(36)[2] || '0'
).join('').substring(0, 32);

console.log(`\n🔑 Nuovo webhook secret generato: ${newSecret}`);
console.log('   Usalo per TELEGRAM_WEBHOOK_SECRET nelle variabili d\'ambiente');