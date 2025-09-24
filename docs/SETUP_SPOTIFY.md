# Setup Spotify (Client Credentials)

Questa guida spiega i passaggi per ottenere `Client ID` e `Client Secret` da Spotify e come configurarli su Vercel.

1. Crea un'app su Spotify Developer Dashboard
   - Vai su: https://developer.spotify.com/dashboard
   - Clicca su "Create an App" e compila i campi richiesti.
   - Copia `Client ID` e `Client Secret`.

2. Configura le environment variables su Vercel (consigliato)
   - Apri il Project su Vercel → Settings → Environment Variables.
   - Aggiungi le seguenti variabili (Environment: Production, Preview, Development):
     - `SPOTIFY_CLIENT_ID` = <your client id>
     - `SPOTIFY_CLIENT_SECRET` = <your client secret>
   - Salva e poi esegui un nuovo deploy.

3. Verifica
   - Dopo il deploy, prova l'endpoint:
     - `GET /api/spotify/search?q=blinding+lights`
   - Dovresti ricevere una risposta JSON con `tracks` contenente metadata e `preview_url` quando disponibile.

Note
 - Non commettere mai `Client Secret` nel repository.
 - In locale puoi copiare `.env.example` in `.env.local` e riempire i valori per sviluppo.

## Persistenza (consigliato) con Supabase

Per evitare perdita dati su ambienti serverless (Vercel), usa un DB Postgres gestito.

1. Crea un progetto su https://supabase.com
2. Copia `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` da Settings → API
3. In Vercel → Project Settings → Environment Variables aggiungi:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
4. Crea la tabella `requests` con questo schema minimo:

```sql
create table if not exists public.requests (
   id text primary key,
   created_at timestamptz not null default now(),
   track_id text not null,
   uri text,
   title text,
   artists text,
   album text,
   cover_url text,
   isrc text,
   explicit boolean,
   preview_url text,
   note text,
   event_code text,
   requester text,
   status text not null default 'new',
   duplicates integer not null default 0
);
create index if not exists idx_requests_event_code on public.requests(event_code);
create index if not exists idx_requests_created_at on public.requests(created_at desc);
```
4) (Opzionale ma consigliato) Tabella eventi per gestione evento nel pannello DJ

```sql
create table if not exists public.events (
   id uuid primary key default gen_random_uuid(),
   code text not null unique,
   name text not null,
   created_at timestamptz not null default now(),
   active boolean not null default true
);

create index if not exists idx_events_active on public.events(active);

5. Redeploy l'app e verifica `/api/requests`.
