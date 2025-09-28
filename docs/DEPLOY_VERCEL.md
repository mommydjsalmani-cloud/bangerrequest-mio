# Deploy su Vercel

Guida rapida per mettere online l'app Next.js.

## 1. Requisiti
- Account Vercel
- Repo GitHub collegata (branch `main`)
- Variabili d'ambiente segrete configurate

## 2. Variabili d'Ambiente
Imposta in Vercel (Project Settings -> Environment Variables):

| Nome | Descrizione | Ambiente |
|------|-------------|----------|
| DJ_PANEL_SECRET | Segreto per autenticare azioni DJ | All (o Production + Preview) |
| DJ_PANEL_USER | Identificatore utente DJ autorizzato | All |
| SUPABASE_URL | URL istanza Supabase (se usi DB) | All |
| SUPABASE_ANON_KEY | Chiave anon Supabase | All |
| SUPABASE_SERVICE_ROLE_KEY | (Opz.) Chiave service se richieste operazioni admin | Non esporre se non necessario |

Se mancano SUPABASE_* l'app ricade sullo store in-memory (volatile).

## 3. File `vercel.json`
È già presente e indica build standard:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## 4. Primo Deploy
1. Push su `main`.
2. In Vercel: Import Project -> seleziona repo -> conferma settings.
3. Controlla build log (devono passare install + build Next).

## 5. Test Rapido Post Deploy
Sostituisci `APP_URL` con il dominio Vercel.

```bash
curl -sS https://APP_URL/api/health | jq
curl -sS "https://APP_URL/api/requests?event_code=TEST" | jq
```

## 6. Creare Evento + Richiesta (script veloce)
```bash
DJ_PANEL_SECRET=... DJ_PANEL_USER=... \
curl -X POST https://APP_URL/api/events \
  -H "x-dj-secret: $DJ_PANEL_SECRET" -H "x-dj-user: $DJ_PANEL_USER" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Serata","code":"SRTA"}' | jq

curl -X POST https://APP_URL/api/requests \
  -H 'Content-Type: application/json' \
  -d '{"event_code":"SRTA","track_id":"trk1","title":"Brano","artists":"Artista","duration_ms":200000}' | jq
```

## 7. Duplicati Visivi
Richiama una seconda volta lo stesso `track_id` (o stessa coppia titolo+artisti): la card più recente verrà evidenziata in giallo nel pannello DJ (`/dj`).

## 8. Pull Request / Preview
Ogni branch aprirà automaticamente una Preview URL. Utile per testare nuove feature prima del merge.

## 9. Logs e Debug
In Vercel: Project -> Deployments -> apri l'ultimo -> Logs. Le route API loggano prefissi come `[events][POST]` e `[requests][duplicate]`.

## 10. Checklist Produzione
- [ ] Variabili DJ impostate
- [ ] Supabase configurato (se vuoi persistenza)
- [ ] Health endpoint risponde 200
- [ ] Creazione evento funziona
- [ ] Richieste visualizzate in `/dj`
- [ ] Duplicati evidenziati
- [ ] Durata mostrata formattata

## 11. Rollback
Vai su Deployments -> promuovi un deployment precedente (Promote) oppure ripeti un deploy di un commit noto.

---
Se vuoi automatizzare test prima del deploy, possiamo aggiungere un workflow GitHub Actions (build + vitest). Fammi sapere.
