# Configurazione Sicurezza

## Sistema di Sicurezza Integrato

Il sistema BangerRequest implementa multiple difese contro attacchi comuni:

### 1. **Validazione Input** (`src/lib/validation.ts`)

Tutte le richieste vengono validate e sanitizzate prima dell'elaborazione.

#### Funzioni Principali

- `validateMusicRequest(payload)`: Valida e sanitizza richieste musicali complete
- `sanitizeString(input, maxLength)`: Rimuove caratteri pericolosi (null bytes, control chars, XSS)
- `validateUUID(id)`: Verifica formato UUID corretto
- `validateToken(token)`: Valida token di sessione

#### Limiti Configurati

```typescript
export const LIMITS = {
  TITLE_MAX: 200,
  ARTISTS_MAX: 200,
  ALBUM_MAX: 200,
  NOTE_MAX: 500,
  NAME_MAX: 100,
  TOKEN_LENGTH: 32,
};
```

#### Protezione XSS

La funzione `sanitizeString` rimuove:
- Tag HTML/script (`<script>`, `<img>`, etc.)
- Caratteri di controllo (0x00-0x1F)
- Null bytes
- Newlines/tabs eccessivi

#### Protezione SQL Injection

Supabase usa **prepared statements** nativamente. La validazione aggiunge un ulteriore layer:
- Limite lunghezza campi
- Sanitizzazione stringhe
- Type validation rigorosa

---

### 2. **Rate Limiting** (`src/lib/rateLimit.ts`)

Sistema di protezione contro abuse e DDoS.

#### Configurazioni Endpoint

```typescript
export const RATE_LIMITS = {
  // Richieste musicali: 3 ogni 60 secondi
  MUSIC_REQUEST: {
    maxRequests: 3,
    windowMs: 60000,
    blockDurationMs: 300000, // 5 minuti di blocco
  },
  
  // API DJ: 30 ogni 60 secondi
  DJ_API: {
    maxRequests: 30,
    windowMs: 60000,
    blockDurationMs: 600000, // 10 minuti
  },
  
  // Webhook Telegram: 100 ogni 60 secondi
  TELEGRAM_WEBHOOK: {
    maxRequests: 100,
    windowMs: 60000,
    blockDurationMs: 300000,
  },
  
  // Login: 5 tentativi ogni 15 minuti
  LOGIN: {
    maxRequests: 5,
    windowMs: 900000,
    blockDurationMs: 1800000, // 30 minuti
  },
};
```

#### Utilizzo negli Endpoint

```typescript
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(req: Request) {
  // Applica rate limiting
  const rateCheck = withRateLimit(req, RATE_LIMITS.MUSIC_REQUEST);
  if (!rateCheck.allowed) {
    return rateCheck.response; // 429 Too Many Requests
  }
  
  // ... logica endpoint
}
```

#### Identificazione Client

Il sistema identifica i client tramite (in ordine di priorità):
1. `x-forwarded-for` header (IP reale da proxy)
2. `x-real-ip` header
3. `user-agent` + `accept-language` (fallback)

#### Blocco Manuale

```typescript
import { blockIdentifier, unblockIdentifier } from '@/lib/rateLimit';

// Blocca IP specifico per 1 ora
blockIdentifier('192.168.1.100', 3600000);

// Sblocca
unblockIdentifier('192.168.1.100');
```

---

### 3. **Autenticazione**

#### Pannello DJ

Richiede credenziali via headers:
```
x-dj-secret: <DJ_PANEL_SECRET>
x-dj-user: <DJ_PANEL_USER>
```

Configurazione in `.env.local`:
```env
DJ_PANEL_SECRET=your-secret-min-16-chars
DJ_PANEL_USER=your-username
```

#### Webhook Telegram

Richiede secret token:
```
x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>
```

Configurazione:
```env
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-min-32-chars
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
TELEGRAM_CHAT_ID=@your_channel_id
```

#### Sessioni Pubbliche

Token univoco generato per ogni sessione:
```typescript
// Token: 32 caratteri random hex
const token = randomBytes(16).toString('hex');
```

Validato ad ogni richiesta:
```typescript
const { data: session } = await supabase
  .from('sessioni_libere')
  .select('*')
  .eq('token', token)
  .eq('archived', false)
  .single();
```

---

### 4. **Best Practices Deployment**

#### Environment Variables

**Obbligatori:**
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth DJ
DJ_PANEL_SECRET=min-16-chars-random-string
DJ_PANEL_USER=your-dj-username

# Spotify
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

**Opzionali (ma raccomandati):**
```env
# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_SECRET=min-32-chars-random-string
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
TELEGRAM_CHAT_ID=-1001234567890
ENABLE_TELEGRAM_NOTIFICATIONS=true

# Email (future)
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@bangerrequest.com
```

#### Headers di Sicurezza

In `next.config.ts`:
```typescript
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

#### CORS

Configurato in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "https://bangerrequest.com" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PATCH,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "X-DJ-Secret, X-DJ-User, Content-Type" }
      ]
    }
  ]
}
```

#### Database Security (Supabase)

**Row Level Security (RLS):**

```sql
-- Solo utenti autenticati possono modificare
CREATE POLICY "DJ can update requests" ON richieste_libere
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'dj@bangerrequest.com')
  );

-- Pubblico può solo inserire
CREATE POLICY "Public can insert requests" ON richieste_libere
  FOR INSERT WITH CHECK (true);

-- Tutti possono leggere (filtrare via app logic)
CREATE POLICY "Public can read requests" ON richieste_libere
  FOR SELECT USING (true);
```

---

### 5. **Monitoring e Logging**

#### Error Sanitization

Gli errori interni NON vengono esposti agli utenti:

```typescript
// ❌ MAI FARE:
catch (error) {
  return NextResponse.json({ error: error.message });
}

// ✅ CORRETTO:
catch (error) {
  console.error('[Internal]', error); // Log per debug
  return NextResponse.json({ error: 'database_error' }, { status: 500 });
}
```

#### Rate Limit Stats

Funzione admin per monitorare abuse:
```typescript
import { getRateLimitStats } from '@/lib/rateLimit';

const stats = getRateLimitStats();
console.log({
  totalEntries: stats.totalEntries,
  blockedCount: stats.blockedCount,
  activeCount: stats.activeCount,
});
```

---

### 6. **Checklist Pre-Deployment**

- [ ] `DJ_PANEL_SECRET` >= 16 caratteri random
- [ ] `TELEGRAM_WEBHOOK_SECRET` >= 32 caratteri random
- [ ] Rate limits configurati per ambiente (più restrittivi in prod)
- [ ] Headers di sicurezza abilitati
- [ ] CORS limitato ai domini autorizzati
- [ ] RLS policies attive su Supabase
- [ ] Logging errori sanitizzato (no `error.message` esposto)
- [ ] Variabili sensibili in environment variables (non in repo)
- [ ] HTTPS enforced (Vercel lo fa automaticamente)
- [ ] Backup database schedulato

---

### 7. **Incident Response**

#### Se rilevi abuse:

1. **Blocca IP immediatamente:**
   ```typescript
   blockIdentifier('suspicious-ip', 86400000); // 24h
   ```

2. **Verifica logs:**
   ```bash
   vercel logs --since=1h
   ```

3. **Aggiorna rate limits se necessario:**
   Riduci `maxRequests` in `RATE_LIMITS`

4. **Segnala a Vercel se DDoS serio:**
   https://vercel.com/support

#### Se rilevi data breach:

1. Revoca immediatamente tutti i token di sessione
2. Rigenera `DJ_PANEL_SECRET` e `TELEGRAM_WEBHOOK_SECRET`
3. Analizza logs Supabase per query anomale
4. Notifica utenti se dati sensibili esposti

---

### 8. **Testing Sicurezza**

Esegui tests di sicurezza prima di ogni deploy:

```bash
npm run test:security
```

Test coperti:
- XSS injection blocking
- SQL injection sanitization
- Rate limiting functionality
- UUID validation
- Auth requirements
- Length limits enforcement

---

### 9. **Aggiornamenti Sicurezza**

Mantieni dipendenze aggiornate:

```bash
npm audit
npm audit fix
```

Monitora CVE per:
- Next.js
- Supabase client
- React
- Node.js runtime

---

### Contatti

Per segnalazioni di sicurezza: **security@bangerrequest.com**  
Response time: < 24h per vulnerabilità critiche
