# Vercel Topology (stato corrente)

Questo documento descrive la configurazione **attuale e funzionante** del deployment su Vercel.

## Obiettivo

- Una sola repository GitHub: `mommydjsalmani-cloud/bangerrequest-mio`
- Due progetti Vercel (separazione runtime/app):
  - `mommy-marketing` per il sito marketing pubblico
  - `bangerrequest-mio` per app richieste e API sotto `/richiedi`

## Progetti Vercel

### 1) mommy-marketing

- Root directory: `apps/marketing`
- Dominio: `mommydj.com`, `www.mommydj.com`
- Ruolo: homepage e pagine marketing
- Routing speciale: inoltra `/richiedi` e `/richiedi/:path*` a `bangerrequest-mio`
  tramite `apps/marketing/vercel.json`

### 2) bangerrequest-mio

- Root directory: repository root (`.`)
- Dominio tecnico: `bangerrequest-mio.vercel.app`
- Ruolo: app richieste, area DJ e API
- Base path applicativo in produzione: `/richiedi`

## Perché sono 2 progetti (pur avendo 1 repo)

Con la configurazione corrente:

- il marketing ha una sua app Next.js (`apps/marketing`)
- la app principale usa `basePath: /richiedi`

Per mantenere homepage su `/` e app richieste su `/richiedi` senza refactor invasivo,
la soluzione stabile è 1 repo + 2 progetti Vercel.

## URL attesi

- `https://mommydj.com/` → homepage marketing
- `https://mommydj.com/richiedi` → app richieste (proxy)
- `https://mommydj.com/richiedi/api/health` → health API app richieste

## Comandi utili

```bash
# Elenco progetti del team corrente
vercel project ls

# Ispezione dominio
vercel domains inspect mommydj.com

# Deploy marketing
cd apps/marketing && vercel deploy --prod

# Deploy app richieste
cd /workspaces/bangerrequest-mio && vercel deploy --prod
```

## Nota operativa

Se in futuro si vuole arrivare a **1 solo progetto Vercel**, serve un refactor
per servire marketing e app richieste dallo stesso build output Next.js.
