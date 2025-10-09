# Sistema di Blocco Utenti - Richieste Libere

## 📝 Panoramica

Il sistema di blocco utenti consente ai DJ di bloccare utenti disruptivi che fanno richieste inappropriate nelle "richieste libere". Quando un utente viene bloccato:

- ✅ Non può più fare nuove richieste per quella sessione
- ✅ Riceve un messaggio di feedback chiaro: "Utente bloccato. Contatta il DJ per assistenza."
- ✅ Il DJ può sbloccarlo in qualsiasi momento dal pannello di controllo
- ✅ Il blocco è specifico per sessione (IP + nome utente)

## 🏗️ Architettura

### Database Schema
```sql
-- Tabella per gli utenti bloccati
CREATE TABLE libere_blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES libere_sessions(id) ON DELETE CASCADE,
  ip VARCHAR(45) NOT NULL,
  requester_name VARCHAR(100),
  reason TEXT,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_by VARCHAR(100)
);

-- Indici per performance
CREATE INDEX idx_libere_blocked_session_ip ON libere_blocked_users(session_id, ip);
CREATE INDEX idx_libere_blocked_session_name ON libere_blocked_users(session_id, requester_name);
```

### API Endpoints

#### `GET /api/libere/blocking?session_id={id}`
**Descrizione**: Recupera lista utenti bloccati per una sessione
**Headers**: `x-dj-user`, `x-dj-secret`
**Response**:
```json
{
  "ok": true,
  "blocked_users": [
    {
      "id": "uuid",
      "ip": "192.168.1.100",
      "requester_name": "UserName",
      "reason": "Richieste inappropriate",
      "blocked_at": "2024-12-19T10:30:00Z",
      "blocked_by": "DJ1"
    }
  ]
}
```

#### `POST /api/libere/blocking`
**Descrizione**: Blocca un utente
**Headers**: `x-dj-user`, `x-dj-secret`
**Body**:
```json
{
  "session_id": "uuid",
  "ip": "192.168.1.100",
  "requester_name": "UserName",
  "reason": "Motivo del blocco"
}
```

#### `DELETE /api/libere/blocking`
**Descrizione**: Sblocca un utente
**Headers**: `x-dj-user`, `x-dj-secret`
**Body**:
```json
{
  "block_id": "uuid"
}
```

### Controllo Blocco nelle Richieste

Nel file `/src/app/api/libere/route.ts`, la funzione `checkUserBlocked` verifica se un utente è bloccato:

```typescript
async function checkUserBlocked(sessionId: string, clientIp: string, requesterName?: string) {
  const { data } = await supabase
    .from('libere_blocked_users')
    .select('*')
    .eq('session_id', sessionId)
    .or(`ip.eq.${clientIp},requester_name.ilike.${requesterName || ''}`)
    .limit(1);
  
  return data && data.length > 0;
}
```

## 🎛️ Interfaccia Utente DJ

### Pannello di Controllo (`/dj/libere`)

Ogni card richiesta ora include pulsanti per bloccare/sbloccare utenti:

- **🚫 Blocca utente**: Blocca l'utente (IP + nome)
- **🔓 Sblocca utente**: Sblocca l'utente (appare solo se già bloccato)

I pulsanti sono visibili in tutti gli stati delle richieste (new, accepted, rejected, cancelled) ma non nelle richieste archiviate.

### Stato Visivo
- I pulsanti diventano grigi e disabilitati durante le operazioni
- Il testo cambia dinamicamente basato sullo stato di blocco
- Loading states durante le operazioni API

## 🧪 Testing

### Test Manuale

1. **Setup**:
   ```bash
   npm run dev
   # Vai su http://localhost:3000/libere
   # Crea una sessione di test
   ```

2. **Test Blocco**:
   - Fai una richiesta con nome utente
   - Vai al pannello DJ (`/dj/login` → `/dj/libere`) 
   - Trova la richiesta e clicca "🚫 Blocca utente"
   - Torna alla pagina libere e prova a fare un'altra richiesta
   - Dovresti vedere: "Utente bloccato. Contatta il DJ per assistenza."

3. **Test Sblocco**:
   - Dal pannello DJ, clicca "🔓 Sblocca utente"
   - Torna alla pagina libere e riprova la richiesta
   - Dovrebbe funzionare normalmente

### Test Automatico

```bash
# Assicurati che il server sia attivo
npm run dev

# Esegui il test completo
./scripts/test_user_blocking.sh
```

Il test automatico verifica:
- ✅ Creazione sessione
- ✅ Prima richiesta utente (accettata)
- ✅ Blocco utente dal pannello DJ
- ✅ Seconda richiesta (rifiutata con messaggio)
- ✅ Verifica lista utenti bloccati
- ✅ Sblocco utente
- ✅ Terza richiesta (accettata)
- ✅ Verifica lista vuota

## 🔧 Implementazione Tecnica

### File Modificati/Creati:

1. **Database**: `/scripts/migrate_add_user_blocking.sql`
2. **API Blocco**: `/src/app/api/libere/blocking/route.ts`
3. **API Richieste**: `/src/app/api/libere/route.ts` (aggiunto controllo blocco)
4. **UI DJ**: `/src/app/dj/libere/page.tsx` (aggiunto pulsanti e logica)
5. **Test**: `/scripts/test_user_blocking.sh`

### Funzioni Chiave:

```typescript
// Carica lista utenti bloccati
const loadBlockedUsers = async (sessionId: string)

// Blocca un utente  
const blockUser = async (clientIp: string, requesterName?: string, reason?: string)

// Sblocca un utente
const unblockUser = async (blockId: string)

// Verifica se utente è bloccato
const isUserBlocked = (ip: string, name?: string) => boolean

// Helper per pulsanti UI
const renderBlockButtons = (request: any) => JSX.Element
```

## 🚀 Benefici

- **Moderazione Proattiva**: I DJ possono gestire utenti problematici in tempo reale
- **Feedback Chiaro**: Gli utenti sanno quando sono bloccati e cosa fare
- **Reversibile**: I blocchi possono essere rimossi facilmente
- **Non Invasivo**: Il sistema non interferisce con il flusso normale
- **Sicuro**: Autenticazione DJ richiesta per tutte le operazioni di blocco

## 📋 Note Tecniche

- Il blocco è basato su **IP + nome utente** per sessione
- **Performance ottimizzata** con indici database appropriati
- **Error handling completo** con messaggi utente informativi  
- **UI responsive** con stati di caricamento
- **Test coverage** con script automatico end-to-end
- **Compatibilità** con tutte le funzionalità esistenti