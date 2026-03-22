# Ripristino Rapido — Riferimenti Sicuri

**Ultimo backup: 22 marzo 2026, 00:16**
**Stato: TUTTO FUNZIONANTE**

---

## 1. Git — Punto di ripristino

```bash
# Tornare a questo stato sicuro:
git reset --hard backup-safe-20260321-post-fix
git push --force-with-lease origin main
```

Commit: `4163e80` | Tag: `backup-safe-20260321-post-fix`

---

## 2. Vercel — Deployment funzionanti da promuovere

Se dopo un push il sito si rompe, **NON toccare il codice**. Promuovi il deployment funzionante:

### mommy-marketing (mommydj.com — homepage)
```bash
vercel promote mommy-marketing-cmvs0xklv-mommys-projects-f4f4fbbb.vercel.app --scope mommys-projects-f4f4fbbb
```

### bangerrequest-mio (mommydj.com/richiedi — app richieste)
```bash
vercel promote bangerrequest-c3eqyo4wb-mommys-projects-f4f4fbbb.vercel.app --scope mommys-projects-f4f4fbbb
```

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

Cartella: `backups/manual-backup-complete-20260321-234757/`
Archivio: `backups/manual-backup-complete-20260321-234757.tar.gz`

---

## 6. Regola d'oro

> **Prima di pushare qualsiasi modifica su main**, verifica che NON tocchi
> `vercel.json`, `apps/marketing/vercel.json`, `next.config.ts` o `src/lib/apiPath.ts`.
> Se devi fare una modifica estetica (es. favicon), cambia SOLO il file specifico (es. `src/app/favicon.ico`) e nient'altro.
