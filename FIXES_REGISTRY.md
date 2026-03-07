# 🔒 Registro Fix Critiche - NON MODIFICARE SENZA LEGGERE

**Questo documento elenca le soluzioni applicate a problemi ricorrenti. Ogni fix è protetta da test automatici.**

> ⚠️ **IMPORTANTE**: Le soluzioni qui documentate risolvono bug che si sono ripresentati multiple volte.  
> Prima di modificare il codice relativo, verifica i test associati e assicurati di non reintrodurre i problemi.

---

## 📋 Indice delle Fix

1. [OAuth Domain Redirect](#1-oauth-domain-redirect-fix)
2. [Tidal Token Expiry Detection](#2-tidal-token-expiry-detection)
3. [Tidal Cover Images](#3-tidal-cover-images-fix)
4. [Automatic Playlist Integration](#4-automatic-playlist-integration)

---

## 1. OAuth Domain Redirect Fix

### 🐛 Problema
Dopo il login Tidal, l'utente veniva reindirizzato al dominio vercel.app invece di mommydj.com, perdendo lo stato della sessione DJ.

### ✅ Soluzione Applicata
**File**: [`src/app/api/tidal/auth/route.ts`](src/app/api/tidal/auth/route.ts)
**Commit**: `86a5028`
**Data**: 2026-03-03

```typescript
// CRITICAL FIX: Force canonical domain to prevent cross-domain session loss
function getCanonicalOrigin(): string {
  // Production: always use mommydj.com
  if (process.env.NODE_ENV === 'production') {
    const host = headers().get('x-forwarded-host') || headers().get('host');
    if (host?.includes('mommydj.com')) {
      return 'https://mommydj.com';
    }
    // Fallback per Vercel domain
    return process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'https://mommydj.com';
  }
  // Development
  return 'http://localhost:3000';
}
```

**File**: [`src/app/api/tidal/callback/route.ts`](src/app/api/tidal/callback/route.ts)
- Server-side token persistence prima del redirect
- Redirect sempre al dominio canonico con basePath

### 🧪 Test di Protezione
- **Unit Test**: `tests/tidal.integration.test.ts` → "Canonical domain handling"
- **Smoke Test**: `scripts/smoke-test-production.sh` → "Testing OAuth Canonical Domain"

### ⚠️ Non Modificare
- La logica di `getCanonicalOrigin()` 
- Il server-side token update nel callback
- Il redirect URL construction

---

## 2. Tidal Token Expiry Detection

### 🐛 Problema
I token Tidal scadevano ma l'UI non mostrava alcun avviso, lasciando il DJ senza modo di riconnettersi.

### ✅ Soluzione Applicata
**File**: [`src/app/dj/libere/page.tsx`](src/app/dj/libere/page.tsx)
**Commit**: `8dd807a`
**Data**: 2026-03-02

```typescript
// CRITICAL FIX: Detect expired Tidal tokens
const isTidalTokenExpired = session.catalog_type === 'tidal' 
  && session.tidal_access_token 
  && session.tidal_token_expires_at
  && Date.now() >= new Date(session.tidal_token_expires_at).getTime();

// Show reconnect UI quando scaduto
{isTidalTokenExpired && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <p className="text-sm text-yellow-800 mb-2">
      ⚠️ Sessione Tidal scaduta
    </p>
    <button onClick={handleReconnectTidal}>
      Riconnetti Tidal
    </button>
  </div>
)}
```

### 🧪 Test di Protezione
- **Unit Test**: `tests/tidal.integration.test.ts` → "Session persistence" → "should detect expired tokens"
- **UI Test**: Manuale - verifica visual del warning

### ⚠️ Non Modificare
- La logica di calcolo `isTidalTokenExpired`
- Il check su `tidal_token_expires_at`
- L'UI di warning gialla

---

## 3. Tidal Cover Images Fix

### 🐛 Problema
Le copertine Tidal non si caricavano a causa di:
1. CSP (Content Security Policy) che bloccava i domini Tidal
2. Certificati SSL misti (http/https)
3. Nessun fallback per immagini mancanti

### ✅ Soluzione Applicata (Multi-File)

#### 3.1 Image Proxy
**File**: [`src/app/api/tidal/image/route.ts`](src/app/api/tidal/image/route.ts) (NEW)
**Commit**: `3bdc281`

```typescript
// CRITICAL FIX: Proxy for Tidal images to avoid CSP and SSL issues
const ALLOWED_HOST_SUFFIXES = [
  'resources.tidal.com',
  'tidal.com',
  'wimpmusic.com'
];
```

#### 3.2 CSP Configuration
**File**: [`next.config.ts`](next.config.ts)

```typescript
// CRITICAL FIX: Allow Tidal image hosts in CSP
contentSecurityPolicy: {
  directives: {
    'img-src': [
      "'self'",
      'data:',
      'https://resources.tidal.com',
      'https://*.tidal.com',
      'https://*.wimpmusic.com',
    ],
  },
},
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'resources.tidal.com',
  },
  {
    protocol: 'https',
    hostname: '**.tidal.com',
  },
]
```

#### 3.3 Fallback Placeholder
**File**: [`public/cover-placeholder.svg`](public/cover-placeholder.svg) (NEW)
- SVG locale per fallback

#### 3.4 Search API Integration
**File**: [`src/app/api/tidal/search/route.ts`](src/app/api/tidal/search/route.ts)

```typescript
// CRITICAL FIX: Wrap covers with proxy and provide session fallback
function withCoverProxy(track: any) {
  if (track.cover_url) {
    const proxyUrl = apiPath(`/api/tidal/image?u=${encodeURIComponent(track.cover_url)}`);
    track.cover_url = proxyUrl;
  }
  return track;
}
```

#### 3.5 UI Fallback
**Files**: 
- [`src/app/richieste/page.tsx`](src/app/richieste/page.tsx)
- [`src/app/requests/page.tsx`](src/app/requests/page.tsx)

```typescript
// CRITICAL FIX: Fallback to placeholder on image error
<img 
  src={track.cover_url || fallbackCover}
  onError={(e) => { e.currentTarget.src = fallbackCover; }}
/>
```

### 🧪 Test di Protezione
- **Unit Test**: `tests/tidal.integration.test.ts` → "Cover URL normalization", "Image proxy URL construction"
- **Smoke Test**: `scripts/smoke-test-production.sh` → "Testing Tidal Image Proxy", "Testing Cover Placeholder SVG"

### ⚠️ Non Modificare
- La whitelist `ALLOWED_HOST_SUFFIXES` 
- La configurazione CSP in `next.config.ts`
- Il fallback `onError` nelle UI
- Il proxy wrapper in search API

---

## 4. Automatic Playlist Integration

### 🐛 Problema
Quando il DJ accettava una richiesta, la canzone NON veniva aggiunta automaticamente alla playlist Tidal.

### ✅ Soluzione Applicata
**File**: [`src/lib/moderation.ts`](src/lib/moderation.ts)
**Commit**: `d983272`
**Data**: 2026-03-07

```typescript
// CRITICAL FIX: Auto-add to Tidal playlist on accept
try {
  if (session.catalog_type === 'tidal' && session.tidal_access_token && request.track_id) {
    // 1. Resolve user ID if missing
    if (!tidalUserId) {
      tidalUserId = await getTidalCurrentUserId(accessToken);
      // Save to DB
    }
    
    // 2. Create playlist if missing
    if (!playlistId) {
      const playlist = await createTidalPlaylist(session.name, accessToken, tidalUserId);
      playlistId = playlist.id;
      // Save to DB
    }
    
    // 3. Add track with fallback to search
    try {
      await addTrackToTidalPlaylist(playlistId, trackIdToAdd, accessToken);
    } catch {
      // Fallback: search by title+artist
      const searchResults = await searchTidal(searchQuery, accessToken, 5, 0);
      if (searchResults.tracks?.length > 0) {
        trackIdToAdd = searchResults.tracks[0].id;
        await addTrackToTidalPlaylist(playlistId, trackIdToAdd, accessToken);
      }
    }
    
    // 4. Mark as added
    await supabase
      .from('richieste_libere')
      .update({ tidal_added_status: 'success', tidal_added_at: new Date().toISOString() })
      .eq('id', requestId);
  }
} catch (tidalError) {
  // Mark as failed with error message
  await supabase
    .from('richieste_libere')
    .update({ 
      tidal_added_status: 'failed', 
      tidal_error_message: tidalError.message 
    })
    .eq('id', requestId);
}
```

**File**: [`src/app/api/tidal/playlist/route.ts`](src/app/api/tidal/playlist/route.ts)
- Auto-resolve `tidal_user_id` se mancante
- Usa getUserId API invece di richiedere user_id

### 🧪 Test di Protezione
- **E2E Test**: Manuale - accept request e verifica su Tidal
- **Database**: Controlla campo `tidal_added_status` su richieste

### ⚠️ Non Modificare
- La logica try-catch con fallback search
- Il tracking degli stati (pending/success/failed)
- L'auto-creazione della playlist
- Il resolve automatico di `tidal_user_id`

---

## 🛡️ Sistema di Protezione

### Test Automatici
Tutti questi fix sono protetti da:

1. **Unit Tests** (`tests/tidal.integration.test.ts`)
   - Eseguiti ad ogni commit
   - Verificano logica core

2. **Smoke Tests** (`scripts/smoke-test-production.sh`)
   - Eseguiti dopo ogni deploy su main
   - Verificano endpoint production live

3. **GitHub Actions** (`.github/workflows/ci.yml`)
   - CI/CD pipeline automatica
   - Blocca il merge se i test falliscono

### Comandi per Verificare

```bash
# Test unitari
npm test

# Smoke tests produzione
npm run test:smoke

# TypeScript check
npm run type-check

# Full CI pipeline
npm run ci
```

---

## 📊 Tracking dei Fix

| Fix | Commit | Data | Status | Test Coverage |
|-----|--------|------|--------|---------------|
| OAuth Domain | `86a5028` | 2026-03-03 | ✅ Stabile | Unit + Smoke |
| Token Expiry | `8dd807a` | 2026-03-02 | ✅ Stabile | Unit |
| Cover Images | `3bdc281` | 2026-03-03 | ✅ Stabile | Unit + Smoke |
| Auto Playlist | `d983272` | 2026-03-07 | ✅ Stabile | Manual E2E |

---

## 🚨 Checklist Prima di Modificare

Prima di modificare codice relativo a questi fix:

- [ ] Ho letto questo documento?
- [ ] Ho capito perché la fix è stata applicata?
- [ ] Ho verificato i test associati?
- [ ] La mia modifica mantiene la soluzione al problema originale?
- [ ] Ho aggiornato i test se necessario?

---

## 📝 Come Aggiungere Nuove Fix

Quando risolvi un nuovo bug ricorrente:

1. **Applica la fix** nel codice
2. **Scrivi test** che verificano la soluzione
3. **Deploya** in produzione
4. **Documenta qui** seguendo il template:
   - Problema
   - Soluzione (con snippet di codice)
   - File coinvolti
   - Test di protezione
   - Note su cosa non modificare

5. **Aggiorna la tabella** tracking

---

## 🔗 Link Utili

- [GitHub Actions Runs](https://github.com/mommydjsalmani-cloud/bangerrequest-mio/actions)
- [Vercel Dashboard](https://vercel.com/mommydjsalmani-cloud/bangerrequest-mio)
- [Production App](https://mommydj.com/richiedi)

---

**Ultima Revisione**: 2026-03-07  
**Maintainer**: @mommydjsalmani-cloud
