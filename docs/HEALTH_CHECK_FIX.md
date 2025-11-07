# Production Health Check - Risoluzione Problema 404

## 🔍 Problema Identificato

Il workflow GitHub Actions per il health check falliva con errore HTTP 404 perché cercava gli endpoint API usando il basePath `/richiedi`:
- ❌ `https://example.com/richiedi/api/health` → 404 NOT FOUND
- ✅ `https://example.com/api/health` → 200 OK

**Causa Root**: Su Vercel, le API routes (directory `app/api/`) NON utilizzano mai il `basePath` configurato in `next.config.ts`. Il basePath si applica solo alle pagine (page routes).

## ✅ Soluzioni Implementate

### 1. Aggiornamento Script di Health Check
**File modificati**:
- `scripts/check_health.js`
- `scripts/check_health.cjs`

**Modifiche**:
- Cambiato URL predefinito da `/api/health/supabase` a `/api/health`
- Aggiunto logging dell'URL controllato per debug più semplice

```javascript
// Prima
const url = process.argv[2] || 'http://localhost:3000/api/health/supabase';

// Dopo
const url = process.argv[2] || 'http://localhost:3000/api/health';
console.log('Checking', url);
```

### 2. Correzione Workflow GitHub Actions
**File**: `.github/workflows/health-check.yml`

**Modifiche principali**:
- Rimosso `BASE_PATH` dagli URL delle API
- Aggiunto logging dettagliato per debugging
- Aggiunto commento esplicativo sul comportamento di Vercel
- Homepage check su root `/` invece di `/richiedi/`

**Prima**:
```bash
curl "${PROD_URL}${BASE_PATH}/api/health"  # ❌ 404
```

**Dopo**:
```bash
curl "${PROD_URL}/api/health"  # ✅ 200
```

### 3. Script di Test Produzione
**Nuovo file**: `scripts/test-production-health.sh`

Script bash per testare localmente il health check esattamente come fa GitHub Actions:
```bash
bash scripts/test-production-health.sh
```

Verifica:
- ✅ `/api/health` (main health)
- ✅ `/api/health/supabase` (database)
- ✅ `/api/spotify/health` (Spotify API)
- ✅ `/` (homepage)

### 4. Documentazione Aggiornata
**File**: `scripts/README.md`

Aggiunto avviso importante:
> **Important**: API routes on Vercel do NOT use the `basePath` configuration. Always use `/api/*` paths directly, not `/richiedi/api/*`.

## 🧪 Test Eseguiti

Tutti i test passano con successo:

```bash
✅ Main health check passed (200)
✅ Supabase health check passed (200)
✅ Spotify health check passed (200)
✅ Homepage loads successfully (200)
```

Response body sample:
```json
{
  "ok": true,
  "mode": "supabase",
  "tables": {
    "requests": true,
    "events": true
  }
}
```

## 📊 Endpoint Status Summary

| Endpoint | URL | Status | Note |
|----------|-----|--------|------|
| Main Health | `/api/health` | ✅ 200 | Controlla DB, Auth, Spotify |
| Supabase | `/api/health/supabase` | ✅ 200 | Controlla tabelle DB |
| Spotify | `/api/spotify/health` | ✅ 200 | Controlla connessione Spotify API |
| Homepage | `/` | ✅ 200 | Carica pagina principale |
| ~~Old (wrong)~~ | ~~/richiedi/api/health~~ | ❌ 404 | basePath non si applica alle API |

## 🚀 Prossimi Passi

1. **Commit & Push**: Pushare le modifiche al repository
2. **Test Automatico**: Il workflow GitHub Actions girerà automaticamente ogni 15 minuti
3. **Verifica Manuale**: Puoi anche triggerare manualmente il workflow da GitHub Actions tab

## 🔗 Link Utili

- Production URL: https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app
- Health Endpoint: https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app/api/health
- GitHub Actions: `.github/workflows/health-check.yml`

## 📝 Note Tecniche

### Perché le API non usano basePath su Vercel?

Vercel tratta le API routes come serverless functions separate, non come parte del routing Next.js delle pagine. Il `basePath` è una configurazione del router Next.js per le pagine, non per le API.

### Comportamento Locale vs Produzione

- **Locale (dev server)**: `basePath` può applicarsi anche alle API
- **Vercel (produzione)**: API routes sono sempre su `/api/*`, indipendentemente dal basePath

Questo è un comportamento documentato di Vercel e richiede che gli URL delle API siano sempre assoluti senza basePath.
