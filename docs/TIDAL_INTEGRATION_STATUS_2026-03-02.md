# Stato integrazione TIDAL — 2026-03-02

## Stato generale
- OAuth TIDAL operativo su dominio canonico `mommydj.com` con callback stabile.
- Ricerca TIDAL attiva con ranking per rilevanza + popolarità.
- Durata tracce risolta (parse robusto anche formati ISO come `PT3M2S`).
- Aggiunta playlist TIDAL attiva su accettazione richiesta (panel + moderation flow).
- Protezione contro doppi inserimenti in playlist abilitata.

## Copertine: comportamento atteso
- Una parte delle tracce TIDAL non espone artwork nel payload API (provider-side).
- Quando artwork è disponibile, l'app usa:
  1. Search payload OpenAPI
  2. Fallback album (`coverArt`, `suggestedCoverArts`)
  3. Fallback track (`albums.coverArt`, `albums.suggestedCoverArts`)
  4. Proxy interno immagini `/api/tidal/image`
- Quando artwork non è disponibile da provider, l'app mostra placeholder locale (`/cover-placeholder.svg`).

## UX ricerca
- I risultati sono ordinati con priorità a:
  1. Match forti su titolo/artista
  2. Popolarità TIDAL
- È usato un campione più ampio in fetch e poi viene restituito il top N per mostrare prima i brani più noti.

## Hardening e sicurezza
- Rimossi log verbosi/sensibili su OAuth callback/auth e salvataggio token lato admin.
- Persistenza token lato server già attiva in callback.

## Note operative
- Se in UI sembrano "mancare" alcune copertine: verificare che si veda il placeholder. In tal caso il comportamento è corretto (artwork assente lato provider).
- Endpoint health produzione: `/richiedi/api/health`.

## File principali coinvolti
- `src/lib/tidal.ts`
- `src/app/api/tidal/search/route.ts`
- `src/app/api/tidal/image/route.ts`
- `src/app/richieste/page.tsx`
- `src/app/api/tidal/auth/route.ts`
- `src/app/api/tidal/callback/route.ts`
- `src/app/api/libere/admin/route.ts`
