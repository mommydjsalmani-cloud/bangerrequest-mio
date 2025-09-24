# Setup Supabase (Persistenza)

Questa guida configura un database Postgres su Supabase per salvare richieste ed eventi in produzione.

## 1) Crea progetto Supabase
- Vai su https://supabase.com → New project
- Prendi da Settings → API:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo server, conserva in segreto)

### Quick steps to get keys

- Dopo aver creato il progetto, vai in Project → Settings → API. Copia il valore `API URL` (usalo come `NEXT_PUBLIC_SUPABASE_URL`) e `anon` / `service_role` keys. Usa la `service_role` solo per server-side.

## 2) Crea tabelle
- Apri SQL editor su Supabase
- Incolla ed esegui `docs/supabase_schema.sql`

## 3) Configura variabili su Vercel
In Project → Settings → Environment Variables (Production/Preview/Development):
- `NEXT_PUBLIC_SUPABASE_URL` = (dalla dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` = (dalla dashboard)
- `SPOTIFY_CLIENT_ID` = (Spotify Dev Dashboard)
- `SPOTIFY_CLIENT_SECRET` = (Spotify Dev Dashboard)
- `DJ_PANEL_SECRET` = (scegli una password robusta)

## 4) Redeploy e verifica
- Redeploy del progetto su Vercel
- Verifica:
  - `GET /api/requests` risponde 200
  - `POST /api/requests` crea una richiesta (da UI `/requests`)
  - `/dj` mostra le richieste dell'evento, le azioni funzionano

  ## Quick local testing

  - Copia `.env.local.example` in `.env.local` e riempi i valori `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` dal progetto Supabase.
  - Avvia localmente:

  ```bash
  npm install
  npm run dev
  ```

  - Verifica le chiamate API (esempio):

  ```bash
  curl -sS http://localhost:3000/api/health/supabase | jq
  ```

  Se la risposta indica che Supabase è configurato, l'app userà il database remoto per persistenza. In assenza di quelle variabili, l'app rimane in "modalità in-memory" (i dati vengono persi al riavvio del server).

## 5) Sicurezza
- Le azioni DJ (PATCH `/api/requests`) e gestione eventi (`/api/events`) richiedono header `x-dj-secret` = `DJ_PANEL_SECRET` se impostata.
- Non esporre mai la `SERVICE_ROLE_KEY` lato client.

## 6) Note
- In assenza di ENV Supabase, l'app usa un fallback in‑memory (non persistente) adatto solo a sviluppo.
- Per real‑time puoi attivare Supabase Realtime o SSE in futuro.
