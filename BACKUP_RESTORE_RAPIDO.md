# Ripristino Rapido — Riferimenti Sicuri

**Ultimo backup: 22 marzo 2026, 01:15**
**Stato: TUTTO FUNZIONANTE — entrambi i progetti verificati**

---

## 1. Git — Punto di ripristino

```bash
# Tornare a questo stato sicuro:
git reset --hard backup-completo-20260322-011229
git push --force-with-lease origin main
```

Commit: `5c18710` | Tag: `backup-completo-20260322-011229`
(Precedente: commit `4163e80` | Tag: `backup-safe-20260322`)

---

## 2. Vercel — Deployment funzionanti da promuovere

Se dopo un push il sito si rompe, **NON toccare il codice**. Promuovi il deployment funzionante:

### mommy-marketing (mommydj.com — homepage)
```bash
vercel promote mommy-marketing-2dmgw475k-mommys-projects-f4f4fbbb.vercel.app --scope mommys-projects-f4f4fbbb
```
ID: `dpl_5EdWWdVXqxXYSWmpZ25QCicL8vpv` | Creato: 21 mar 2026 22:55

### bangerrequest-mio (mommydj.com/richiedi — app richieste)
```bash
vercel promote bangerrequest-eyihanrk6-mommys-projects-f4f4fbbb.vercel.app --scope mommys-projects-f4f4fbbb
```
ID: `dpl_2SiosgMwVVgy5HtLjchQsVqHcmXx` | Creato: 22 mar 2026 01:12

---

## 3. Architettura — NON MODIFICARE

| Progetto Vercel | Root Directory | Dominio | Ruolo |
|---|---|---|---|
| mommy-marketing | `apps/marketing` | mommydj.com | Homepage DJ |
| bangerrequest-mio | `.` (root) | bangerrequest-mio.vercel.app | App richieste |

- `mommydj.com/` → servito da **mommy-marketing**
- `mommydj.com/richiedi` → proxy verso **bangerrequest-mio** (via rewrite in `apps/marketing/vercel.json`)

---

## 4. File CRITICI — NON TOCCARE

- `vercel.json` (root) — contiene redirect `/` → `/richiedi` necessario per bangerrequest-mio
- `apps/marketing/vercel.json` — contiene rewrites verso bangerrequest-mio
- `next.config.ts` — contiene `basePath: '/richiedi'` per produzione
- `src/lib/apiPath.ts` — contiene `BASE_PATH` condizionale

---

## 5. Backup locale

Archivio completo: `/workspaces/backup-completo-20260322-011502.tar.gz` (295 MB)
Precedente: `backups/manual-backup-complete-20260321-234757.tar.gz`

---

## 6. Regola d'oro

> **Prima di pushare qualsiasi modifica su main**, verifica che NON tocchi
> `vercel.json`, `apps/marketing/vercel.json`, `next.config.ts` o `src/lib/apiPath.ts`.
> Se devi fare una modifica estetica (es. favicon), cambia SOLO il file specifico (es. `src/app/favicon.ico`) e nient'altro.
