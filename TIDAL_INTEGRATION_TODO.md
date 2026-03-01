# Tidal Integration - Completamento TODO

## ✅ Completato (Backend)

1. **Database Migration** - [scripts/migrate_add_tidal_support.sql](scripts/migrate_add_tidal_support.sql)
2. **Tidal API Client** - [src/lib/tidal.ts](src/lib/tidal.ts)
3. **OAuth Endpoints** - `/api/tidal/auth` + `/api/tidal/callback`
4. **Ricerca Tidal** - `/api/tidal/search`
5. **Gestione Playlist** - `/api/tidal/playlist`
6. **Auto-add Logic** - Quando DJ accetta richiesta con Tidal attivo
7. **Admin Actions** - `switch_catalog`, `save_tidal_auth`

---

## ⏳ Da Completare (Frontend/UI)

### 1. Encryption Key (IMPORTANTE)

Aggiungi al file `.env.local`:
```bash
# Chiave encryption per token Tidal (32 caratteri)
ENCRYPTION_KEY_TIDAL=your-32-character-encryption-key-here123456
```

Genera una chiave sicura:
```bash
openssl rand -hex 16
```

### 2. UI Pannello DJ - Toggle Catalogo

Modifiche in `src/app/dj/libere/page.tsx`:

**A) Aggiungi funzione switch catalog** (dopo `toggleHomepageVisibility`, circa riga 565):

```typescript
// Cambia catalogo Deezer/Tidal
const switchCatalog = async (catalogType: 'deezer' | 'tidal') => {
  if (!selectedSessionId || !authed) return;
  
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(apiPath('/api/libere/admin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-user': username,
        'x-dj-secret': password
      },
      body: JSON.stringify({
        action: 'switch_catalog',
        session_id: selectedSessionId,
        catalog_type: catalogType
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      setSuccess(`Catalogo: ${catalogType === 'tidal' ? 'Tidal 🎵' : 'Deezer 🎵'}`);
      await loadSessionData(selectedSessionId);
    } else {
      setError(data.error || 'Errore cambio catalogo');
    }
  } catch (error) {
    setError('Errore connessione');
  } finally {
    setLoading(false);
  }
};

// Avvia OAuth Tidal
const initTidalAuth = async () => {
  if (!authed) return;
  
  setLoading(true);
  
  try {
    const response = await fetch(apiPath('/api/tidal/auth'), {
      headers: {
        'x-dj-user': username,
        'x-dj-secret': password
      }
    });
    
    const data = await response.json();
    
    if (data.ok && data.authUrl) {
      sessionStorage.setItem('tidal_session_id', selectedSessionId);
      window.location.href = data.authUrl;
    } else {
      setError(data.error || 'Errore auth Tidal');
    }
  } catch (error) {
    setError('Errore connessione Tidal');
  } finally {
    setLoading(false);
  }
};
```

**B) Aggiungi useEffect per callback OAuth** (dopo caricamento credenziali):

```typescript
// Gestisci callback OAuth Tidal
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('tidal_success')) {
    const accessToken = params.get('tidal_access_token');
    const refreshToken = params.get('tidal_refresh_token');
    const userId = params.get('tidal_user_id');
    const expiresAt = params.get('tidal_expires_at');
    const savedSessionId = sessionStorage.getItem('tidal_session_id');
    
    if (accessToken && refreshToken && savedSessionId) {
      setLoading(true);
      
      fetch(apiPath('/api/libere/admin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action: 'save_tidal_auth',
          session_id: savedSessionId,
          tidal_access_token: accessToken,
          tidal_refresh_token: refreshToken,
          tidal_user_id: userId,
          tidal_token_expires_at: expiresAt
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setSuccess('✅ Tidal autenticato!');
          sessionStorage.removeItem('tidal_session_id');
          setSelectedSessionId(savedSessionId);
          loadSessionData(savedSessionId);
          // Pulisci URL
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setError(data.error || 'Errore salvataggio');
        }
      })
      .catch(() => setError('Errore connessione'))
      .finally(() => setLoading(false));
    }
  }
  
  if (params.has('tidal_error')) {
    setError(`Errore Tidal: ${params.get('tidal_error')}`);
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

**C) Aggiungi pulsanti nella UI** (nella griglia controlli, dopo pulsante Homepage, circa riga 1160):

```typescript
{/* Toggle Catalogo Deezer/Tidal */}
{currentSession && (
  <div className="col-span-full sm:col-span-2 bg-gray-50 border border-gray-300 rounded-lg p-3">
    <div className="text-sm font-semibold text-gray-700 mb-2">🎵 Catalogo Musica</div>
    <div className="flex gap-2">
      <button
        onClick={() => switchCatalog('deezer')}
        disabled={loading || currentSession.catalog_type === 'deezer'}
        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
          currentSession.catalog_type === 'deezer' || !currentSession.catalog_type
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Deezer
      </button>
      <button
        onClick={() => switchCatalog('tidal')}
        disabled={loading || currentSession.catalog_type === 'tidal'}
        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
          currentSession.catalog_type === 'tidal'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Tidal
      </button>
    </div>
    
    {/* Pulsante Auth Tidal se non autenticato */}
    {currentSession.catalog_type === 'tidal' && !currentSession.tidal_access_token && (
      <button
        onClick={initTidalAuth}
        disabled={loading}
        className="w-full mt-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
      >
        🔑 Accedi a Tidal
      </button>
    )}
    
    {/* Stato autenticazione */}
    {currentSession.catalog_type === 'tidal' && currentSession.tidal_access_token && (
      <div className="mt-2 text-xs text-green-600 font-medium">
        ✅ Tidal autenticato
        {currentSession.tidal_playlist_id && ' • Playlist attiva'}
      </div>
    )}
  </div>
)}
```

### 3. Flag Stato Tidal nella Lista Richieste

In `src/app/dj/libere/page.tsx`, nella sezione dove mostri ogni richiesta (circa riga 1400-1500), aggiungi:

```typescript
{/* Flag stato Tidal */}
{currentSession?.catalog_type === 'tidal' && request.status === 'accepted' && (
  <div className="text-xs mt-1">
    {request.tidal_added_status === 'success' && (
      <span className="text-green-600 font-medium">✅ Su Tidal</span>
    )}
    {request.tidal_added_status === 'pending' && (
      <span className="text-yellow-600 font-medium">⏳ Aggiunta a Tidal...</span>
    )}
    {request.tidal_added_status === 'failed' && (
      <span className="text-red-600 font-medium">
        ❌ Errore Tidal
        <button
          onClick={() => retryTidalAdd(request.id)}
          className="ml-2 text-blue-600 hover:underline"
        >
          Riprova
        </button>
      </span>
    )}
  </div>
)}
```

### 4. Retry Logic per Brani Failed

Aggiungi funzione retry:

```typescript
const retryTidalAdd = async (requestId: string) => {
  if (!authed) return;
  
  setLoading(true);
  
  try {
    // Forza retry impostando lo status di nuovo ad 'accepted'
    // Il backend rileverà che è Tidal e riproverà
    await act(requestId, 'accepted');
    setSuccess('Tentativo aggiunta Tidal...');
  } catch (error) {
    setError('Errore retry');
  } finally {
    setLoading(false);
  }
};
```

### 5. Retry Automatico con Backoff (Opzionale - Worker Separato)

Crea `src/app/api/tidal/retry/route.ts`:

```typescript
// Endpoint cron per retry automatico brani failed
// Da chiamare ogni 30 secondi con Vercel Cron o simile

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { addTrackToTidalPlaylist, decryptToken } from '@/lib/tidal';

export async function GET(req: Request) {
  // Verifica authorization (secret per cron)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }
  
  // Trova richieste failed con retry < 5
  const { data: failedRequests } = await supabase
    .from('richieste_libere')
    .select('*, sessioni_libere!inner(*)')
    .eq('tidal_added_status', 'failed')
    .lt('tidal_retry_count', 5)
    .eq('status', 'accepted');
  
  let retried = 0;
  let succeeded = 0;
  
  for  (const request of failedRequests || []) {
    if (!request.track_id || !request.sessioni_libere.tidal_access_token) continue;
    
    try {
      const accessToken = decryptToken(request.sessioni_libere.tidal_access_token);
      const playlistId = request.sessioni_libere.tidal_playlist_id;
      
      if (playlistId) {
        await addTrackToTidalPlaylist(playlistId, request.track_id, accessToken);
        
        await supabase
          .from('richieste_libere')
          .update({
            tidal_added_status: 'success',
            tidal_added_at: new Date().toISOString(),
            tidal_error_message: null
          })
          .eq('id', request.id);
        
        succeeded++;
      }
    } catch (error) {
      await supabase
        .from('richieste_libere')
        .update({
          tidal_retry_count: (request.tidal_retry_count || 0) + 1,
          tidal_last_retry_at: new Date().toISOString(),
          tidal_error_message: error instanceof Error ? error.message : 'Unknown'
        })
        .eq('id', request.id);
      
      retried++;
    }
  }
  
  return NextResponse.json({
    ok: true,
    processed: (failedRequests || []).length,
    succeeded,
    retried
  });
}
```

---

## 🚀 Testing

1. **Crea sessione** nel pannello DJ
2. **Click "Tidal"** nel toggle catalogo
3. **Click "Accedi a Tidal"** → Login OAuth
4. **Torna al pannello** → Verify "✅ Tidal autenticato"
5. **Utente fa richiesta** sulla pagina pubblica
6. **Accetta richiesta** → Dovrebbe apparire in playlist Tidal
7. **Controlla Tidal** → Playlist creata con nome sessione

---

## 📝 Note Finali

- Token Tidal sono **criptati** nel DB (AES-256-GCM)
- Playlist **ricreata automaticamente** se eliminata
- Auto-add in **background** (non blocca risposta)
- Retry **automatico** per errori (max 5 tentativi)
- **Flag visivi** per stato aggiunta (✅⏳❌)

---

## ⚠️ Variabili Ambiente Necessarie

**.env.local** (locale):
```bash
TIDAL_CLIENT_ID=idFgAHYGPxhWmsDq
TIDAL_CLIENT_SECRET=<your_secret>
TIDAL_REDIRECT_URI=http://localhost:3000/api/tidal/callback
ENCRYPTION_KEY_TIDAL=<32-char-key>
```

**Vercel** (produzione):
```bash
TIDAL_CLIENT_ID=idFgAHYGPxhWmsDq
TIDAL_CLIENT_SECRET=<your_secret>
TIDAL_REDIRECT_URI=https://bangerrequest-mio.vercel.app/richiedi/api/tidal/callback
ENCRYPTION_KEY_TIDAL=<32-char-key>
CRON_SECRET=<random-secret-for-retry-endpoint>
```

---

**Buon lavoro! 🎵**
