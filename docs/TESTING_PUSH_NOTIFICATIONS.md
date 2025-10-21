# 🧪 Testing Guide - Notifiche Push

## 🔧 Problemi Risolti

✅ **Service Worker Registration**: Corretta registrazione e logging  
✅ **VAPID Key Conversion**: Aggiunta funzione `urlBase64ToUint8Array` per conversione corretta  
✅ **API Endpoints Compatibility**: `/api/push/subscribe` e `/api/push/unsubscribe` gestiscono entrambi i flussi  
✅ **TypeScript Errors**: Risolti errori di tipo con `BufferSource`  

## 📋 Come Testare le Notifiche (Passo-Passo)

### 1. 🌐 Apri il Pannello DJ

1. Vai su **http://localhost:3000/dj/login**
2. Inserisci le credenziali DJ
3. Verrai reindirizzato a **http://localhost:3000/dj/libere**

### 2. 🔔 Attiva le Notifiche

1. Scorri verso il basso e trova la sezione **"🔔 Notifiche Push"**
2. Clicca il **toggle** per attivare le notifiche
3. Il browser dovrebbe chiedere il **permesso per le notifiche** → **Clicca "Consenti"**
4. Se tutto va bene, il toggle dovrebbe rimanere **attivo** e vedere "✅ Notifiche attive"

### 3. 🧪 Testa le Notifiche

1. Clicca il pulsante **"🧪 Test Notifica"**
2. Dovresti ricevere una **notifica di test** dal browser
3. Se la notifica non arriva, controlla la **console del browser** (F12)

### 4. 🎵 Test End-to-End

1. Apri una **nuova scheda** e vai su **http://localhost:3000/libere**
2. Cerca una canzone e **invia una richiesta**
3. Dovresti ricevere una **notifica automatica** nel pannello DJ

## 🔍 Debug Console

### Browser Console (F12 → Console)

```javascript
// Verifica Service Worker
console.log('SW registered:', !!navigator.serviceWorker.controller);

// Verifica permessi
console.log('Notification permission:', Notification.permission);

// Verifica subscription
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('Current subscription:', !!sub);
});
```

### Server Logs (Terminal)

Cerca questi messaggi nel terminale del server:

```bash
🔑 VAPID public key received: BL7ELYgWbwZ-zTgf...
📱 Push subscription created: https://fcm.googleapis.com/fcm/send/...
✅ Push subscription successful
📤 Sending notification to X subscribers
```

## 🚨 Possibili Problemi

### ❌ Toggle non si attiva

**Problema**: Errore nella subscription  
**Soluzione**: 
1. Ricarica la pagina (F5)
2. Controlla la console per errori
3. Verifica che hai dato il permesso per le notifiche

### ❌ Notifica di test non arriva

**Problema**: Service Worker o push subscription non funziona  
**Soluzione**:
1. Controlla la console: `navigator.serviceWorker.controller`
2. Verifica permessi: `Notification.permission === 'granted'`
3. Prova a disattivare e riattivare le notifiche

### ❌ Notifiche automatiche non arrivano

**Problema**: Integrazione con API richieste  
**Soluzione**:
1. Controlla i logs del server durante l'invio richiesta
2. Verifica che ci siano subscriptions attive: guarda i logs `📤 Sending notification to X subscribers`

## 🛠️ Reset Completo (Se necessario)

Se le notifiche continuano a non funzionare:

```javascript
// Console del browser (F12)

// 1. Disattiva Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

// 2. Cancella cache browser
// Chrome: F12 → Application → Clear Storage → Clear site data

// 3. Ricarica completamente la pagina
location.reload();
```

## ✅ Verifiche di Successo

- [ ] Service Worker registrato: `navigator.serviceWorker.controller !== null`
- [ ] Permessi concessi: `Notification.permission === 'granted'`  
- [ ] Toggle notifiche funziona e rimane attivo
- [ ] Test notifica arriva correttamente
- [ ] Notifiche automatiche su nuove richieste funzionano
- [ ] Click su notifica apre pannello DJ

## 📱 Test su Diversi Browser

Le notifiche push funzionano su:
- ✅ **Chrome/Chromium** (consigliato per sviluppo)
- ✅ **Firefox**
- ✅ **Edge**
- ❌ **Safari** (supporto limitato)

---

*Una volta che tutto funziona, committa le modifiche!* 🚀