# 💾 Guida Backup e Ripristino

## 📦 Backup Creato

**Data:** 10 Novembre 2025  
**Tag Git:** `v1.0-basepath-fix`  
**Commit:** `6c0e615`

### Stato del Progetto al Backup

✅ **Funzionalità Verificate:**
- basePath condizionale (prod: `/richiedi`, dev: vuoto)
- Login DJ funzionante in produzione e sviluppo
- Sessioni attive caricabili
- API health check operativo
- Database Supabase connesso
- Spotify API configurato

✅ **Configurazione:**
- `next.config.ts`: basePath condizionale
- `src/lib/apiPath.ts`: BASE_PATH dinamico
- `.env.local`: NEXT_PUBLIC_BASE_PATH commentato

---

## 🔄 Come Ripristinare Questo Backup

### Metodo 1: Da Tag Git (Raccomandato)

```bash
# 1. Verifica tag disponibili
git tag -l

# 2. Ripristina il backup
git checkout v1.0-basepath-fix

# 3. Se vuoi creare un nuovo branch da questo punto
git checkout -b restored-from-backup v1.0-basepath-fix

# 4. Oppure forza il branch main a questo stato (ATTENZIONE!)
git reset --hard v1.0-basepath-fix
git push origin main --force
```

### Metodo 2: Da Commit Specifico

```bash
# Ripristina al commit specifico
git reset --hard 6c0e615

# Forza push (se necessario)
git push origin main --force
```

### Metodo 3: Da File Tar.gz

```bash
# Se hai il file backup tar.gz
cd /workspaces
tar -xzf bangerrequest-backup-20251110-164239.tar.gz -C bangerrequest-restored

# Reinstalla dipendenze
cd bangerrequest-restored
npm install

# Copia .env.local (se non incluso nel backup)
# Avvia server
npm run dev
```

---

## 📋 Checklist Post-Ripristino

Dopo aver ripristinato, verifica:

```bash
# 1. Reinstalla dipendenze (sempre consigliato)
npm install

# 2. Verifica configurazione
bash scripts/fix-basepath.sh

# 3. Avvia server locale
npm run dev

# 4. Test endpoint
curl http://localhost:3000/api/health

# 5. Verifica .env.local
cat .env.local
```

**File critici da controllare:**
- [ ] `.env.local` presente con credenziali corrette
- [ ] `next.config.ts` con basePath condizionale
- [ ] `src/lib/apiPath.ts` con BASE_PATH corretto

---

## 🆘 Verifica Rapida Configurazione

```bash
# Script automatico
bash scripts/fix-basepath.sh

# Oppure manualmente:
grep "basePath:" next.config.ts
grep "BASE_PATH" src/lib/apiPath.ts
grep "NEXT_PUBLIC_BASE_PATH" .env.local
```

---

## 📊 Informazioni Versione

### File Modificati nell'Ultimo Commit

```
docs/BASEPATH_CONFIG.md (nuovo)
scripts/fix-basepath.sh (nuovo)
```

### Commit Precedenti Rilevanti

- `5e41ea0` - fix: corretto apiPath per gestire basePath in produzione
- `8852885` - feat: basePath condizionale per sviluppo locale

---

## 🔐 Credenziali (Sviluppo)

**⚠️ Non committare mai le credenziali vere!**

File: `.env.local` (esempio sviluppo)

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
DJ_PANEL_SECRET=77
DJ_PANEL_USER=test

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_USER_ID=your_user_id
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# NEXT_PUBLIC_BASE_PATH=/richiedi  # <- DEVE essere commentato!
```

---

## 📝 Note Importanti

1. **basePath:** DEVE essere condizionale (`production` vs `development`)
2. **apiPath.ts:** BASE_PATH deve corrispondere a next.config.ts
3. **.env.local:** NEXT_PUBLIC_BASE_PATH deve essere commentato
4. **Produzione:** URL con `/richiedi` prefix
5. **Sviluppo:** URL senza prefix

---

## 🔗 Riferimenti Utili

- **Tag Git:** https://github.com/mommydjsalmani-cloud/bangerrequest-mio/releases/tag/v1.0-basepath-fix
- **Documentazione:** `/docs/BASEPATH_CONFIG.md`
- **Deploy Vercel:** `/docs/DEPLOY_VERCEL.md`
- **Script Verifica:** `/scripts/fix-basepath.sh`

---

## 🚀 Deploy da Questo Backup

```bash
# 1. Assicurati di essere sul tag/commit corretto
git checkout v1.0-basepath-fix

# 2. Crea un nuovo branch
git checkout -b deploy-from-backup

# 3. Verifica tutto sia ok
bash scripts/fix-basepath.sh

# 4. Deploy su Vercel (automatico con push)
git push origin deploy-from-backup

# Oppure merge su main
git checkout main
git merge deploy-from-backup
git push origin main
```

---

**Backup creato il:** 10 Novembre 2025, 16:42 UTC  
**Ultimo test riuscito:** ✅ Locale e Produzione verificati

*Mantieni questo documento aggiornato ad ogni backup importante!*
