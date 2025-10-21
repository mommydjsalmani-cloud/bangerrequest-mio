# 🔔 Sistema Notifiche Push - Banger Request

Documentazione completa per il sistema di notifiche push implementato per il DJ panel.

## 📋 Panoramica

Il sistema di notifiche push permette ai DJ di ricevere notifiche in tempo reale quando arrivano nuove richieste musicali, anche quando l'applicazione è chiusa o in background.

### ✨ Caratteristiche principali

- **Notifiche native del browser** - Utilizzano le Web Push API standard
- **Funzionamento offline** - Service Worker gestisce le notifiche in background
- **Non invasivo** - Non modifica le funzioni esistenti
- **Cross-browser** - Supporta Chrome, Firefox, Safari, Edge
- **Progressive Web App** - Manifestos configurato per PWA

## 🏗️ Architettura

### Componenti creati

1. **Service Worker** (`public/sw.js`)
   - Gestisce le notifiche in background
   - Risponde ai click delle notifiche
   - Mantiene l'app attiva per le notifiche

2. **Client Library** (`src/lib/push.ts`)
   - Gestisce permessi notifiche
   - Sottoscrizioni/disattivazioni
   - Interfaccia client per Web Push API

3. **UI Component** (`src/components/NotificationManager.tsx`)
   - Pannello controllo notifiche per DJ
   - Bottoni attiva/disattiva/test
   - Stato visual delle notifiche

4. **API Endpoints**
   - `/api/push/subscribe` - Registra dispositivo per notifiche
   - `/api/push/unsubscribe` - Rimuove dispositivo
   - `/api/push/send` - Invia notifiche (interno)

5. **Trigger Integration**
   - Modifiche minime a `/api/libere/route.ts`
   - Trigger automatico quando arriva nuova richiesta
   - Chiamata asincrona non bloccante

## ⚙️ Configurazione

### Variabili d'ambiente richieste

```bash
# Chiavi VAPID per Web Push (da generare)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BINCMg0jeWl5eWgn7rZC-Cco_kd5CVGJTZ9VNGQUTVLlgMfPelKR24G21EEHmx-EjffTxbmmyMtZyPsOX973o74
VAPID_PRIVATE_KEY=ofzsFTO5vextrbW_krAC33rt5fJRlf0LLU_WNbokTHQ

# Credenziali DJ (già esistenti)
DJ_SECRET=il_tuo_secret_dj
DJ_USER=il_tuo_username_dj

# URL del sito (per chiamate interne)
NEXT_PUBLIC_SITE_URL=https://tuo-dominio.vercel.app
```

### Setup database Supabase

Le notifiche utilizzano la tabella `push_subscriptions` per persistenza:

```sql
-- Tabella già creata dal sistema esistente richieste libere
-- o verrà creata automaticamente al primo utilizzo
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  dj_user TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Come funziona

### 1. Attivazione notifiche (DJ)

1. DJ accede al pannello `/dj/libere`
2. Vede il componente "Notifiche Push" in cima
3. Clicca "Attiva Notifiche"
4. Browser richiede permesso notifiche
5. Sistema registra dispositivo sul server

### 2. Invio automatico (Utente invia richiesta)

1. Utente invia richiesta dalla pagina pubblica
2. API `/api/libere` salva richiesta come sempre
3. **NUOVO**: Trigger automatico chiama `/api/push/send`
4. Sistema recupera subscriptions attive per la sessione
5. Invia notifica push a tutti i dispositivi DJ registrati

### 3. Ricezione notifica (DJ)

1. Notifica appare sul dispositivo
2. Mostra titolo, artista, richiedente
3. DJ può cliccare per aprire pannello
4. Oppure ignorare la notifica

## 🎯 Funzionalità

### Pannello Controllo Notifiche

- **Stato visuale**: Indica se notifiche sono attive/inattive/bloccate
- **Attiva/Disattiva**: Toggle semplice per gestire notifiche  
- **Test notifica**: Bottone per testare che funzioni
- **Messagi di feedback**: Conferme e errori visibili

### Notifiche Smart

- **Informazioni complete**: Titolo, artista, richiedente, evento
- **Click-to-action**: Clic apre direttamente pannello DJ
- **Tag-based**: Evita spam di notifiche duplicate
- **Icon personalizzata**: Logo Banger Request

### Gestione errori

- **Fallback graceful**: Se push non funziona, app continua normale
- **Subscription cleanup**: Dispositivi non validi vengono rimossi
- **Retry automatico**: Tentativi multipli per affidabilità
- **Memory fallback**: Sviluppo locale senza database

## 🔧 Testing

### Script di verifica

```bash
./scripts/test_push_notifications.sh
```

Questo script verifica:
- ✅ Tutti i file necessari esistono
- ✅ Dipendenze NPM installate  
- ✅ Manifest.json configurato
- 🔑 Mostra chiavi VAPID generate

### Test manuale

1. **Deploy con variabili d'ambiente configurate**
2. **Accedi come DJ** a `/dj/libere`
3. **Attiva notifiche** nel pannello
4. **Invia richiesta** dalla pagina pubblica
5. **Verifica notifica** arriva sul dispositivo DJ

### Debug

- **Browser DevTools**: Console per errori service worker
- **Application tab**: Verifica service worker registrato
- **Network tab**: Monitora chiamate API push
- **Permissions**: Verifica permessi notifiche concessi

## 📱 Browser Support

| Browser | Desktop | Mobile | Note |
|---------|---------|---------|------|
| Chrome | ✅ | ✅ | Supporto completo |
| Firefox | ✅ | ✅ | Supporto completo |
| Safari | ✅ | ✅ | iOS 16.4+ |
| Edge | ✅ | ✅ | Basato su Chromium |

## 🔒 Sicurezza

- **Autenticazione DJ**: Solo DJ autenticati possono registrare dispositivi
- **VAPID keys**: Crittografia end-to-end per notifiche
- **Rate limiting**: Evita spam di registrazioni
- **Input validation**: Tutti i dati validati lato server
- **HTTPS required**: Push notifications richiedono connessione sicura

## 🚨 Troubleshooting

### Notifiche non funzionano

1. **Verifica permessi browser**: Settings > Notifications
2. **Controlla variabili d'ambiente**: VAPID keys configurate?
3. **Ispeziona service worker**: DevTools > Application
4. **Testa con script**: `./scripts/test_push_notifications.sh`

### Service Worker non si registra

1. **HTTPS richiesto**: Push funziona solo su connessioni sicure
2. **Cache browser**: Prova in incognito
3. **Console errors**: Verifica errori JavaScript
4. **Manifest**: Controlla `/manifest.json` accessibile

### Database errori

1. **Supabase configurato**: URL e SERVICE_ROLE_KEY corretti?
2. **Tabelle esistenti**: Schema richieste libere installato?
3. **Permessi RLS**: Row Level Security configurato?
4. **Memory fallback**: Sistema usa fallback se DB non disponibile

## 📈 Metriche

Il sistema traccia automaticamente:

- Numero dispositivi registrati per notifiche
- Successi/fallimenti invio notifiche  
- Cleanup automatico dispositivi non validi
- Log dettagliati per debugging

## 🔄 Manutenzione

### Cleanup periodico

Il sistema rimuove automaticamente:
- Subscription non valide (dispositivi disinstallati)
- Dispositivi che restituiscono errori 410
- Session expired o inattive

### Monitoring

Monitora questi endpoint per salute sistema:
- `/api/push/subscribe` - Registrazione dispositivi
- `/api/push/send` - Invii notifiche
- Service Worker console logs

## 📝 Note Implementazione

### Non modificato

Il sistema **NON** modifica:
- ❌ Funzioni esistenti richieste
- ❌ Database schema richieste libere  
- ❌ API endpoint principali
- ❌ UI pannello DJ esistente

### Aggiunto

Il sistema **AGGIUNGE**:
- ✅ Service Worker registration
- ✅ Componente NotificationManager
- ✅ Nuovi endpoint `/api/push/*`
- ✅ Trigger asincrono in `/api/libere`
- ✅ Manifest PWA support

Questo garantisce **zero breaking changes** e **compatibilità completa** con il sistema esistente.