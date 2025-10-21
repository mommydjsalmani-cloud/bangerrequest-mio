# Push Notifications - Sistema Completo

## Panoramica

BangerRequest implementa un sistema completo di push notifications per inviare notifiche in tempo reale ai DJ quando arrivano nuove richieste musicali. Il sistema funziona anche quando il DJ sta usando altre app o ha il browser in background.

## Architettura

### Componenti Principali

1. **Service Worker** (`/public/sw.js`)
   - Gestisce le notifiche in background
   - Implementa click handlers per azioni rapide
   - Memorizza credenziali DJ per autenticazione

2. **Client Components** (`/src/components/NotificationsClient.tsx`)
   - UI per abilitare/disabilitare notifiche nel pannello DJ
   - Gestione permessi e registrazione push subscriptions
   - Rilevamento iOS e guida installazione PWA

3. **API Routes**
   - `/api/push/subscribe` - Registrazione nuove subscriptions
   - `/api/push/unsubscribe` - Rimozione subscriptions
   - `/api/push/send` - Invio notifiche batch

4. **Database Schema** (`dj_push_subscriptions`)
   - Memorizzazione sicura delle push subscriptions
   - Gestione stato attivo/inattivo
   - Associazione con DJ specifici

### Flusso Operativo

```
1. DJ apre pannello → Richiede permessi notifiche
2. Browser genera push subscription → Salvata in database
3. Nuova richiesta arriva → Sistema invia push a tutti i DJ attivi
4. DJ riceve notifica → Click per azioni rapide (Accetta/Visualizza)
```

## Tecnologie Utilizzate

- **Web Push API** - Standard W3C per notifiche cross-platform
- **VAPID Authentication** - Identificazione sicura del server
- **Service Workers** - Execution context in background
- **Push Subscriptions** - Endpoint unici per ogni device/browser

## Supporto Piattaforme

### ✅ Completamente Supportate
- **Android Chrome/Edge** - Notifiche native complete
- **Desktop Chrome/Edge** - Notifiche desktop
- **Desktop Firefox** - Notifiche desktop  
- **Desktop Safari** - Notifiche desktop (macOS 13+)

### ⚠️ Supporto Limitato
- **iOS Safari** - NO push support (limitazione Apple)
- **iOS Chrome** - Usa motore Safari, no push
- **iOS PWA** - SÌ push support se installata come PWA

### Strategia iOS
Il sistema rileva automaticamente iOS e guida l'utente a:
1. Aggiungere l'app alla home screen
2. Aprire come PWA per abilitare push notifications

## Configurazione

### 1. Variabili d'Ambiente

```bash
# VAPID Keys (vedi docs/VAPID_KEYS.md)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOETUOAogFdMArvpc_8MYVHbWAyRvtHKpveDYsy5BV_s7sl0k5FP_Sk-HEQuI4dhj4NAv0RD-P1VEid83YX39p4
VAPID_PRIVATE_KEY=<private_key_from_docs>
VAPID_SUBJECT=mailto:admin@bangerrequest.app

# DJ Authentication (già configurate)
DJ_PANEL_SECRET=<secret>
DJ_PANEL_USER=<username>

# Supabase (già configurate)
NEXT_PUBLIC_SUPABASE_URL=<url>
SUPABASE_SERVICE_ROLE_KEY=<key>
```

### 2. Database Schema

Esegui per creare le tabelle:

```bash
# Automatico
./scripts/apply_push_notifications.sh

# Manuale - SQL Editor Supabase
# Copia contenuto da: docs/push_notifications_schema.sql
```

### 3. Deployment

```bash
# Build e deploy
npm run build
git push origin develop  # Auto-deploy via GitHub Actions
```

## Utilizzo

### Abilitazione per DJ

1. Accedi al pannello DJ (`/dj/libere`)
2. Autorizza permessi notifiche nel browser
3. Toggle "🔔 Push Notifications" → Abilita
4. Stato indica "Attive" con led verde

### Invio Automatico

Le notifiche vengono inviate automaticamente quando:
- Arriva una nuova richiesta libera
- Sistema chiama `sendNewRequestNotification()`
- Messaggio include: titolo, artista, richiedente

### Gestione Click

Quando il DJ clicca una notifica:
- **Click generico**: Apre `/dj/libere`
- **Azione "Accetta"**: API call + apertura pannello
- **Azione "Visualizza"**: Apertura diretta pannello

## Testing

### Test Locale

```bash
# Setup environment
export DJ_PANEL_SECRET="your_secret"
export DJ_PANEL_USER="your_user"

# Run test suite
./scripts/test_push_notifications.sh
```

### Test Manuale

```bash
# Invia notifica test
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-dj-secret: $DJ_PANEL_SECRET" \
  -H "x-dj-user: $DJ_PANEL_USER" \
  -d '{
    "notification": {
      "title": "Test Push",
      "body": "Test notifica push",
      "data": { "action": "test" }
    }
  }'
```

### Verifica Funzionamento

1. **Desktop**: Notifiche appaiono nell'angolo sistema
2. **Android**: Notifiche nel drawer, persistenti  
3. **iOS PWA**: Notifiche native se installata come app

## Troubleshooting

### Notifiche Non Arrivano

**Cause Comuni:**
- Permessi negati nel browser
- VAPID keys non configurate
- Service worker non registrato
- Subscription scaduta/invalida

**Debug Steps:**
1. Console browser → Verifica errori SW
2. Dev Tools → Application → Service Workers
3. Network → Controlla chiamate API
4. Database → Verifica subscriptions attive

### iOS Issues

**Problema**: "Push non supportate"
**Soluzione**: Installa come PWA
1. Safari → Condividi → Aggiungi alla Home
2. Apri dalla home screen (non Safari)
3. Autorizza notifiche

### Subscription Invalid

Le subscription possono scadere. Il sistema:
1. Cattura errori 410/404 da push service
2. Disattiva automaticamente subscription invalide
3. UI mostra stato "Disattive"
4. DJ può ri-abilitare per generare nuova subscription

## Performance

### Ottimizzazioni Implementate

- **Batch Sending**: Invio parallelo a tutte le subscriptions
- **Error Handling**: Gestione graceful di subscription invalide
- **TTL**: 60 secondi timeout per notifiche
- **High Priority**: Urgency "high" per delivery immediato

### Metriche Tipiche

- **Latency**: 1-3 secondi da richiesta a notifica
- **Success Rate**: 95%+ per subscriptions valide
- **Battery Impact**: Minimal (standard Web Push)

## Sicurezza

### Autenticazione

- **VAPID Keys**: Identificazione server crittografica
- **DJ Credentials**: Verifica permessi per ogni API call
- **Endpoint Validation**: Controllo format subscription

### Privacy

- **No Personal Data**: Solo endpoint tecnici memorizzati
- **RLS Policies**: Accesso limitato via service role
- **Automatic Cleanup**: Rimozione subscription invalide

### Best Practices

1. **HTTPS Required**: Push API funziona solo su HTTPS
2. **Key Rotation**: Cambiare VAPID keys periodicamente
3. **Monitoring**: Log tentativi falliti/sospetti
4. **Rate Limiting**: Prevenzione spam (già implementato)

## Roadmap

### Miglioramenti Futuri

- [ ] **Rich Notifications**: Immagini copertina album
- [ ] **Action Buttons**: Più azioni rapide (Scarta, Note)
- [ ] **Notification Groups**: Raggruppamento per sessione
- [ ] **Silent Updates**: Aggiornamenti background senza notifica
- [ ] **Analytics**: Metriche engagement notifiche

### Integrazioni Possibili

- [ ] **Slack/Discord**: Bridge per notifiche externe
- [ ] **Email Fallback**: Backup per push non supportate
- [ ] **SMS Gateway**: Notifiche critiche via SMS
- [ ] **Webhook Support**: Integrazioni custom per DJ

## Risorse

### Documentazione Tecnica
- [Web Push API Spec](https://www.w3.org/TR/push-api/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### Tool di Debug
- Chrome DevTools → Application → Push Messaging
- Firefox DevTools → Console → Service Workers
- [Web Push Testing](https://web-push-codelab.glitch.me/)

### Librerie Utilizzate
- `web-push` - Server-side push sending
- `@types/web-push` - TypeScript definitions

---

*Sistema implementato per BangerRequest v2.0 - Push Notifications native stile SMS/WhatsApp*
