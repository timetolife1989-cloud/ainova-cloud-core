# DEPLOYMENT — Vercel + Supabase

## Környezet

| Elem | Érték |
|------|-------|
| Frontend | Vercel (`demo.ainovacloud.com`) |
| DB | Supabase Cloud (PostgreSQL, Stockholm EU-North-1) |
| Pooler | `aws-1-eu-north-1.pooler.supabase.com:6543` (PgBouncer transaction mode) |
| Git | `github.com/timetolife1989-cloud/ainova-cloud-core` (branch: `main`) |

## Vercel Environment Variables

| Változó | Érték |
|---------|-------|
| `DB_ADAPTER` | `postgres` |
| `DB_SERVER` | `aws-1-eu-north-1.pooler.supabase.com` |
| `DB_PORT` | `6543` |
| `DB_DATABASE` | `postgres` |
| `DB_USER` | `postgres.nfancsrufcvmulrxnfxx` |
| `DB_PASSWORD` | *(titkos — Supabase dashboard-ról)* |
| `DEPLOYMENT_FLAVOR` | `cloud` |

## Tennivalók

- ✅ Schema migráció futtatva (55 tábla + 1 view)
- ✅ Demo adat seedel-ve (3291 sor, 27 tábla)
- ✅ Login működik
- ✅ `pg` modul statikus import (Vercel NFT kompatibilis)
- ✅ `SELECT TOP N` → `LIMIT N` konverzió
- ⬜ Egyéb MSSQL szintaxisok felderítése és konverzió
- ⬜ `IF NOT EXISTS` pattern konverzió (permission auto-regisztráció)
- ⬜ Production domain SSL certificate
- ⬜ Custom error page (`app/error.tsx`) Vercel-en tesztelve

## Ismert PostgreSQL konverziók a PostgresAdapter-ben

| MSSQL szintaxis | PostgreSQL konverzió | Állapot |
|-----------------|---------------------|---------|
| `SYSDATETIME()` | `NOW()` | ✅ |
| `DATEADD(MINUTE, -15, ...)` | `(... - INTERVAL '15 minutes')` | ✅ |
| `OUTPUT INSERTED.id` | `RETURNING id` | ✅ |
| `is_active = 1` | `is_active = true` | ✅ (5 oszlop) |
| `SELECT TOP N` | `SELECT ... LIMIT N` | ✅ |
| `CASE WHEN col=1 THEN 1 ELSE 0 END` | `col::int` | ✅ |
| `IF NOT EXISTS (SELECT...) INSERT` | ❌ **NEM konvertált!** | ⬜ Javítandó |
| `MERGE ... WHEN NOT MATCHED` | ❌ **NEM konvertált!** | ⬜ |
| `DATEPART(...)` | ❌ **NEM konvertált!** | ⬜ |
