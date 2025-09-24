## Banger Request

App Next.js per richieste brani con ricerca Spotify, pannello DJ e persistenza opzionale su Supabase.

### Requisiti
- Node.js 18+
- Variabili ambiente (vedi `.env.example`)

### Sviluppo
```bash
npm install
npm run dev
```
Apri http://localhost:3000

### Deploy su Vercel
1. Collega il repo su Vercel
2. Imposta ENV (Production/Preview/Development):
	- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
	- `DJ_PANEL_SECRET`
	- Facoltative (persistenza): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy

### Guide
- Setup Spotify: `docs/SETUP_SPOTIFY.md`
- Setup Supabase: `docs/SETUP_SUPABASE.md`

Quick verify for Supabase (after creating `.env.local`):

```bash
./scripts/verify_supabase.sh http://localhost:3000
```

