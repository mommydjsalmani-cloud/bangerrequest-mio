# 🔐 Setup reCAPTCHA v2

## Cos'è reCAPTCHA v2?

Google reCAPTCHA protegge da bot automatizzati mostrando un checkbox "I'm not a robot". È gratuito e non richiede dipendenze NPM.

## Come Configurare

### Step 1: Registrare il sito su Google

1. Vai a [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Clicca il **+** per aggiungere un nuovo sito
3. Compila:
   - **Label**: "Banger Request DJ Login"
   - **reCAPTCHA type**: "reCAPTCHA v2" → "I'm not a robot" Checkbox
   - **Domains**: `localhost`, `yourdomain.com`, `yourdomain.vercel.app`

4. Clicca **Submit**

5. Copia le due chiavi:
   - **Site Key** (pubblica)
   - **Secret Key** (privata)

### Step 2: Configurare Vercel

1. **Production**:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY = <tuo-site-key>
   RECAPTCHA_SECRET_KEY = <tuo-secret-key>
   ```

2. **Preview** (staging):
   ```
   Stessi valori di Production (opzionale: usare diverse site keys)
   ```

3. **Development** (locale):
   - Aggiungere a `.env.local`:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY = <tuo-site-key>
   RECAPTCHA_SECRET_KEY = <tuo-secret-key>
   ```

### Step 3: Deploy

```bash
npm run build
npm run start
# Oppure deploy su Vercel (le variabili saranno automaticamente lette)
```

---

## Come Funziona

1. **Client**: L'utente fa login, vede il checkbox reCAPTCHA
2. **Google**: Valida il comportamento dell'utente (mouse, click patterns, etc.)
3. **Server**: Verifica il token reCAPTCHA con la Secret Key
4. **Risultato**: Login consentito solo se reCAPTCHA + credenziali corrette

---

## Testing Locale

### Con reCAPTCHA Abilitato
```bash
# .env.local
NEXT_PUBLIC_RECAPTCHA_SITE_KEY = <actual-key>
RECAPTCHA_SECRET_KEY = <actual-key>

npm run dev
# Vai a http://localhost:3000/dj/login
# Dovresti vedere il checkbox reCAPTCHA
```

### Senza reCAPTCHA (Test Keys)
```bash
# .env.local non contiene reCAPTCHA vars

npm run dev
# Vai a http://localhost:3000/dj/login
# Login funziona normalmente senza reCAPTCHA
# (reCAPTCHA è opzionale, l'app funziona comunque)
```

---

## Test Keys per Sviluppo

Google fornisce test keys che passano sempre:

**Site Key**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`  
**Secret Key**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

```bash
# .env.local per testing
NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY = 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

---

## Monitorare i Risultati

### Analytics su Google reCAPTCHA

Vai al [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):

1. Seleziona il tuo sito
2. Vedi:
   - **Traffic**: Richieste totali
   - **Success Rate**: % di verifiche riuscite
   - **Risk Analysis**: Bot detected rate

---

## Troubleshooting

### ❌ "reCAPTCHA token non valido"
- **Soluzione**: Controlla che `RECAPTCHA_SECRET_KEY` sia corretta lato server
- **Verifica**: `echo $RECAPTCHA_SECRET_KEY` in terminal

### ❌ Checkbox non appare
- **Soluzione**: Controlla che `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` sia impostata
- **Verifica**: Apri console browser (F12) e guarda gli errori

### ❌ "Token scaduto"
- **Soluzione**: reCAPTCHA token scadono dopo 2 minuti
- **Suggerimento**: Generare un nuovo token se l'utente aspetta troppo

### ❌ Dominio non riconosciuto
- **Soluzione**: Aggiungi il dominio nel [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- **Validi**: `localhost:3000`, `example.com`, `*.vercel.app`

---

## Sicurezza

### ✅ Le credenziali sono sicure?
- **Site Key**: Pubblica (va nel frontend, è OK)
- **Secret Key**: Privata (server-only, NASCOSTA da env var)

### ✅ Protezione da abuse?
- reCAPTCHA è **rate limited** da Google (anche loro si proteggono)
- Un utente non può spammare più di ~5 verifiche al minuto
- Combinato con il rate limiting Django della app, sei super protetto

### ✅ GDPR compliant?
- ✓ Google reCAPTCHA è GDPR compliant
- ✓ Devi menzionare "Powered by reCAPTCHA" (già nel footer)
- ✓ Privacy Policy deve citare Google (standard)

---

## Disabilitare reCAPTCHA

Se vuoi disabilitare reCAPTCHA in futuro:

```bash
# Rimuovi da .env.local
# NEXT_PUBLIC_RECAPTCHA_SITE_KEY = ...
# RECAPTCHA_SECRET_KEY = ...

npm run dev
# Login funziona esattamente come prima (l'app è backwards compatible!)
```

---

## Risorse

- [Google reCAPTCHA Docs](https://developers.google.com/recaptcha)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Testing Guide](https://developers.google.com/recaptcha/docs/faq)

---

**Note**: reCAPTCHA v2 è gratuito e non richiede carta di credito!
