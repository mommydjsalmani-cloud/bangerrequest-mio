# Configurazione Secrets Vercel per Auto-Deploy

Questo documento spiega come configurare i secrets GitHub necessari per abilitare il deployment automatico su Vercel tramite GitHub Actions.

## 📋 Secrets Richiesti

Per abilitare il deployment automatico, configura i seguenti secrets nel repository GitHub:

### 1. VERCEL_TOKEN
- **Descrizione**: Token di accesso per l'API Vercel
- **Come ottenerlo**:
  1. Vai su [Vercel Dashboard](https://vercel.com/account/tokens)
  2. Crea un nuovo token con scope appropriati
  3. Copia il token generato

### 2. VERCEL_ORG_ID
- **Descrizione**: ID dell'organizzazione Vercel
- **Come ottenerlo**:
  ```bash
  # Installa Vercel CLI se non presente
  npm i -g vercel
  
  # Login e ottieni l'org ID
  vercel --cwd /path/to/project
  # L'org ID sarà mostrato durante la configurazione
  ```

### 3. VERCEL_PROJECT_ID
- **Descrizione**: ID del progetto Vercel
- **Come ottenerlo**:
  ```bash
  # Dal file .vercel/project.json dopo il primo deploy
  cat .vercel/project.json
  ```

## 🔧 Configurazione nel Repository

1. Vai nelle **Settings** del repository GitHub
2. Naviga su **Secrets and variables > Actions**
3. Aggiungi i tre secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID` 
   - `VERCEL_PROJECT_ID`

## ✅ Abilitare Auto-Deploy

Una volta configurati i secrets:

1. Scommenta i job di deployment in `.github/workflows/ci.yml`
2. Rimuovi il prefisso `#` dai job `deploy-staging` e `deploy-production`
3. Fai commit e push - il deployment automatico sarà attivo!

## 🚀 Deployment Attuale

**Metodo corrente**: Deployment manuale via `vercel --prod`
**URL produzione**: https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app
**Status**: ✅ Funzionante

## 📝 Note

- Il CI/CD pipeline attualmente esegue solo test, lint e build
- Il deployment è manuale ma funziona perfettamente
- Una volta configurati i secrets, il deployment sarà automatico su ogni push a `main`