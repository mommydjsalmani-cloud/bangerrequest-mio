## Banger Request

App Next.js per richieste brani con ricerca Spotify, pannello DJ e persistenza opzionale su Supabase.

### 🚀 Quick Start
```bash
npm install
npm run dev
```
Apri http://localhost:3000

### 📋 Scripts Disponibili
```bash
npm run dev          # Avvia development server
npm run build        # Build production
npm run start        # Avvia production server
npm run lint         # Esegue ESLint
npm run lint:fix     # Fix automatico ESLint
npm run test         # Esegue test
npm run test:watch   # Test in watch mode
npm run type-check   # TypeScript check
npm run ci           # Pipeline completa (lint + test + build)
npm run health       # Health check locale
npm run clean        # Pulisce cache
```

### 🔧 Requisiti
- Node.js 18+
- Variabili ambiente (vedi `.env.example`)

### 🏗️ CI/CD
Il progetto include GitHub Actions per:
- **CI Pipeline**: Lint, test, build automatici su PR/push
- **Auto Deploy**: Staging su develop, Production su main
- **Health Monitoring**: Controlli ogni 15 minuti
- **Dependency Updates**: Aggiornamenti automatici settimanali

### 🔒 Security
- ✅ Nessun secret committato
- ✅ ESLint configurato con regole strict
- ✅ Health checks automatici
- ✅ Audit dipendenze settimanale

### 🚀 Deploy su Vercel
1. Collega il repo su Vercel
2. Imposta ENV (Production/Preview/Development):
	- Obbligatorie autenticazione DJ (senza queste NON puoi creare/moderare eventi): `DJ_PANEL_USER`, `DJ_PANEL_SECRET`
	- Spotify API: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
	- Persistenza (facoltative, se assenti usa storage in-memory volatile): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` per sola lettura anon)
   
Se `DJ_PANEL_USER` o `DJ_PANEL_SECRET` non sono impostate, le route protette restituiscono `{ ok:false, error:"misconfigured" }`.
3. Redeploy

### ⚙️ Setup Supabase (versione non tecnica)
1. Vai su https://supabase.com e crea un progetto (piano Free va bene).
2. Apri il progetto: Settings → API.
3. Copia "Project URL" e la chiave "service_role".
4. In Vercel → Project Settings → Environment Variables aggiungi:
	- `NEXT_PUBLIC_SUPABASE_URL` = (Project URL)
	- `SUPABASE_SERVICE_ROLE_KEY` = (service_role key)
5. Vai su Supabase → SQL → New Query → incolla contenuto di `docs/supabase_schema.sql` → Run.
6. Fai Redeploy dell'app su Vercel.
7. Controllo: visita `/api/health/supabase` deve restituire `ok:true`.

Se non imposti le variabili Supabase l'app funziona lo stesso ma i dati non sono persistenti (si perdono al riavvio).

### 📚 Guide
- Setup Spotify: `docs/SETUP_SPOTIFY.md`
- Setup Supabase: `docs/SETUP_SUPABASE.md`
- Deploy Vercel: `docs/DEPLOY_VERCEL.md`


