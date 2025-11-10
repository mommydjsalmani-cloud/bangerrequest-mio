# 🔧 Configurazione BasePath - Guida di Riferimento

## ⚙️ Configurazione Corretta (NON MODIFICARE!)

L'applicazione usa un **basePath condizionale** per funzionare sia in sviluppo locale che in produzione su mommydj.com.

### 🎯 Comportamento

| Ambiente | BasePath | URL Esempio |
|----------|----------|-------------|
| **Sviluppo** (localhost) | ` ` (vuoto) | `http://localhost:3000/dj/login` |
| **Produzione** (Vercel) | `/richiedi` | `https://www.mommydj.com/richiedi/dj/login` |

---

## 📄 File Critici

### 1. `next.config.ts` (Riga ~5)

```typescript
const nextConfig: NextConfig = {
  // Base path per deployment sotto /richiedi su mommydj.com
  // Solo in produzione, in sviluppo locale usa la root
  basePath: process.env.NODE_ENV === 'production' ? '/richiedi' : '',
  
  // ... resto configurazione
}
```

**❌ NON modificare questa riga!**

---

### 2. `src/lib/apiPath.ts` (Riga ~6)

```typescript
// BasePath deve corrispondere a quello in next.config.ts
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/richiedi' : '';

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}

export function routePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}

export function publicPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}
```

**❌ NON modificare `BASE_PATH`!**

---

### 3. `.env.local`

```bash
# Base Path per Next.js (vuoto in sviluppo, /richiedi in produzione)
# NEXT_PUBLIC_BASE_PATH=/richiedi
```

**⚠️ La riga DEVE essere commentata o assente!**

---

## 🧪 Test e Verifica

### Script di Verifica Automatico

```bash
# Esegui per verificare la configurazione
bash scripts/fix-basepath.sh
```

### Test Manuale Locale

```bash
# 1. Avvia il server
npm run dev

# 2. Testa endpoint (deve funzionare senza /richiedi)
curl http://localhost:3000/api/health

# 3. Apri browser
# http://localhost:3000/dj/login
```

### Test Manuale Produzione

```bash
# Testa endpoint produzione (deve funzionare con /richiedi)
curl https://www.mommydj.com/richiedi/api/health

# Apri browser
# https://www.mommydj.com/richiedi/dj/login
```

---

## 🆘 Problemi e Soluzioni

### ❌ "404 Not Found" in produzione

**Causa:** `apiPath()` non aggiunge `/richiedi` alle chiamate API

**Soluzione:**
```bash
# Verifica che BASE_PATH in apiPath.ts sia:
grep "BASE_PATH" src/lib/apiPath.ts
# Output atteso: const BASE_PATH = process.env.NODE_ENV === 'production' ? '/richiedi' : '';
```

### ❌ "404 Not Found" in locale

**Causa:** basePath configurato anche per sviluppo

**Soluzione:**
```bash
# 1. Verifica next.config.ts
grep basePath next.config.ts
# Output atteso: basePath: process.env.NODE_ENV === 'production' ? '/richiedi' : '',

# 2. Verifica .env.local (deve essere commentato)
grep NEXT_PUBLIC_BASE_PATH .env.local
# Output atteso: # NEXT_PUBLIC_BASE_PATH=/richiedi

# 3. Riavvia server
pkill -f "next dev"
npm run dev
```

### ❌ Login non funziona / Sessioni non si caricano

**Causa:** Le chiamate fetch non raggiungono l'API corretta

**Soluzione:**
1. Verifica che `apiPath.ts` abbia `BASE_PATH` corretto
2. Controlla la console browser (F12) per errori di rete
3. Verifica che le credenziali siano in sessionStorage

```javascript
// Apri Console Browser (F12) e esegui:
sessionStorage.getItem('dj_user')    // Deve ritornare 'test'
sessionStorage.getItem('dj_secret')  // Deve ritornare '77'
```

---

## 🔄 Come Ripristinare Configurazione Corretta

Se hai modificato qualcosa per errore:

```bash
# 1. Ripristina i file dall'ultimo commit valido
git checkout main -- next.config.ts src/lib/apiPath.ts .env.local

# 2. Verifica modifiche
git diff

# 3. Riavvia il server
pkill -f "next dev"
npm run dev

# 4. Esegui test di verifica
bash scripts/fix-basepath.sh
```

---

## 📝 Credenziali DJ (Sviluppo)

**File:** `.env.local`

```bash
DJ_PANEL_USER=test
DJ_PANEL_SECRET=77
```

**URL Login:**
- Locale: http://localhost:3000/dj/login
- Produzione: https://www.mommydj.com/richiedi/dj/login

---

## 🚀 Deploy

```bash
# 1. Commit modifiche
git add .
git commit -m "tua modifica"

# 2. Push (trigger automatico deploy Vercel)
git push origin main

# 3. Verifica deploy su Vercel
# https://vercel.com/dashboard
```

**⏱️ Tempo deploy:** ~1-2 minuti

---

## 📚 Riferimenti

- **Next.js BasePath:** https://nextjs.org/docs/app/api-reference/next-config-js/basePath
- **Vercel Deployment:** `/docs/DEPLOY_VERCEL.md`
- **Environment Variables:** `.env.local`, `.env.production`

---

**⚠️ IMPORTANTE:** Questa configurazione è stata testata e funziona. Non modificare senza necessità!

*Ultima modifica: 10 Novembre 2025*
