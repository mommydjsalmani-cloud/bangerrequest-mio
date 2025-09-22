# Banger Request

App Next.js per richieste musicali: l'utente inserisce Nome + Codice Evento, cerca un brano su Spotify (metadata + preview 30s quando disponibile) e invia la richiesta al DJ.

Quick start

1. Installa dipendenze:

```bash
npm install
```

2. Ambiente di sviluppo:

```bash
npm run dev
```

3. Apri `http://localhost:3000` nel browser.

Spotify (Client Credentials)

1. Crea un'app in Spotify Developer Dashboard: https://developer.spotify.com/dashboard
2. Copia `Client ID` e `Client Secret` dall'app creata.
3. Aggiungi le variabili d'ambiente nel tuo progetto Vercel (Project → Settings → Environment Variables):
   - `SPOTIFY_CLIENT_ID` = <your client id>
   - `SPOTIFY_CLIENT_SECRET` = <your client secret>
   (imposta per Production, Preview e Development)

Environment variables richieste

- `SPOTIFY_CLIENT_ID` — Client ID dall'app Spotify
- `SPOTIFY_CLIENT_SECRET` — Client Secret dall'app Spotify (segreto)
- `NEXT_PUBLIC_BASE_URL` — opzionale, base URL pubblico per chiamate client-side (es. https://yourdomain.com)

Esempio locale

```bash
cp .env.example .env.local
# modifica .env.local e riempi i valori
```

Test endpoint

- `GET /api/spotify/search?q=shape+of+you` — cerca brani (metadata + `preview_url` quando disponibile)
- `POST /api/requests` — salva una richiesta (in-memory nella versione attuale)

Security

- Non committare `SPOTIFY_CLIENT_SECRET` o altri segreti nel repository.
- In produzione usa le Environment Variables del provider (Vercel).
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
