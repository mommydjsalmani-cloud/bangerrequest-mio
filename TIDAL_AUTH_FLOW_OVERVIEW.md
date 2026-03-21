# Panoramica Dettagliata del Flusso di Autenticazione Tidal

## 📋 Indice dei File Critici

### 1. **API Routes - Gestione OAuth**

#### [src/app/api/tidal/auth/route.ts](src/app/api/tidal/auth/route.ts)
**Ruolo**: Genera l'URL OAuth di autorizzazione Tidal e inizia il flusso di autenticazione

| Linea | Componente | Descrizione |
|-------|-----------|-------------|
| 1-4 | Import | Importa Next.js routing, crypto, e funzioni Tidal core |
| 6-33 | `getCanonicalOrigin()` | **CRITICAL FIX #1**: Garantisce che in produzione venga usato il dominio canonico (mommydj.com) anziché Vercel |
| 36-107 | `GET /api/tidal/auth` | **Endpoint principale di avvio OAuth** |
| 47-56 | Autenticazione DJ | Verifica credenziali DJ tramite header `x-dj-user` e `x-dj-secret` |
| 58-60 | Session ID | Recupera session_id da query params (opzionale ma raccomandato) |
| 62-65 | CSRF Protection | Genera randomState per protezione CSRF |
| 67-67 | Domain Resolution | Chiama `getCanonicalOrigin()` per ottenere dominio corretto |
| 69-73 | Redirect URI Dinamico | Costruisce redirect URI basato su `basePath` e origin (produzione: `/richiedi/api/tidal/callback`) |
| 75-76 | PKCE Generation | Genera code_verifier e code_challenge per OAuth sicuro |
| 78-85 | State Encoding | Codifica state in base64url con tutto il necessario per il callback (random, origin, codeVerifier cifrato, sessionId, redirectUri) |
| 87-88 | Auth URL | Genera URL OAuth di Tidal con parametri |
| 99-103 | Response | Restituisce JSON con flag `ok: true` e `authUrl` |

**Flusso Critico**:
```
DJ clicca "Accedi a Tidal" 
  → GET /api/tidal/auth?session_id=<id>
  → ✓ Verifica credenziali DJ
  → ✓ Codifica state con info session in base64
  → ✓ Genera PKCE (code_verifier, code_challenge)
  → ✓ Costruisce URL OAuth con domain canonico
  → JSON { ok: true, authUrl: "https://login.tidal.com/authorize?..." }
  → Frontend reindirizza a Tidal OAuth
```

---

#### [src/app/api/tidal/callback/route.ts](src/app/api/tidal/callback/route.ts)
**Ruolo**: Riceve il callback da Tidal e scambia il code per access token

| Linea | Componente | Descrizione |
|-------|-----------|-------------|
| 1-3 | Import | Importa Next.js, funzioni Tidal, Supabase |
| 5-12 | `getCanonicalOrigin()` | Stessa logica di auth route per consistenza domain |
| 14-17 | `buildDjRedirectUrl()` | Costruisce URL di redirect al DJ panel con query params |
| 20-160 | `handleCallback()` | **Funzione core del callback** |
| 22-45 | OAuth Response Handling | Estrae code, state, error da query params; log debug |
| 47-51 | Error Handling | Se Tidal ritorna error, reindirizza DJ panel con errore |
| 53-56 | Code/State Validation | Verifica presenza code e state |
| 58-67 | State Decoding | Decodifica state da base64url; contiene: random, origin, cv (codeVerifier criptato), ru (redirectUri), sid (sessionId) |
| 69-77 | Code Verifier Decryption | Decripta code_verifier dallo state |
| 79-80 | Token Exchange | Chiama `exchangeCodeForToken()` con PKCE |
| 82-90 | Token Validation | Valida essenza access_token, refresh_token, expires_in, user_id |
| 92-96 | Token Encryption | Cripta token con AES-256-GCM per sicurezza |
| 98-127 | DB Persistence (Opzionale) | Se session_id disponibile, salva token in Supabase `sessioni_libere` |
| 129-142 | Redirect Preparation | Costruisce URL di redirect al DJ panel con token criptati nei query params |
| 144-149 | Final Redirect | Reindirizza a `/richiedi/dj/libere?tidal_success=true&tidal_access_token=<enc>&...` |

**Flusso Critico**:
```
Tidal OAuth Callback 
  → GET /api/tidal/callback?code=<code>&state=<state>
  → ✓ Decodifica state (base64url)
  → ✓ Decripta code_verifier dallo state
  → ✓ Scambia code per token con PKCE
  → ✓ Cripta token (AES-256-GCM)
  → ✓ Ora salva in DB (Supabase)
  → ✓ Costruisce URL con token criptati nei query params
  → Reindirizza a /richiedi/dj/libere?tidal_success=true&tidal_access_token=...
  → useEffect nel DJ panel raccoglie token dall'URL
  → saveTidalAuth() persiste token in sessione
```

---

### 2. **Libreria Core Tidal - Funzioni di Utilità**

#### [src/lib/tidal.ts](src/lib/tidal.ts)
**Ruolo**: Core OAuth e crypto logic per Tidal

| Linea | Componente | Descrizione |
|-------|-----------|-------------|
| 1-8 | Constants | Definisce base URL API Tidal, encryption config (AES-256-GCM) |
| 16-26 | `generatePKCE()` | Genera code_verifier (32 byte random base64url) e code_challenge (SHA256 del verifier) |
| 28-36 | `encryptToken()` | Cripta token OAauth con AES-256-GCM (IV + AuthTag + Ciphertext) |
| 38-50 | `decryptToken()` | Decripta token con autenticazione |
| 93-112 | `getTidalAuthUrl()` | Genera URL OAuth completo con scope: `user.read playlists.read playlists.write search.read` |
| 114-150 | `exchangeCodeForToken()` | **Token exchange con PKCE** - scambia code per access token |
| 151-170 | Token Parsing | Estrae access_token, refresh_token, expires_in, user_id dalla risposta Tidal |

**Scope Tidal OAuth**:
```
- user.read          : Leggi info utente
- playlists.read     : Leggi playlist
- playlists.write    : Crea/modifica playlist
- search.read        : Cerca canzoni
```

---

### 3. **Frontend - DJ Admin Panel con UI Responsive**

#### [src/app/dj/libere/page.tsx](src/app/dj/libere/page.tsx)
**Ruolo**: Dashboard DJ dove viene gestito login Tidal e cambio catalogo

| Linea | Componente | Descrizione |
|-------|-----------|-------------|
| **STATO TIDAL** | | |
| 36-40 | Token Expiry Detection | **CRITICAL FIX #2** - Calcola se token è scaduto confrontando `tidal_token_expires_at` con Date.now() |
| 41-44 | `isTidalAuthenticated` | Flag booleano: `Boolean(currentSession?.tidal_access_token) && !isTidalTokenExpired` |
| **INIT E CALLBACK** | | |
| 140-229 | `useEffect - Callback Handler` | Monitora URL params per OAuth callback (tidal_success, tidal_error, token params) |
| 142-195 | `saveTidalAuth()` | Persiste token Tidal nel DB via API `/api/libere/admin` |
| 196-229 | Callback Detection | Se params presenti, chiama `saveTidalAuth()` con i dati dal callback |
| **INITAUTH FUNCTION** | | |
| 760-807 | `initTidalAuth()` | **Funzione che avvia OAuth** |
| 761-765 | Validazione | Controlla autenticazione DJ e session selection |
| 767-789 | API Call | Chiama `GET /api/tidal/auth?session_id=<id>` con credenziali DJ |
| 791-800 | URL Handling | Se `data.ok && data.authUrl`, salva sessionId in storage e reindirizza a Tidal |
| 801-807 | Error Handling | Mostra errori all'utente |
| **BOTTONE TIDAL** | | |
| 1483 | Tidal Button | `<button onClick={initTidalAuth}>` |
| 1540 | Button Text | `{isTidalTokenExpired ? '🔄 Riconnetti Tidal' : '🔐 Accedi a Tidal'}` |
| **RESPONSIVE/MOBILE CLASSES** | | |
| 1161 | Main Container | `min-h-screen bg-gradient... p-2 md:p-4` |
| 1165-1166 | Card Container | `bg-white/10 backdrop-blur-lg p-4 md:p-6 mb-4 md:mb-6` |
| 1166 | Flex Layout | `flex flex-col sm:flex-row justify-between items-start sm:items-center` |
| 1167 | Text Sizes | `text-xl md:text-2xl font-bold` |
| 1201 | Control Row | `flex flex-col sm:flex-row gap-2 md:gap-4 items-stretch sm:items-center` |
| 1247 | Button Row | `flex flex-col sm:flex-row gap-2` |
| 1259, 1268 | Button Classes | `flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base` |
| 1345 | Grid Layout | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3` |
| 1539 | Items Alignment | `flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4` |

---

### 4. **Pagina Richieste Utenti - Cambio Catalogo Runtime**

#### [src/app/requests/page.tsx](src/app/requests/page.tsx)
**Ruolo**: Pagina di richiesta canzoni; rileva cambio catalogo DJ da Tidal

| Linea | Componente | Descrizione |
|-------|-----------|-------------|
| 11-12 | Catalog State | `catalogType: 'deezer' \| 'tidal'` |
| 86-87 | Search Endpoint | Usa `catalogType === 'tidal'` per scegliere endpoint Tidal vs Deezer |
| 98-110 | Error Handling | Se Tidal non autenticato dal DJ, mostra avviso "Il DJ deve ricollegarsi a Tidal" |
| 135-154 | Poll Catalog Changes | `useEffect` che ogni 4 secondi controlla se DJ ha cambiato catalogo |
| 307 | Search Placeholder | `catalogType === 'tidal' ? 'Cerca titolo o artista su Tidal 🎵' : '...'` |
| 343-344 | Tidal Link | `href={catalogType === 'tidal' ? 'https://tidal.com/browse/track/' : ...}` |

---

## 🔑 Concetti Chiave

### OAuth 2.0 with PKCE (Proof Key for Code Exchange)
**Perché PKCE**: Tidal richiede PKCE per motivi di sicurezza. Lo stato contiene:
1. **code_verifier**: 32 byte random (memorizzato cifrato nello state)
2. **code_challenge**: SHA256(code_verifier) in base64url (inviato a Tidal)
3. Nel callback: decripta code_verifier da state e lo riusa per token exchange

### State Encoding (Base64URL)
Tutto lo stato OAuth è codificato in base64url nel parametro `state` per evitare dipendenze da cookie cross-domain:
```javascript
{
  random: string,          // CSRF token
  origin: string,          // Dominio originale per redirect
  cv: string,              // Code verifier criptato (AES-256-GCM)
  sid?: string,            // Session ID opzionale
  ru: string               // Redirect URI usato nell'auth
}
```

### Token Encryption
Tutti i token OAuth sono criptati con **AES-256-GCM** prima di essere passati nell'URL:
- **Format**: `IV:AuthTag:CiphertextHex`
- **Chiave**: `process.env.ENCRYPTION_KEY_TIDAL` (32 caratteri)

### Domain Canonization (CRITICAL FIX #1)
In produzione, il dominio deve essere sempre `mommydj.com`:
- Environment: `PUBLIC_APP_ORIGIN` o `NEXT_PUBLIC_APP_ORIGIN`
- Header: `x-forwarded-host` (da reverse proxy)
- Fallback: `https://mommydj.com`

### Token Expiry Detection (CRITICAL FIX #2)
Il token Tidal scade dopo `expires_in` secondi. La UI deve:
1. Salvare `tidal_token_expires_at` nel DB
2. Confrontare con `Date.now()` per determinare se scaduto
3. Mostrare bottone "Riconnetti Tidal" se scaduto

---

## 📱 Responsive Design

### Breakpoints Tailwind Usati
- **xs** (default): `< 640px` - mobile
- **sm**: `≥ 640px` - small tablets
- **md**: `≥ 768px` - tablets
- **lg**: `≥ 1024px` - desktop
- **xl**: `≥ 1280px` - large desktop

### Pattern Responsive Comuni nel DJ Panel
```tsx
// Mobile stack, desktop horizontal
<div className="flex flex-col sm:flex-row gap-2 md:gap-4">

// Mobile: full width, Desktop: auto width
<button className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base">

// Mobile: 1 col, Tablet: 2 col, Desktop: 6 col
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">

// Padding responsive
<div className="p-4 md:p-6 mb-4 md:mb-6">

// Font sizes responsive
<h1 className="text-xl md:text-2xl">
```

---

## 🔐 Flusso Completo di Autenticazione

```mermaid
sequenceDiagram
    DJ->>+DJ Panel: Clicca "Accedi a Tidal"
    DJ Panel->>DJ Panel: initTidalAuth() (riga 760)
    DJ Panel->>+API Auth: GET /api/tidal/auth?session_id=X
    API Auth->>API Auth: getCanonicalOrigin() (riga 6)
    API Auth->>API Auth: Genera randomState + PKCE (riga 62-76)
    API Auth->>API Auth: Codifica state in base64url (riga 78-85)
    API Auth->>API Auth: getTidalAuthUrl() (riga 87-88)
    API Auth-->>-DJ Panel: { ok: true, authUrl: "https://login.tidal.com/..." }
    DJ Panel->>DJ Panel: sessionStorage.setItem('tidal_session_id', sessionId)
    DJ Panel->>-Tidal: window.location.href = authUrl

    Tidal->>+Tidal OAuth: Utente autorizza
    Tidal->>Tidal: Genera code OAuth
    Tidal->>+API Callback: Reindirizza a /api/tidal/callback?code=X&state=Y

    API Callback->>API Callback: handleCallback() (riga 20)
    API Callback->>API Callback: Decodifica state base64url (riga 58-67)
    API Callback->>API Callback: Decripta codeVerifier (riga 69-77)
    API Callback->>+Tidal API: exchangeCodeForToken() con PKCE (riga 79-80)
    Tidal API-->>-API Callback: { access_token, refresh_token, expires_in, user_id }
    API Callback->>API Callback: Cripta token (riga 92-96)
    API Callback->>+Supabase DB: Salva token in sessioni_libere (riga 98-127)
    Supabase DB-->>-API Callback: ✓ Salvato
    API Callback->>API Callback: Construisci callback URL (riga 129-142)
    API Callback->>-DJ Panel: Reindirizza a /richiedi/dj/libere?tidal_success=true&...

    DJ Panel->>DJ Panel: useEffect riconosce callback (riga 140-229)
    DJ Panel->>DJ Panel: saveTidalAuth() (riga 142-195)
    DJ Panel->>+API Admin: POST /api/libere/admin (action: save_tidal_auth)
    API Admin-->>-DJ Panel: ✓ Salvato
    DJ Panel->>-DJ Panel: currentSession.tidal_access_token disponibile
```

---

## 🎯 File Mobili/Responsive Principali

### Componenti con Layout Responsive:
1. **[src/app/dj/libere/page.tsx](src/app/dj/libere/page.tsx#L1161)** - DJ Admin Panel (mainline)
   - Container: `p-2 md:p-4` (riga 1161)
   - Card panels: `p-4 md:p-6 mb-4 md:mb-6` (riga 1165)
   - Flex rows: `flex flex-col sm:flex-row` (righe 1166, 1201, 1247)
   - Grid layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6` (riga 1345)

2. **[src/app/requests/page.tsx](src/app/requests/page.tsx#L308)** - User Request Page
   - Search input responsive via `sm:p-6` classes (riga 308)
   - Results list responsive (riga 343-351)

3. **[src/components/Splash.tsx](src/components/Splash.tsx)** - Splash screen component

---

## ⚠️ Elementi Critici per Modifiche

### NON MODIFICARE SENZA TEST:
1. **State Encoding/Decoding** (auth/callback routes) - può causare perdita sessione
2. **Domain Canonization** - CRITICAL FIX #1, evita login fallimenti in produzione
3. **Token Expiry Logic** - CRITICAL FIX #2, determina quando mostrare "Riconnetti"
4. **PKCE Flow** - Tidal richiede esattamente code_verifier + code_challenge

### Linee di Debug Utili:
- Auth route: `console.log('Generated Tidal auth URL:', {...})` (riga 87)
- Callback: `console.log('Tidal callback received:', {...})` (riga 22)
- Token exchange: `console.log('Token exchange successful:', {...})` (riga 82)
- Expiry: `isTidalTokenExpired = ... Date.now()` (riga 40)

---

## 📊 Tabella Riassuntiva Percorsi API

| Endpoint | Metodo | Autenticazione | Input | Output |
|----------|--------|----------------|-------|--------|
| `/api/tidal/auth` | GET | x-dj-user/secret | session_id | { ok, authUrl } |
| `/api/tidal/callback` | GET/POST | - | code, state | HTTP 302 redirect |
| `/api/libere/admin` | POST | x-dj-user/secret | action: save_tidal_auth | { ok, ... } |
| `/api/tidal/search` | GET | - | q, limit, s (session) | { tracks, ok } |
| `/api/tidal/playlist` | POST | x-dj-user/secret | action | { ok, playlist_id } |

