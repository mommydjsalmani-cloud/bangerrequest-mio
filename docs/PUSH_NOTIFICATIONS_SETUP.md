# Push Notifications Configuration Guide

Questa guida spiega come configurare completamente le notifiche push native per il sistema di richieste.

## 📋 Prerequisiti

- Supabase configurato con tabelle esistenti
- Vercel deployment attivo
- Browser moderni con supporto Web Push API

## 🔧 Configurazione Environment Variables

### 1. Genera chiavi VAPID

Le chiavi VAPID sono necessarie per identificare il server presso i browser:

```bash
# Installa web-push globalmente se non presente
npm install -g web-push

# Genera coppia di chiavi VAPID
web-push generate-vapid-keys
```

Output esempio:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa6HdVeByRyqhj5VQKjsEDhY...

Private Key:
GV6dqOEKGbI8kJy2O4vQy2HtfQ_XsJ8cYz7YHHfQ...

=======================================
```

### 2. Configura Vercel Environment Variables

Aggiungi le seguenti variabili in Vercel Dashboard > Settings > Environment Variables:

```bash
# VAPID Keys (OBBLIGATORIE)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa6HdVeByRyqhj5VQKjsEDhY...
VAPID_PRIVATE_KEY=GV6dqOEKGbI8kJy2O4vQy2HtfQ_XsJ8cYz7YHHfQ...
VAPID_SUBJECT=mailto:your-email@example.com

# Client-side VAPID (OBBLIGATORIA)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa6HdVeByRyqhj5VQKjsEDhY...

# Esistenti (mantenere)
DJ_PANEL_SECRET=your-existing-secret
DJ_PANEL_USER=your-existing-user
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ IMPORTANTE**: Usa la STESSA chiave pubblica per `VAPID_PUBLIC_KEY` e `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### 3. Configura Database Supabase

Esegui lo script SQL per creare la tabella delle subscription:

```sql
-- Copia e incolla tutto il contenuto da docs/push_notifications_schema.sql
-- nel SQL Editor di Supabase
```

O via comando (se hai Supabase CLI):
```bash
supabase db push
```

```sql
-- Crea la tabella per le subscription push
CREATE TABLE IF NOT EXISTS dj_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dj_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    error_reason TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_dj_id ON dj_push_subscriptions(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_active ON dj_push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_dj_push_subscriptions_endpoint ON dj_push_subscriptions(endpoint);

-- Abilita RLS
ALTER TABLE dj_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy per DJ autenticati
CREATE POLICY "DJ can manage own push subscriptions" ON dj_push_subscriptions
    FOR ALL USING (
        dj_id = current_setting('app.current_dj_id', true)
    );

-- Policy per service role
CREATE POLICY "Service role can manage all push subscriptions" ON dj_push_subscriptions
    FOR ALL USING (
        auth.role() = 'service_role'
    );
```

## Come Funziona

### 1. Subscription Management

Quando un DJ accede al panel:
1. Il componente `NotificationsClient` controlla se il browser supporta le notifiche
2. Richiede i permessi di notifica se necessario
3. Crea una subscription push utilizzando la chiave pubblica VAPID
4. Invia la subscription al server tramite `/api/push/subscribe`

### 2. Invio Notifiche

Quando viene creata una nuova richiesta:
1. L'endpoint `/api/requests` (POST) crea la richiesta nel database
2. Se le notifiche push sono configurate, chiama `sendNewRequestNotification()`
3. Il server recupera tutte le subscription attive dal database
4. Invia notifiche push a tutti i DJ connessi

### 3. Gestione Service Worker

Il service worker (`public/sw.js`) gestisce:
- Ricezione eventi push in background
- Visualizzazione notifiche OS-level
- Gestione click sulle notifiche (accept/view actions)
- Click sulle notifiche per aprire/focalizzare l'app

## Funzionalità

### ✅ Notifiche Native
- Notifiche a livello OS (Android, Windows, macOS)
- Funziona anche quando il browser è in background
- Supporta azioni rapide (Accetta/Visualizza)

### 🔔 Azioni Rapide
- **Accetta**: Accetta automaticamente la richiesta via API
- **Visualizza**: Apre/focalizza la tab del panel DJ

### 🛡️ Sicurezza
- Autenticazione tramite `DJ_PANEL_SECRET` esistente
- Validation server-side di tutte le subscription
- Chiavi VAPID per crittografia end-to-end

### 📱 Compatibilità
- **Desktop**: Chrome, Firefox, Edge, Safari
- **Android**: Chrome, Firefox, Samsung Internet
- **iOS**: Safari (richiede PWA installata)

## Troubleshooting

### Notifiche Non Ricevute

1. **Verifica permessi browser**:
   - Controlla le impostazioni notifiche del sito
   - Assicurati che le notifiche non siano bloccate

2. **Controlla configurazione**:
   - Verifica che `NEXT_PUBLIC_VAPID_PUBLIC_KEY` sia impostata
   - Controlla che `VAPID_PRIVATE_KEY` sia configurata correttamente

3. **Debug console**:
   - Apri DevTools > Console per errori JavaScript
   - Controlla Network tab per errori API

### iOS/Safari

Su iOS le notifiche push funzionano solo se:
1. Il sito è installato come PWA (Add to Home Screen)
2. L'utente ha dato i permessi di notifica alla PWA

### Database Errors

Se ricevi errori di database:
1. Verifica che la tabella `dj_push_subscriptions` esista
2. Controlla le policy RLS in Supabase
3. Assicurati che il service role abbia i permessi corretti

## Testing

Per testare le notifiche:

1. Accedi al panel DJ
2. Clicca sul pulsante notifiche per abilitarle
3. Apri un'altra tab e crea una richiesta
4. Dovresti ricevere una notifica native

## Note di Sicurezza

- Le chiavi VAPID private NON devono mai essere esposte al client
- Usa sempre HTTPS in produzione per le notifiche push
- Le subscription sono legate al browser/dispositivo specifico
- I token di subscription scadono e vengono automaticamente puliti
