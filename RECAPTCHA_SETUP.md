# Configurazione reCAPTCHA v3

## ✅ Implementazione completata

Il sito ora include protezione reCAPTCHA v3 invisibile contro bot e spam.

## 📋 Configurazione richiesta

### 1. Ottieni le chiavi reCAPTCHA

1. Vai su [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Clicca "+" per creare un nuovo sito
3. Compila il form:
   - **Label**: `Mommy DJ Website`
   - **reCAPTCHA type**: Seleziona **reCAPTCHA v3**
   - **Domains**: 
     - `localhost` (per sviluppo)
     - `mommy-marketing.vercel.app` (o il tuo dominio custom)
   - Accetta i termini e clicca "Submit"

4. Riceverai due chiavi:
   - **Site Key** (pubblica) - inizia con `6L...`
   - **Secret Key** (privata) - inizia con `6L...`

### 2. Configura le variabili d'ambiente su Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `mommy-marketing`
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi le seguenti variabili:

   | Name | Value | Environment |
   |------|-------|------------|
   | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | La tua Site Key (6L...) | Production, Preview, Development |
   | `RECAPTCHA_SECRET_KEY` | La tua Secret Key (6L...) | Production, Preview, Development |

5. Clicca **Save**
6. **Importante**: Redeploy l'applicazione per applicare le nuove variabili

### 3. Configura per sviluppo locale (opzionale)

Crea un file `.env.local` nella root del progetto:

```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6L...
RECAPTCHA_SECRET_KEY=6L...
```

⚠️ **NON committare** il file `.env.local` su Git (è già nel .gitignore)

## 🔧 Come funziona

### Frontend
- Il provider reCAPTCHA è attivo su tutte le pagine
- Quando l'utente invia il form contatti, viene generato automaticamente un token invisibile
- Il token viene inviato insieme ai dati del form all'API

### Backend
- L'API `/api/contact` verifica il token con Google
- Google restituisce un **score da 0.0 a 1.0**:
  - `1.0` = sicuramente umano
  - `0.5` = soglia minima accettata
  - `0.0` = sicuramente bot
- Se score < 0.5, la richiesta viene bloccata
- Tutti i tentativi vengono loggati con IP e score

## 📊 Monitoring

Controlla i log Vercel per vedere:
- `[CONTACT_RECAPTCHA_SCORE]` - Score di ogni richiesta
- `[CONTACT_RECAPTCHA_FAILED]` - Bot bloccati
- `[CONTACT_SUCCESS]` - Richieste valide inviate

## 🧪 Testing

Dopo la configurazione, testa il form:

1. **Test umano**: Compila normalmente il form → dovrebbe funzionare
2. **Test bot**: Usa tool automatizzati (curl, Postman) senza token → dovrebbe bloccare
3. **Monitoring**: Controlla i log Vercel per vedere gli score

## 🎯 Prossimi step consigliati

- ✅ Validazione server-side (implementata)
- ✅ reCAPTCHA v3 (implementata)
- ⏳ Rate limiting con Redis (opzionale ma consigliato)
- ⏳ Honeypot field (extra protezione semplice)

## 🆘 Troubleshooting

### Form non si invia
- Verifica che le variabili siano configurate su Vercel
- Controlla la console browser per errori
- Controlla i log Vercel per dettagli

### "reCAPTCHA non disponibile"
- La variabile `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` non è configurata
- Controlla che inizi con `NEXT_PUBLIC_` (obbligatorio per Next.js)

### Troppe richieste bloccate (falsi positivi)
- Abbassa la soglia da `0.5` a `0.3` in `app/api/contact/route.ts` (riga 75)
- Monitora gli score nei log per trovare il bilanciamento giusto

## 📚 Risorse

- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
