#!/usr/bin/env node

/**
 * Script per applicare migration Tidal al database Supabase
 * Usage: node scripts/apply_tidal_migration.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colori per output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n╔════════════════════════════════════════════════╗', 'blue');
  log('║   📦 Tidal Migration - Supabase Setup         ║', 'blue');
  log('╚════════════════════════════════════════════════╝\n', 'blue');

  // Verifica variabili ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Errore: Variabili ambiente mancanti', 'red');
    log('   Assicurati che .env.local contenga:', 'yellow');
    log('   - NEXT_PUBLIC_SUPABASE_URL', 'yellow');
    log('   - SUPABASE_SERVICE_ROLE_KEY\n', 'yellow');
    process.exit(1);
  }

  // Leggi file migration
  const migrationPath = join(__dirname, 'migrate_add_tidal_support.sql');
  let migrationSQL;
  
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8');
    log(`✅ Migration SQL caricato: migrate_add_tidal_support.sql`, 'green');
  } catch (error) {
    log(`❌ Errore lettura file migration: ${error.message}`, 'red');
    process.exit(1);
  }

  // Estrai URL progetto Supabase
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  log('\n📋 ISTRUZIONI PER APPLICARE LA MIGRATION:\n', 'cyan');
  log('1. Apri Supabase Dashboard:', 'blue');
  log(`   ${colors.green}https://supabase.com/dashboard/project/${projectRef}/sql/new${colors.reset}\n`);
  
  log('2. Copia il seguente SQL nel SQL Editor:\n', 'blue');
  log('─'.repeat(60), 'yellow');
  console.log(migrationSQL);
  log('─'.repeat(60), 'yellow');
  
  log('\n3. Clicca "Run" per eseguire la migration\n', 'blue');
  
  log('4. Oppure copia manualmente il file:', 'blue');
  log(`   ${colors.green}cat ${migrationPath}${colors.reset}\n`);

  // Salva SQL in clipboard se possibile
  log('💡 TIP: Il contenuto SQL è disponibile in:', 'cyan');
  log(`   ${migrationPath}\n`, 'green');

  log('✨ Una volta applicata, potrai:', 'green');
  log('   • Scegliere catalogo Deezer o Tidal per ogni sessione', 'green');
  log('   • Autenticarti con Tidal OAuth', 'green');
  log('   • Creare playlist Tidal automaticamente', 'green');
  log('   • Aggiungere brani accettati alla playlist Tidal\n', 'green');

  log('Quando hai completato, premi INVIO per verificare...', 'yellow');
  
  // Aspetta input utente (opzionale, per CI/CD può essere skippato)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', async () => {
      process.stdin.setRawMode(false);
      await verifyMigration(supabaseUrl, supabaseKey);
    });
  } else {
    log('\n⚠️  Running in non-interactive mode, skipping verification\n', 'yellow');
  }
}

async function verifyMigration(supabaseUrl, supabaseKey) {
  log('\n🔍 Verifica migration...\n', 'blue');

  try {
    // Test 1: Verifica colonne sessioni_libere
    const sessionsTest = await fetch(
      `${supabaseUrl}/rest/v1/sessioni_libere?select=catalog_type,tidal_playlist_id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (sessionsTest.ok) {
      log('✅ Colonne Tidal in sessioni_libere: OK', 'green');
    } else {
      log('❌ Colonne Tidal in sessioni_libere: MISSING', 'red');
      log(`   Risposta: ${await sessionsTest.text()}`, 'yellow');
    }

    // Test 2: Verifica colonne richieste_libere
    const requestsTest = await fetch(
      `${supabaseUrl}/rest/v1/richieste_libere?select=tidal_added_status,tidal_retry_count&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (requestsTest.ok) {
      log('✅ Colonne Tidal in richieste_libere: OK', 'green');
    } else {
      log('❌ Colonne Tidal in richieste_libere: MISSING', 'red');
      log(`   Risposta: ${await requestsTest.text()}`, 'yellow');
    }

    log('\n✨ Verifica completata!\n', 'green');
    process.exit(0);

  } catch (error) {
    log(`\n❌ Errore verifica: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

// Esegui
main().catch(error => {
  log(`\n❌ Errore fatale: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});
