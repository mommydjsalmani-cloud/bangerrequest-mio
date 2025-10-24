#!/usr/bin/env node
// Script per generare chiavi VAPID per Web Push Notifications
// Uso: node scripts/generate-vapid-keys.mjs

import webPush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Generazione chiavi VAPID per Web Push...\n');

try {
  // Genera chiavi VAPID
  const vapidKeys = webPush.generateVAPIDKeys();
  
  console.log('✅ Chiavi VAPID generate con successo!\n');
  console.log('📋 Copia queste variabili nelle tue impostazioni ambiente:\n');
  
  console.log('='.repeat(80));
  console.log('VARIABILI AMBIENTE DA COPIARE:');
  console.log('='.repeat(80));
  console.log();
  console.log(`ENABLE_PUSH_NOTIFICATIONS=true`);
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:admin@tuodominio.com`);
  console.log();
  console.log('='.repeat(80));
  console.log();
  
  // Salva in file .env.example per riferimento
  const envExample = `# Web Push Notifications Configuration
# Generate new keys with: node scripts/generate-vapid-keys.mjs

ENABLE_PUSH_NOTIFICATIONS=true
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@tuodominio.com

# Note:
# - VAPID_PUBLIC_KEY: Chiave pubblica per subscription client-side
# - VAPID_PRIVATE_KEY: Chiave privata per autenticazione server (NON committare!)
# - VAPID_SUBJECT: Email di contatto o URL del tuo sito
# - Le chiavi sono univoche per questa applicazione - non condividerle!
`;

  const envExamplePath = path.join(__dirname, '..', '.env.push.example');
  fs.writeFileSync(envExamplePath, envExample);
  
  console.log(`💾 File di esempio salvato in: ${envExamplePath}`);
  console.log();
  
  // Istruzioni per Vercel
  console.log('🚀 SETUP VERCEL:');
  console.log('-'.repeat(50));
  console.log('1. Vai su https://vercel.com/dashboard');
  console.log('2. Seleziona il tuo progetto');
  console.log('3. Vai in Settings → Environment Variables');
  console.log('4. Aggiungi le variabili sopra (una per riga)');
  console.log('5. Redeploy il progetto');
  console.log();
  
  // Istruzioni per locale
  console.log('💻 SETUP LOCALE:');
  console.log('-'.repeat(50));
  console.log('1. Crea file .env.local nella root del progetto');
  console.log('2. Copia le variabili sopra nel file');
  console.log('3. Riavvia il server di sviluppo');
  console.log();
  
  console.log('⚠️  IMPORTANTE:');
  console.log('-'.repeat(50));
  console.log('• NON committare la chiave privata nel repository!');
  console.log('• Usa le stesse chiavi per tutti gli ambienti (dev/prod)');
  console.log('• Sostituisci "admin@tuodominio.com" con la tua email');
  console.log('• Testa le notifiche dopo il setup');
  console.log();
  
} catch (error) {
  console.error('❌ Errore generazione chiavi VAPID:', error.message);
  process.exit(1);
}