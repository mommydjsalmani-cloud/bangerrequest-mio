# 💾 Backup Pre-Integrazione Tidal

**Data Backup**: 1 Marzo 2026 - 11:31:03  
**Tag Git**: `v1.2-pre-tidal-deezer-stable`  
**Commit**: `ba536dd`  
**Branch**: `work`

---

## 📋 Stato Sistema

### ✅ Funzionalità Operative

#### Sistema Richieste Musicali
- **Deezer API** integrato e funzionante
- Ricerca brani via `/api/deezer/search`
- Normalizzazione tracks Deezer
- Preview audio (quando disponibili)
- Health check Deezer operativo

#### Pannello DJ
- Autenticazione con credenziali DJ
- Gestione sessioni libere
- Gestione richieste (accept/reject/cancel/play)
- Sistema voti (up/down)
- Archivio richieste
- Codici evento
- Visibilità homepage
- Rate limiting

#### Database (Supabase)
- Tabella `sessioni_libere` con colonne:
  - `id`, `token`, `name`, `status`, `created_at`, `updated_at`
  - `reset_count`, `last_reset_at`, `archived`
  - `rate_limit_enabled`, `rate_limit_seconds`
  - `notes_enabled`, `homepage_visible`, `homepage_priority`
  - `require_event_code`, `current_event_code`
  
- Tabella `richieste_libere` con colonne:
  - `id`, `session_id`, `created_at`
  - `track_id`, `uri`, `title`, `artists`, `album`, `cover_url`
  - `isrc`, `explicit`, `preview_url`, `duration_ms`
  - `requester_name`, `client_ip`, `user_agent`
  - `source` (deezer | spotify | manual)
  - `status` (new | accepted | rejected | cancelled | archived | played)
  - `note`, `archived`, `event_code`, `event_code_upper`
  - `accepted_at`, `rejected_at`, `cancelled_at`, `archived_at`, `played_at`
  - `up_votes`, `down_votes`

#### Sicurezza & Performance
- Rate limiting IP
- Health checks completi
- Error handling centralizzato
- Timeout protection
- Input validation
- CORS configurato

---

## 🎯 Prossimi Step (Tidal Integration)

### Modifiche Database Previste
Nuove colonne da aggiungere a `sessioni_libere`:
- `catalog_type` (deezer | tidal) - Default: deezer
- `tidal_playlist_id` (string, nullable)
- `tidal_access_token` (encrypted string, nullable)
- `tidal_user_id` (string, nullable)
- `tidal_refresh_token` (encrypted string, nullable)
- `tidal_token_expires_at` (timestamp, nullable)

Nuove colonne da aggiungere a `richieste_libere`:
- `tidal_added_status` (pending | success | failed | null)
- `tidal_added_at` (timestamp, nullable)
- `tidal_retry_count` (integer, default 0)
- `tidal_last_retry_at` (timestamp, nullable)
- `tidal_error_message` (text, nullable)

### Nuovi File da Creare
- `src/lib/tidal.ts` - Client Tidal API
- `src/app/api/tidal/auth/route.ts` - OAuth flow
- `src/app/api/tidal/callback/route.ts` - OAuth callback
- `src/app/api/tidal/search/route.ts` - Ricerca brani
- `src/app/api/tidal/playlist/route.ts` - Gestione playlist
- Migration SQL per aggiornamento schema

### Funzionalità da Implementare
1. **OAuth Tidal** (o Personal Access Token)
2. **Toggle catalogo** Deezer/Tidal nel pannello DJ
3. **Ricerca Tidal** in tempo reale
4. **Creazione playlist** automatica (nome = nome sessione)
5. **Auto-add brani** alla playlist quando accettati
6. **Ricreazione playlist** se eliminata dall'utente
7. **Retry logic** con backoff (5 tentativi, 30 sec)
8. **Flag UI** stato Tidal (✅ ⚠️ ❌) per ogni brano
9. **Pulsante retry manuale** nel pannello DJ
10. **Token encryption** nel database

---

## 🔄 Come Ripristinare Questo Backup

### Metodo 1: Da Tag Git

```bash
# Verifica tag
git tag -l

# Ripristina
git checkout v1.2-pre-tidal-deezer-stable

# Crea nuovo branch da questo punto (opzionale)
git checkout -b restored-pre-tidal v1.2-pre-tidal-deezer-stable

# Oppure forza main a questo stato (ATTENZIONE!)
git reset --hard v1.2-pre-tidal-deezer-stable
git push origin work --force
```

### Metodo 2: Da Commit

```bash
git reset --hard ba536dd
git push origin work --force
```

---

## 📋 Checklist Post-Ripristino

- [ ] `npm install`
- [ ] Verifica `.env.local`
- [ ] `npm run dev`
- [ ] Test `/api/health`
- [ ] Test ricerca Deezer
- [ ] Test pannello DJ login
- [ ] Verifica database Supabase

---

## 🔑 Environment Variables (Stato Attuale)

### Obbligatorie
- `DJ_PANEL_USER`
- `DJ_PANEL_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Opzionali
- `NEXT_PUBLIC_BASE_PATH` (default: vuoto in dev, `/richiedi` in prod)

### Da Aggiungere (Tidal)
- `TIDAL_CLIENT_ID` (da ottenere)
- `TIDAL_CLIENT_SECRET` (da ottenere)
- `TIDAL_REDIRECT_URI` (callback OAuth)
- `ENCRYPTION_KEY_TIDAL` (per criptare token)

---

**✅ Backup completato con successo**

Per ripristinare: `git checkout v1.2-pre-tidal-deezer-stable`
