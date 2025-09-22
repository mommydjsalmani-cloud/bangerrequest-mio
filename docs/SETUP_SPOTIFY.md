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
