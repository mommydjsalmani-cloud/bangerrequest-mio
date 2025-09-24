# Setup Supabase (Persistenza)

Questa guida configura un database Postgres su Supabase per salvare richieste ed eventi in produzione.

## 1) Crea progetto Supabase
- Vai su https://supabase.com → New project
- Prendi da Settings → API:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo server, conserva in segreto)

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

## 5) Sicurezza
- Le azioni DJ (PATCH `/api/requests`) e gestione eventi (`/api/events`) richiedono header `x-dj-secret` = `DJ_PANEL_SECRET` se impostata.
- Non esporre mai la `SERVICE_ROLE_KEY` lato client.

## 6) Note
- In assenza di ENV Supabase, l'app usa un fallback in‑memory (non persistente) adatto solo a sviluppo.
- Per real‑time puoi attivare Supabase Realtime o SSE in futuro.
