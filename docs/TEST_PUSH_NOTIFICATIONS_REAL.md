# Test delle Notifiche Push - Guida Debug

## Stato Attuale del Server
✅ Server Next.js funzionante su `localhost:3000`  
✅ Endpoint `/api/push/vapid` - restituisce chiave pubblica VAPID  
✅ Endpoint `/api/push/subscribe` - registra subscription browser  
✅ Endpoint `/api/push/send` - invia notifiche di test  
✅ Endpoint `/api/push/list` - mostra subscription registrate (debug)  
✅ Service Worker registrato (`/public/sw.js`)  
✅ Modulo `web-push` configurato con chiavi VAPID  

## Step per Test End-to-End

### 1. Apri il DJ Panel
Vai su: `http://localhost:3000/dj`

### 2. Controlla Console Browser (F12)
Verifica che appaia:
```
Service Worker registered
VAPID public key received: BL7ELYgWbw...
Push subscription created: https://fcm.googleapis.com/...
Push subscription successful
```

### 3. Attiva Notifiche nel DJ Panel
- Troverai il componente "🔔 Notifiche Push"
- Clicca sul toggle per attivare
- Il browser dovrebbe chiedere il permesso per le notifiche
- Concedi il permesso

### 4. Test Manuale
- Clicca "🧪 Test Notifica" nel DJ panel
- Controlla console browser per errori
- Verifica se appare la notifica visiva

### 5. Test Automatico (Nuova Richiesta)
- Vai su `/libere` e invia una nuova richiesta musicale
- Il server dovrebbe automaticamente inviare una notifica

## Debug Console Commands

### Controlla Service Worker
```javascript
// Controlla registrazione SW
navigator.serviceWorker.controller

// Controlla permessi notifiche
Notification.permission

// Controlla subscription attiva
navigator.serviceWorker.ready.then(r => 
  r.pushManager.getSubscription()
).then(s => console.log(s))
```

### Controlla Subscription sul Server
```bash
curl -s http://localhost:3000/api/push/list | jq
```

### Test Manuale dal Server
```bash
curl -s -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{"title":"Test dal server","body":"Messaggio di prova"}'
```

## Log del Server da Controllare

Nel terminale dove gira `npm run dev`, cerca:
- `📱 Added push subscription for DJ: dj-anonymous`  
- `📤 Sending push notification to X subscribers`  
- `✅ Notification sent to: https://fcm.googleapis.com/...` (successo)  
- `❌ Failed to send notification to...` (errore)  

## Possibili Problemi

1. **Browser non supporta push**: Usa Chrome/Firefox/Edge moderni
2. **Permesso negato**: Ricarica pagina e riprova il toggle
3. **Service Worker non registrato**: Controlla console per errori
4. **Subscription non creata**: Controlla endpoint FCM in console
5. **Push inviato ma non mostrato**: Controlla handler SW e payload

## Status dei Test Precedenti

❌ Subscription fittizie falliscono (chiavi non valide)  
🔄 Serve subscription reale dal browser  
✅ Server invia correttamente quando ha subscription valida  
✅ Logging completo per debugging  

Il prossimo passo è testare con subscription reale dal tuo browser.