#!/usr/bin/env node
// Script amichevole per verificare lo stato di Supabase nell'app deployata.
// Uso: node scripts/check_supabase.mjs https://tuo-dominio.vercel.app

import http from 'http';
import { URL } from 'url';

const base = process.argv[2];
if (!base) {
  console.error('Specifica il dominio base. Es: node scripts/check_supabase.mjs https://banger.vercel.app');
  process.exit(1);
}

let target;
try {
  target = new URL('/api/health/supabase', base);
} catch (e) {
  console.error('URL non valido:', e.message);
  process.exit(1);
}

http.get(target, (res) => {
  let data='';
  res.on('data', c=> data+=c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.ok) {
        console.log('✅ Supabase ATTIVO');
        console.log('Tabelle trovate:', json.tables);
      } else {
        if (json.error === 'missing_env') {
          console.log('❌ Supabase NON configurato (mancano variabili ambiente).');
          console.log('hasUrl:', json.hasUrl, 'hasKey:', json.hasKey);
        } else {
          console.log('⚠️ Risposta inattesa:', json);
        }
      }
    } catch {
      console.log('Risposta non JSON:', data);
    }
  });
}).on('error', (err) => {
  console.error('Errore richiesta:', err.message);
  process.exit(1);
});
