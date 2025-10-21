# 🔐 Credenziali DJ - Configurazione Produzione

## Problema Riscontrato

L'utente ottiene errore "Server non configurato: contatta admin (mancano credenziali)" nel pannello DJ.

## Analisi

✅ **Variabili d'ambiente presenti su Vercel**: 
- `/api/health/auth` restituisce `"haveUser": true, "haveSecret": true`

❌ **Credenziali non corrispondono**: 
- Le credenziali inserite dall'utente non matchano quelle configurate

## Credenziali Locali (.env.local)
```
DJ_PANEL_USER=test
DJ_PANEL_SECRET=77
```

## Credenziali da Configurare su Vercel

Per allineare produzione e sviluppo, configura in **Vercel → Project Settings → Environment Variables**:

```
DJ_PANEL_USER=mommy
DJ_PANEL_SECRET=<password-sicura>
```

**Importante**: Usa le stesse credenziali che l'utente si aspetta di usare.

## Come Trovare le Credenziali Attuali

Le credenziali su Vercel sono già configurate ma potrebbero essere diverse da quelle che l'utente si aspetta.

### Opzione 1: Controlla GitHub Secrets
Le credenziali dovrebbero essere sincronizzate con i GitHub Secrets:
- `DJ_PANEL_SECRET` 
- `DJ_PANEL_USER`

### Opzione 2: Reset delle Credenziali
1. Vai su **Vercel → Project Settings → Environment Variables**
2. Aggiorna `DJ_PANEL_USER` = `mommy` 
3. Aggiorna `DJ_PANEL_SECRET` = `<password-che-vuoi>`
4. Redeploy l'applicazione

### Opzione 3: Crea Nuovo Utente
Se preferisci mantenere le credenziali esistenti, informa l'utente delle credenziali corrette.

## Credenziali Suggerite per Produzione

```
DJ_PANEL_USER=mommy
DJ_PANEL_SECRET=BangerDJ2024!
```

## Come Applicare le Modifiche

1. **Aggiorna su Vercel**:
   - Environment Variables → Edit → Save
   
2. **Trigger Redeploy**:
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin develop
   ```

3. **Verifica Funzionamento**:
   ```bash
   curl -s "https://bangerrequest-mio.vercel.app/api/libere/admin?action=sessions" \
     -H "x-dj-secret: BangerDJ2024!" \
     -H "x-dj-user: mommy" | jq .
   ```

## Test Credenziali

Dopo la configurazione, testa:

1. **API Health**: `/api/health/auth` deve restituire `"ok": true`
2. **Login DJ**: `/dj/login` deve accettare le nuove credenziali  
3. **Pannello DJ**: `/dj/libere` deve caricare correttamente

---

**Stato Attuale**: Le credenziali sono configurate ma non corrispondono a quelle che l'utente sta tentando di usare ("mommy" + password).