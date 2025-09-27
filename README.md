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
	- Obbligatorie autenticazione DJ (senza queste NON puoi creare/moderare eventi): `DJ_PANEL_USER`, `DJ_PANEL_SECRET`
	- Spotify API: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
	- Persistenza (facoltative, se assenti usa storage in-memory volatile): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY` per sola lettura anon)
   
Se `DJ_PANEL_USER` o `DJ_PANEL_SECRET` non sono impostate, le route protette restituiscono `{ ok:false, error:"misconfigured" }`.
3. Redeploy

### Setup Supabase (versione non tecnica)
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


### Guide
- Setup Spotify: `docs/SETUP_SPOTIFY.md`
- Setup Supabase: `docs/SETUP_SUPABASE.md`

