# 🔍 Debug Guide - Notifiche Push Non Funzionano

## ⚠️ Problema Identificato: VAPID Keys Mancanti

**CAUSA**: Le variabili d'ambiente VAPID keys non erano configurate in `.env.local`

**SOLUZIONE APPLICATA**: ✅ Aggiunte VAPID keys in `.env.local`

## 🔧 Passi per Verificare che Funzioni

### 1. 🌐 Server Avviato
```bash
cd /workspaces/bangerrequest-mio
npm run dev
```

### 2. 🔑 Verifica VAPID Keys
Controlla che l'endpoint risponda:
```bash
curl http://localhost:3000/api/push/vapid
```

**Dovrebbe rispondere con**:
```json
{"publicKey":"BL7ELYgWbwZ-zTgfHBFfHZ8CqF4vtyJR8t_-o8L8WsxXzXHOdYh6bXBzqSs4dYfJH2WL3b4rFKs6yTfR9lXqLCY"}
```

### 3. 📱 Test Completo nel Browser

1. **Apri DJ Panel**: http://localhost:3000/dj/libere
2. **Login**: Usa credenziali `test` / `77`
3. **Attiva Notifiche**: 
   - Trova sezione "🔔 Notifiche Push"
   - Clicca il toggle per attivare
   - **IMPORTANTE**: Consenti quando il browser chiede permessi
4. **Verifica Console Browser** (F12):
   ```javascript
   // Dovrai vedere questi log:
   ✅ Service Worker registered
   🔑 VAPID public key received: BL7ELYgWbwZ-zTgf...
   📱 Push subscription created: https://fcm.googleapis.com...
   ✅ Push subscription successful
   ```
5. **Test Notifica**: Clicca "🧪 Test Notifica"
6. **Verifica Logs Server**: Nel terminale dovresti vedere:
   ```bash
   🔔 === PUSH NOTIFICATION TEST START ===
   📊 Available DJ subscriptions: 1
   📱 Subscription 1: https://fcm.googleapis.com...
   🚀 Sending push notification...
   📤 Sending push notification to 1 subscribers
   ✅ Notification sent to: https://fcm.googleapis.com...
   📊 Push notification results: 1 success, 0 failed
   ```

## 🚨 Possibili Problemi e Soluzioni

### ❌ "No DJ subscriptions found"

**Problema**: Il toggle delle notifiche non funziona  
**Debug**:
1. Apri Console Browser (F12)
2. Verifica errori durante l'attivazione
3. Controlla `Notification.permission` → dovrebbe essere `'granted'`
4. Verifica Service Worker: `!!navigator.serviceWorker.controller`

**Soluzioni**:
- Ricarica la pagina e riprova
- Controlla permessi nelle impostazioni del browser
- Cancella cache e riprova

### ❌ "VAPID public key not received"

**Problema**: Endpoint VAPID non risponde  
**Debug**:
```bash
curl http://localhost:3000/api/push/vapid
```

**Soluzioni**:
- Verifica che il server sia avviato
- Controlla che `.env.local` contenga le VAPID keys
- Riavvia il server per ricaricare le variabili d'ambiente

### ❌ "Push subscription failed"

**Problema**: Browser non riesce a creare subscription  
**Debug**:
- Console Browser per errori specifici
- Verifica connessione internet (necessaria per FCM)
- Prova browser diverso (Chrome consigliato)

**Soluzioni**:
- Usa Chrome/Chromium per sviluppo
- Verifica che il Service Worker sia registrato
- Controlla che HTTPS sia abilitato (per produzione)

## 🧪 Test Manuale API

Per testare l'endpoint senza il browser:

```bash
# Test senza subscriptions (dovrebbe fallire)
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Test message"}'

# Risposta attesa:
# {"ok":false,"error":"No DJ subscriptions found. Please subscribe to notifications first in the DJ panel."}
```

## ✅ Checklist Finale

- [ ] Server avviato su http://localhost:3000
- [ ] VAPID endpoint risponde: `curl http://localhost:3000/api/push/vapid`
- [ ] DJ panel accessibile: http://localhost:3000/dj/libere
- [ ] Toggle notifiche si attiva correttamente
- [ ] Browser chiede e riceve permessi notifiche
- [ ] Console browser mostra subscription creata
- [ ] Test notifica invia e logs server mostrano successo
- [ ] **Notifica appare visivamente nel browser**

## 🎯 Risultato Atteso

Quando tutto funziona:
1. **Toggle si attiva** e rimane attivo
2. **Logs server** mostrano subscription ricevuta
3. **Test notifica** mostra logs di invio reale
4. **Notifica appare** fisicamente nel browser
5. **Click notifica** apre il DJ panel

---

*Se seguendo questi passi non funziona ancora, controlla i logs dettagliati nel terminale del server.* 🔍