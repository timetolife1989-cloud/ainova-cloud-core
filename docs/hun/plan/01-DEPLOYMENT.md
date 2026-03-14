# DEPLOYMENT — Vercel + Supabase

> Utolsó frissítés: 2026.03.15

## Környezet

| Elem | Érték |
|------|-------|
| Frontend | Vercel (`demo.ainovacloud.com`) |
| DB | Supabase Cloud (PostgreSQL, Stockholm EU-North-1) |
| Pooler | `aws-1-eu-north-1.pooler.supabase.com:6543` (PgBouncer transaction mode) |
| Git | `github.com/timetolife1989-cloud/ainova-cloud-core` (branch: `main`) |
| Middleware | `proxy.ts` (Next.js 16 — middleware.ts nem használható) |
| CSP | Content-Security-Policy headers proxy.ts-ben |
| Edge Auth | Session pre-check API route-okhoz proxy.ts-ben |

## Tennivalók

- ✅ Schema migráció futtatva (55+ tábla — Supabase)
- ✅ Demo adat seedel-ve (3291+ sor, 27+ tábla)
- ✅ Login működik (pg modul, boolean konverzió, i18n provider)
- ✅ `pg` modul statikus import (Vercel NFT kompatibilis)
- ✅ `SELECT TOP N` → `LIMIT N` konverzió
- ✅ MSSQL→PG szintaxis konverzió (12+ pattern, PostgresAdapter-ben)
- ✅ Custom error page (`app/error.tsx`) — működik
- ✅ PWA manifest (`public/manifest.json`) — installálható
- ✅ Service Worker v3 — modul chunk cache, offline support
- ✅ Demo environment auto-reset (Vercel Cron, 03:00 UTC)
- ⬜ Production domain SSL certificate (saját domain)
- ⬜ Dedikált production instance (elkülönítve demo-tól)

## Ismert PostgreSQL konverziók a PostgresAdapter-ben

| MSSQL szintaxis | PostgreSQL konverzió | Állapot |
|-----------------|---------------------|---------|
| `SYSDATETIME()` | `NOW()` | ✅ |
| `GETDATE()` | `NOW()` | ✅ |
| `DATEADD(MINUTE, -15, ...)` | `(... - INTERVAL '15 minutes')` | ✅ |
| `OUTPUT INSERTED.id` | `RETURNING id` | ✅ |
| `is_active = 1` | `is_active = true` | ✅ |
| `SELECT TOP N` | `SELECT ... LIMIT N` | ✅ |
| `ISNULL()` | `COALESCE()` | ✅ |
| `OFFSET ROWS FETCH NEXT` | `LIMIT OFFSET` | ✅ |
| `CASE WHEN col=1` | `col::int` | ✅ |
| `IF NOT EXISTS INSERT` | `ON CONFLICT DO NOTHING` pattern | ✅ (migrációkban megoldva) |
| `MERGE` | `INSERT ON CONFLICT` | ✅ (explicit SQL-lel megoldva) |
| `DATEPART(...)` | `EXTRACT(... FROM ...)` | ✅ (ahol használva volt) |
