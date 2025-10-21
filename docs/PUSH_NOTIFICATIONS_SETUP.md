# Setup Push Notifications

## Variabili d'ambiente Vercel

Aggiungi le seguenti variabili d'ambiente nel dashboard Vercel:

### 1. VAPID Keys (per Web Push)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOETUOAogFdMArvpc_8MYVHbWAyRvtHKpveDYsy5BV_s7sl0k5FP_Sk-HEQuI4dhj4NAv0RD-P1VEid83YX39p4
VAPID_PRIVATE_KEY=<vedi docs/VAPID_KEYS.md per la chiave privata>
VAPID_SUBJECT=mailto:admin@bangerrequest.app
```

### 2. Database Schema

Esegui questo comando per aggiungere la tabella delle push subscriptions in Supabase:

```sql
-- Tabella per memorizzare le push subscriptions dei DJ
CREATE TABLE IF NOT EXISTS dj_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_id VARCHAR(255) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_id ON dj_push_subscriptions(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_active ON dj_push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_endpoint ON dj_push_subscriptions(endpoint);

-- RLS policies
ALTER TABLE dj_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere la lettura tramite service role
CREATE POLICY "Allow service role to manage push subscriptions" ON dj_push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Policy per permettere inserimenti autenticati (dai DJ)
CREATE POLICY "Allow authenticated DJ to insert own subscriptions" ON dj_push_subscriptions
  FOR INSERT WITH CHECK (true); -- La validazione avviene nel codice API
```

## Come funzionano le notifiche

### 1. Registrazione DJ
- Il DJ accede al pannello DJ
- Il browser chiede il permesso per le notifiche
- Viene creata una push subscription
- La subscription viene salvata in Supabase

### 2. Invio notifiche
- Quando arriva una nuova richiesta libera
- Il sistema invia automaticamente notifiche push a tutti i DJ registrati
- Le notifiche funzionano anche quando il browser è in background

### 3. Gestione click notifica
- Click "Accetta": apre il pannello DJ
- Click generico: naviga alla pagina richieste libere
- Azioni disponibili nel service worker

## Test funzionalità

### 1. Test dal pannello DJ
```bash
# Vai al pannello DJ
https://bangerrequest.app/dj/libere

# Abilita notifiche
# Invia una richiesta di test
# Verifica che arriva la notifica
```

### 2. Test API diretta
```bash
curl -X POST https://bangerrequest.app/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-dj-secret: $DJ_PANEL_SECRET" \
  -H "x-dj-user: $DJ_PANEL_USER" \
  -d '{
    "notification": {
      "title": "Test Push Notification",
      "body": "Questo è un test delle notifiche push",
      "icon": "/icon-192.png",
      "data": {
        "action": "test",
        "url": "/dj/libere"
      }
    }
  }'
```

## Supporto piattaforme

### ✅ Supportate
- **Android Chrome**: Notifiche native complete
- **Desktop Chrome/Edge**: Notifiche desktop
- **Desktop Firefox**: Notifiche desktop
- **Desktop Safari**: Notifiche desktop (macOS 13+)

### ⚠️ Limitazioni iOS
- **iOS Safari**: Non supporta Web Push API
- **iOS PWA**: Supporta notifiche se installata come PWA
- **iOS Chrome**: Usa motore Safari, no notifiche

### Workaround iOS
Il sistema rileva automaticamente iOS e mostra istruzioni per:
1. Aggiungere l'app alla home screen
2. Aprire come PWA per ricevere notifiche

## Troubleshooting

### Notifiche non arrivano
1. Verifica VAPID keys in Vercel
2. Controlla console browser per errori
3. Verifica che il browser supporti le notifiche
4. Controlla permessi notifiche nel browser

### Subscription fails
1. Verifica che HTTPS sia abilitato
2. Controlla che le VAPID keys siano corrette
3. Verifica connessione Supabase

### iOS non funziona
1. Verifica che sia installata come PWA
2. Controlla che manifest.json sia corretto
3. Assicurati che il service worker sia registrato

## File coinvolti

### Service Worker
- `/public/sw.js` - Gestisce le notifiche in background

### Client Components  
- `/src/components/NotificationsClient.tsx` - UI per DJ panel
- `/src/lib/notifications.ts` - Utilities client-side

### API Routes
- `/src/app/api/push/subscribe/route.ts` - Registrazione subscription
- `/src/app/api/push/unsubscribe/route.ts` - Rimozione subscription  
- `/src/app/api/push/send/route.ts` - Invio notifiche

### Server Utils
- `/src/lib/webpush.ts` - Wrapper Web Push API
- `/src/app/api/libere/route.ts` - Integrazione con richieste

### Database
- Schema in `/docs/push_notifications_schema.sql`
- Documentazione VAPID in `/docs/VAPID_KEYS.md`