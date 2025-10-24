# 🚀 Guida Deployment Vercel - Web Push Notifications

Questa guida ti aiuterà a deployare Banger Request con il sistema di notifiche push completamente funzionante su Vercel.

## 📋 Prerequisiti

- Account Vercel
- Repository GitHub configurato
- Progetto Supabase (opzionale per persistenza)
- Credenziali Spotify API (per funzionalità complete)

## 🔧 Step 1: Generazione Chiavi VAPID

Le chiavi VAPID sono necessarie per l'autenticazione delle notifiche push.

### Opzione A: Usando lo script automatico

```bash
# Nel tuo ambiente locale
git clone https://github.com/tu-username/bangerrequest-mio.git
cd bangerrequest-mio
npm install
npm run vapid:generate
```

### Opzione B: Generazione manuale

```bash
# Installa web-push globalmente
npm install -g web-push

# Genera chiavi
web-push generate-vapid-keys
```

Lo script produrrà output simile a:
```
ENABLE_PUSH_NOTIFICATIONS=true
VAPID_PUBLIC_KEY=BIp9pmpX7q-fsrd3b7Xur9qG0UV3xQkzMKmuIC_E3rqHQynGZqDQ-B2j3SQEsjAAZWdsJ2tAFGwQe1BduYUWZHs
VAPID_PRIVATE_KEY=ZGHtthOIexa6PpKI5H_dnG3dNLdv1wkau3M6HvE-TEg
VAPID_SUBJECT=mailto:admin@tuodominio.com
```

⚠️ **IMPORTANTE**: Salva queste chiavi in un posto sicuro - le userai nel prossimo step.

## 🌐 Step 2: Configurazione Vercel

### 1. Crea Progetto Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Importa il repository GitHub di Banger Request
4. Configura le impostazioni:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Configura Environment Variables

Vai in **Settings** → **Environment Variables** e aggiungi:

#### Variabili Obbligatorie

```env
# Autenticazione DJ Panel
DJ_PANEL_USER=il_tuo_username_dj
DJ_PANEL_SECRET=la_tua_password_sicura

# Web Push Notifications (SOSTITUISCI CON LE TUE CHIAVI)
ENABLE_PUSH_NOTIFICATIONS=true
VAPID_PUBLIC_KEY=BIp9pmpX7q-fsrd3b7Xur9qG0UV3xQkzMKmuIC_E3rqHQynGZqDQ-B2j3SQEsjAAZWdsJ2tAFGwQe1BduYUWZHs
VAPID_PRIVATE_KEY=ZGHtthOIexa6PpKI5H_dnG3dNLdv1wkau3M6HvE-TEg
VAPID_SUBJECT=mailto:admin@iltuodominio.com
```

#### Variabili Opzionali (per funzionalità complete)

```env
# Database Supabase (raccomandato)
NEXT_PUBLIC_SUPABASE_URL=https://tuoprogetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...chiave_anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...chiave_service_role

# Spotify API (per ricerca musicale)
SPOTIFY_CLIENT_ID=il_tuo_spotify_client_id
SPOTIFY_CLIENT_SECRET=il_tuo_spotify_client_secret
```

### 3. Deploy

1. Click **Deploy**
2. Attendi il completamento del build
3. Verifica che il deployment sia successful

## 🗄️ Step 3: Setup Database (Opzionale)

Se vuoi persistenza per le subscription push:

### 1. Setup Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea nuovo progetto
3. Vai in **Settings** → **API** e copia:
   - Project URL
   - anon public key
   - service_role key

### 2. Applica Migration

1. Vai in **SQL Editor** su Supabase
2. Copia il contenuto di `supabase/migrations/20251024_push_subscriptions.sql`
3. Incolla e click **Run**
4. Verifica che la tabella `push_subscriptions` sia stata creata

### 3. Aggiorna Vercel

Torna su Vercel → Settings → Environment Variables e aggiungi le chiavi Supabase.

## ✅ Step 4: Test del Sistema

### 1. Test Configurazione

Accedi a: `https://tuo-app.vercel.app/api/push/test`

Con headers:
```
x-dj-user: il_tuo_username_dj
x-dj-secret: la_tua_password_sicura
```

Dovresti vedere:
```json
{
  "ok": true,
  "config": {
    "pushEnabled": true,
    "hasVapidPublic": true,
    "hasVapidPrivate": true,
    "hasVapidSubject": true,
    "fullyConfigured": true
  }
}
```

### 2. Test DJ Panel

1. Vai su `https://tuo-app.vercel.app/dj/libere`
2. Effettua login con le credenziali configurate
3. Cerca la sezione "🔔 Notifiche Push"
4. Click "🔔 Abilita Notifiche"
5. Concedi permesso quando richiesto dal browser
6. Click "🧪 Invia Test"
7. Dovresti ricevere una notifica di test

### 3. Test Flow Completo

1. Crea una sessione libera dal DJ panel
2. Apri la pagina pubblica in un altro browser/tab
3. Invia una richiesta musicale
4. Verifica che arrivi la notifica push nel DJ panel

---

## � Configurazione Secrets GitHub per Auto-Deploy

### Secrets Richiesti

Per abilitare il deployment automatico, configura i seguenti secrets nel repository GitHub:

#### 1. VERCEL_TOKEN
- **Descrizione**: Token di accesso per l'API Vercel
- **Come ottenerlo**:
  1. Vai su [Vercel Dashboard](https://vercel.com/account/tokens)
  2. Crea un nuovo token con scope appropriati
  3. Copia il token generato

#### 2. VERCEL_ORG_ID
- **Descrizione**: ID dell'organizzazione Vercel
- **Come ottenerlo**:
  ```bash
  # Installa Vercel CLI se non presente
  npm i -g vercel
  
  # Login e ottieni l'org ID
  vercel --cwd /path/to/project
  # L'org ID sarà mostrato durante la configurazione
  ```

### 3. VERCEL_PROJECT_ID
- **Descrizione**: ID del progetto Vercel
- **Come ottenerlo**:
  ```bash
  # Dal file .vercel/project.json dopo il primo deploy
  cat .vercel/project.json
  ```

## 🔧 Configurazione nel Repository

1. Vai nelle **Settings** del repository GitHub
2. Naviga su **Secrets and variables > Actions**
3. Aggiungi i tre secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID` 
   - `VERCEL_PROJECT_ID`

## ✅ Abilitare Auto-Deploy

Una volta configurati i secrets:

1. Scommenta i job di deployment in `.github/workflows/ci.yml`
2. Rimuovi il prefisso `#` dai job `deploy-staging` e `deploy-production`
3. Fai commit e push - il deployment automatico sarà attivo!

## 🚀 Deployment Attuale

**Metodo corrente**: Deployment manuale via `vercel --prod`
**URL produzione**: https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app
**Status**: ✅ Funzionante

## 📝 Note

- Il CI/CD pipeline attualmente esegue solo test, lint e build
- Il deployment è manuale ma funziona perfettamente
- Una volta configurati i secrets, il deployment sarà automatico su ogni push a `main`