# BEFEJEZETT FELADATOK — Archívum

> Ide kerülnek a kész feladatok dátummal, hogy lehessen követni a haladást.

---

## 2026.03.12

### Deployment
- ✅ Supabase Cloud migráció (55 tábla + 1 view, 0 hiba)
- ✅ Demo adat seedelés (3291 sor, 27 tábla)
- ✅ Vercel deployment működik
- ✅ Login fix: `pg` modul statikus import (Vercel NFT)
- ✅ Login fix: Boolean konverzió (`is_active = 1` → `= true`)
- ✅ Login fix: `I18nProvider` hozzáadva auth layout-hoz
- ✅ Login fix: DB_SERVER régió javítás (`eu-central-1` → `eu-north-1`)
- ✅ Dashboard fix: `SELECT TOP N` → `LIMIT N` konverzió
- ✅ `lib/db/index.ts`: statikus import minden adapter-re (require() törött Turbopack/ESM-mel)
- ✅ `next.config.ts`: `output: 'standalone'` eltávolítva (Vercel inkompatibilis)
- ✅ `.vscode/mcp.json` létrehozva (GitHub + Postgres MCP)

### i18n
- ✅ Nyelvváltó HU/EN/DE (1 kattintás, SW cache fix)
- ✅ Login oldal fordítások (I18nProvider wrapping)

### DevOps
- ✅ Git konfiguráció: `timetolife1989` / `timetolife1989@gmail.com`
- ✅ Docs cleanup (en/de/archive/todo mappák törölve)

---

## 2026.03.10

### Core
- ✅ SQLite session timezone fix (ISO 8601 UTC)
- ✅ Header hydration fix (idő renderelés csak kliens oldalon)
- ✅ Service Worker v2 (dashboard kizárva cache-ból)
- ✅ Nyelvváltó végleges architektúra (I18nProvider + modul-szintű store)
