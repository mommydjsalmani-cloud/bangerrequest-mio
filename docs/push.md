# Web Push Notifications - Setup e Configurazione

Sistema completo di notifiche push per Banger Request, che avvisa i DJ quando arriva una nuova richiesta musicale.

## 🎯 Funzionalità

- ✅ Notifiche push automatiche per nuove richieste musicali
- ✅ Supporto completo per browser moderni (Chrome, Firefox, Safari, Edge)
- ✅ Gestione subscription con persistenza Supabase + fallback in-memory
- ✅ Pruning automatico subscription non valide
- ✅ Test notifiche dal pannello DJ
- ✅ Service Worker ottimizzato con caching
- ✅ Sicurezza VAPID per autenticazione
- ✅ Supporto iOS PWA

## 🔧 Setup Iniziale

### 1. Genera Chiavi VAPID

```bash
cd /workspaces/bangerrequest-mio
npm run vapid:generate
# oppure
node scripts/generate-vapid-keys.js
```

Lo script genererà chiavi uniche e ti mostrerà le variabili ambiente da configurare.

### 2. Configura Variabili Ambiente

#### Per Vercel (Produzione):
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto Banger Request
3. Settings → Environment Variables
4. Aggiungi queste variabili:

```env
ENABLE_PUSH_NOTIFICATIONS=true
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@tuodominio.com
```

#### Per Sviluppo Locale:
Crea `.env.local` nella root:

```env
ENABLE_PUSH_NOTIFICATIONS=true
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@tuodominio.com
```

### 3. Applica Migrazione Database

Se usi Supabase:

```sql
-- Vai su Supabase Dashboard → SQL Editor
-- Incolla il contenuto di supabase/migrations/20251024_push_subscriptions.sql
-- Clicca Run
```

## 📱 Come Funziona

### Flow Utente (DJ):

1. **Accesso al Pannello**: DJ fa login su `/dj/libere`
2. **Abilitazione Notifiche**: Click su "🔔 Abilita Notifiche"
   - Browser chiede permesso notifiche
   - Service Worker si registra automaticamente
   - Subscription viene salvata nel database
3. **Test**: Click su "🧪 Invia Test" per verificare funzionamento
4. **Ricezione**: Ogni nuova richiesta musicale triggera notifica automatica

### Flow Tecnico:

1. **Nuova Richiesta**: API `/api/libere` o `/api/requests` riceve POST
2. **Hook Notifica**: Dopo salvataggio, `broadcastToDJs()` viene chiamato
3. **Invio Push**: Libreria `web-push` invia a tutte le subscription DJ
4. **Service Worker**: Riceve push e mostra notifica OS
5. **Click Notifica**: Apre/porta in primo piano pannello DJ

## 🛠️ Struttura File

```
├── public/sw.js                          # Service Worker per notifiche
├── src/lib/push.ts                       # Libreria server push notifications
├── src/app/api/push/
│   ├── subscribe/route.ts                # POST subscription management
│   └── test/route.ts                     # POST/GET test notifications
├── src/components/ServiceWorkerRegistration.tsx  # Registrazione SW client
├── supabase/migrations/20251024_push_subscriptions.sql  # Schema DB
├── scripts/generate-vapid-keys.js        # Generatore chiavi VAPID
├── tests/push.test.ts                    # Test suite completa
└── docs/push.md                          # Questa documentazione
```

## 🔍 Debugging e Troubleshooting

### Controllo Configurazione

Accedi a `/api/push/test` (GET) con credenziali DJ per verificare config:

```bash
curl -H "x-dj-user: your_dj_user" \
     -H "x-dj-secret: your_dj_secret" \
     https://your-app.vercel.app/api/push/test
```

### Problemi Comuni

#### ❌ "Notifiche push non supportate"
- **Causa**: Browser obsoleto o contesto non sicuro (HTTP)
- **Soluzione**: Usa browser moderno su HTTPS

#### ❌ "Permesso notifiche negato"
- **Causa**: Utente ha bloccato notifiche
- **Soluzione**: 
  1. Click sull'icona 🔒 nella barra indirizzo
  2. Cambia "Notifiche" da "Blocca" a "Consenti"
  3. Ricarica pagina

#### ❌ "Web Push non configurato correttamente"
- **Causa**: Variabili ambiente VAPID mancanti/non valide
- **Soluzione**: Rigenera chiavi e verifica config Vercel

#### ❌ "Subscription non valida"
- **Causa**: Endpoint push scaduto/non più valido
- **Soluzione**: Sistema fa pruning automatico, riabilitare notifiche

#### ❌ Notifiche non arrivano
- **Debugging**:
  1. Controlla console browser per errori SW
  2. Verifica credenziali DJ corrette
  3. Testa con `/api/push/test`
  4. Controlla logs Vercel Functions

### Debug iOS Safari

Su iOS, le notifiche push funzionano solo in modalità PWA:

1. Apri Safari
2. Vai su banger-request.vercel.app/dj/libere
3. Tap "Condividi" → "Aggiungi alla Home"
4. Apri l'app dalla Home (non Safari)
5. Abilita notifiche

## ⚙️ Configurazione Avanzata

### Personalizzazione Notifiche

Modifica payload in `src/app/api/libere/route.ts`:

```typescript
const notificationPayload = {
  title: '🎵 Nuova richiesta',
  body: `${songTitle}${artist} (da ${requesterName})`,
  url: '/dj',
  icon: '/icons/notification-icon.png',  // Personalizza icona
  badge: '/icons/badge.png'               // Personalizza badge
};
```

### Rate Limiting Notifiche

Per evitare spam, implementa debounce in `src/lib/push.ts`:

```typescript
// Esempio: max 1 notifica ogni 5 secondi
const lastNotification = new Map();
const DEBOUNCE_MS = 5000;

export async function broadcastToDJs(payload: PushPayload) {
  const now = Date.now();
  const lastSent = lastNotification.get('dj-notifications') || 0;
  
  if (now - lastSent < DEBOUNCE_MS) {
    console.log('[Push] Notifica debounced');
    return { success: false, totalSent: 0, totalErrors: 0 };
  }
  
  lastNotification.set('dj-notifications', now);
  // ... resto della funzione
}
```

### Cleanup Automatico

Aggiungi cron job per pulizia subscription obsolete:

```typescript
// pages/api/cron/cleanup-push.ts
export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  const { cleanupExpiredSubscriptions } = await import('@/lib/push');
  const result = await cleanupExpiredSubscriptions(30); // 30 giorni
  
  return Response.json({ 
    ok: true, 
    removed: result.removed,
    timestamp: new Date().toISOString()
  });
}
```

## 🧪 Testing

### Esegui Test

```bash
npm run test:push
# oppure
npx vitest tests/push.test.ts
```

### Test Manuali

1. **Subscription Flow**:
   - Login come DJ
   - Abilita notifiche
   - Verifica in DevTools → Application → Service Workers

2. **Push Flow**:
   - Invia richiesta musicale da pagina pubblica
   - Verifica arrivo notifica su pannello DJ
   - Click notifica deve aprire `/dj`

3. **Error Handling**:
   - Disabilita variabile `ENABLE_PUSH_NOTIFICATIONS`
   - Verifica messaggio errore appropriato

## 📊 Monitoring

### Metriche Disponibili

- Total subscriptions attive
- Subscription per utente DJ
- Rate di successo/errore invii
- Cleanup automatico count

### Logs Importanti

```bash
# Vercel Function Logs
[Push] Notifica push inviata per nuova richiesta: Song Title
[Push] Subscription salvata in Supabase: dj-username
[Push] Cleanup completato: rimosse X subscriptions obsolete
```

## 🔒 Sicurezza

### Best Practices

1. **Chiavi VAPID**: 
   - ✅ Non committare chiavi private
   - ✅ Usa stesse chiavi per tutti ambienti
   - ✅ Rigenera se compromesse

2. **Autenticazione**:
   - ✅ Solo DJ autenticati possono registrare subscription
   - ✅ Header `x-dj-secret` sempre verificati
   - ✅ Rate limiting su API push

3. **Validazione Input**:
   - ✅ Endpoint URL validati
   - ✅ Chiavi p256dh/auth verificate base64
   - ✅ User-Agent sanitizzato

### Audit Checklist

- [ ] Variabili ambiente configurate correttamente
- [ ] HTTPS abilitato (richiesto per Service Workers)
- [ ] Notifiche funzionano su diversi browser
- [ ] Cleanup subscription funziona
- [ ] Logs mostrano invii successful
- [ ] iOS PWA supportato
- [ ] Rate limiting attivo
- [ ] Test suite completa passa

## 🆘 Support

Per problemi o domande:

1. Controlla questa documentazione
2. Verifica logs Vercel Functions
3. Esegui test suite
4. Controlla issues GitHub del progetto

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: Ottobre 2024  
**Compatibilità**: Next.js 15, React 19, Supabase, Vercel