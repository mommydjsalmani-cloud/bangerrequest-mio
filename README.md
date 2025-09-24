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
	- Obbligatorie autenticazione DJ: `DJ_PANEL_USER`, `DJ_PANEL_SECRET`
	- Spotify API: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
	- Persistenza (facoltative, se assenti usa storage in-memory volatile): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` per sola lettura anon)
   
Se `DJ_PANEL_USER` o `DJ_PANEL_SECRET` non sono impostate, le route protette restituiscono `{ ok:false, error:"misconfigured" }`.
3. Redeploy

### Guide
- Setup Spotify: `docs/SETUP_SPOTIFY.md`
- Setup Supabase: `docs/SETUP_SUPABASE.md`

