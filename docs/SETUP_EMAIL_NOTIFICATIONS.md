# Setup Notifiche Email

Le notifiche email sono un'alternativa più semplice e affidabile alle notifiche push per avvisare il DJ quando arrivano nuove richieste musicali.

## Configurazione Server Email

Aggiungi queste variabili d'ambiente su Vercel:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tuaemail@gmail.com
EMAIL_PASS=password_app_gmail
EMAIL_FROM=Banger Request <tuaemail@gmail.com>
```

### Gmail Setup

1. Vai su [Google Account Security](https://myaccount.google.com/security)
2. Abilita "2-Step Verification"
3. Vai su "App passwords"
4. Genera una nuova password per "Mail"
5. Usa quella password in `EMAIL_PASS`

### Altri Provider

**Outlook/Hotmail:**
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Yahoo:**
```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

## Database Setup

Esegui questa migrazione su Supabase:

```sql
-- Vai su Supabase Dashboard > SQL Editor
-- Incolla e esegui:

CREATE TABLE IF NOT EXISTS dj_email_config (
    id SERIAL PRIMARY KEY,
    dj_user VARCHAR(255) NOT NULL UNIQUE,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    email_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dj_email_config_user ON dj_email_config(dj_user);
CREATE INDEX IF NOT EXISTS idx_dj_email_config_enabled ON dj_email_config(email_enabled);
```

## Come Usare

1. **Accedi al Pannello DJ**: `/dj/libere`
2. **Sezione "Notifiche Email"**: Inserisci la tua email e clicca "Abilita"
3. **Test**: Usa il pulsante "Invia Test" per verificare la configurazione
4. **Automatico**: Riceverai un'email per ogni nuova richiesta musicale

## Formato Email

Le notifiche avranno questo formato:
- **Oggetto**: "🎵 Nuova Richiesta Musicale"
- **Corpo**: Titolo brano — Artista (da Nome_Utente)
- **Link**: Diretto al pannello DJ

## Vantaggi vs Push Notifications

✅ **Più affidabili** - Non dipendono dal browser o permessi  
✅ **Più semplici** - Nessuna configurazione VAPID  
✅ **Cross-device** - Funzionano su tutti i dispositivi  
✅ **Persistenti** - Le email rimangono nella casella di posta  
✅ **Universali** - Supportate da tutti i client  

## API Endpoints

- `POST /api/email/config` - Configura notifiche email
- `GET /api/email/config` - Recupera configurazione
- `POST /api/email/send` - Invia notifica email (interno)

Le notifiche vengono inviate automaticamente quando:
- Arriva una nuova richiesta via `/api/requests`
- Arriva una nuova richiesta libera via `/api/libere`