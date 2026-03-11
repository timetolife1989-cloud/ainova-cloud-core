# Ainova Cloud Intelligence — Részletes Architektúra Dokumentáció

## 1. Áttekintés

Az Ainova Cloud Intelligence egy **moduláris, multi-tenant gyártásmenedzsment platform**, amelyet dobozos szoftverként értékesítünk gyártó cégeknek. A rendszer 3 csomagszinten érhető el (Basic, Professional, Enterprise), és teljes admin-szintű testreszabhatóságot biztosít.

### 1.1 Alapelvek

- **Zero Hardcode** — Minden beállítás admin panelből konfigurálható
- **Adapter Pattern** — DB, Auth, Import mind cserélhető adapter-eken keresztül
- **Modul System** — Plug-in architektúra, új modul 6 fájlból áll
- **Tier-based Licensing** — Licenc kulcs határozza meg az elérhető modulokat
- **i18n Ready** — Magyar, angol, német nyelv; bővíthető

### 1.2 Tech Stack

| Réteg | Technológia | Verzió |
|-------|-------------|--------|
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Nyelv | TypeScript | 5.9 |
| Styling | Tailwind CSS | 4.x |
| Ikonok | Lucide React | latest |
| Validáció | Zod | 3.x |
| DB (alapértelmezett) | Microsoft SQL Server | 2019+ |
| DB (opcionális) | PostgreSQL, SQLite | 15+, 3.35+ |
| Auth (alapértelmezett) | Session-based (bcryptjs) | — |
| Auth (opcionális) | JWT (built-in crypto) | — |
| Containerizáció | Docker + docker-compose | — |

---

## 2. Mappa Struktúra

```
ainova-cloud-core/
├── app/                          # Next.js App Router
│   ├── api/                      # API route-ok
│   │   ├── admin/                # Admin API-k (users, settings, modules, etc.)
│   │   ├── auth/                 # Login, logout, session validate
│   │   ├── csrf/                 # CSRF token endpoint
│   │   ├── health/               # Health check
│   │   ├── i18n/                 # Fordítás API
│   │   ├── modules/[moduleId]/   # Dinamikus modul API proxy
│   │   └── setup/                # Setup wizard API
│   ├── dashboard/                # Dashboard oldalak
│   │   ├── admin/                # Admin panel oldalak
│   │   ├── modules/[moduleId]/   # Dinamikus modul dashboard
│   │   └── page.tsx              # Főoldal (modul grid)
│   ├── login/                    # Login oldal
│   ├── setup/                    # Setup wizard UI
│   └── layout.tsx                # Root layout
├── components/
│   └── core/                     # Megosztott UI komponensek
├── database/
│   └── core/                     # Core migrációs SQL fájlok (001-014)
├── docs/                         # Dokumentáció
│   ├── todo/                     # Fázis TODO fájlok (F0-F14)
│   ├── archive/                  # Archivált tervek (PLAN.md, BLUEPRINT.md)
│   └── module-development.md     # Modul fejlesztői útmutató
├── hooks/                        # React hook-ok (useTranslation, etc.)
├── lib/                          # Core könyvtárak
│   ├── auth/                     # Auth adapterek (Session, JWT)
│   │   ├── adapters/
│   │   │   ├── SessionAdapter.ts
│   │   │   └── JwtAdapter.ts
│   │   ├── IAuthAdapter.ts       # Auth interface
│   │   └── index.ts              # Auth factory
│   ├── db/                       # DB adapterek
│   │   ├── adapters/
│   │   │   ├── MssqlAdapter.ts
│   │   │   ├── PostgresAdapter.ts
│   │   │   └── SqliteAdapter.ts
│   │   ├── IDatabase.ts          # DB interface
│   │   ├── sql-dialect.ts        # SQL dialektus absztrakció
│   │   └── index.ts              # DB factory
│   ├── import/                   # Import pipeline (CSV/Excel)
│   ├── modules/                  # Modul rendszer
│   │   ├── registry.ts           # Modul regisztráció, dependency check
│   │   └── types.ts              # ModuleManifest típusok
│   ├── rbac/                     # Role-Based Access Control
│   │   └── middleware.ts         # checkAuth middleware
│   ├── api-utils.ts              # checkSession, checkCsrf
│   ├── license.ts                # Licenc ellenőrzés
│   ├── settings.ts               # Settings CRUD (core_settings)
│   └── sync-events.ts            # Szinkronizációs események
├── modules/                      # Modul implementációk
│   ├── _loader.ts                # Manifest betöltő (import-ok)
│   ├── workforce/                # Basic: Létszám
│   ├── tracking/                 # Basic: Felkövetés
│   ├── fleet/                    # Basic: Gépjármű
│   ├── file-import/              # Basic: Import UI
│   ├── reports/                  # Basic: Riportok
│   ├── performance/              # Pro: Teljesítmény KPI
│   ├── scheduling/               # Pro: Kapacitás tervezés
│   ├── delivery/                 # Pro: Kiszállítás
│   ├── inventory/                # Pro: Készlet
│   ├── oee/                      # Enterprise: OEE
│   ├── shift-management/         # Enterprise: Műszakbeosztás
│   ├── quality/                  # Enterprise: Minőségellenőrzés
│   ├── maintenance/              # Enterprise: Karbantartás
│   └── lac-napi-perces/          # LAC referencia implementáció
├── scripts/                      # CLI scriptek
│   ├── migrate-all.ts            # DB migráció futtatás
│   ├── generate-license.ts       # Licenc generáló
│   └── bootstrap-admin.ts        # Admin fiók létrehozás
└── docker-compose.yml            # Docker deployment
```

---

## 3. Adatbázis Réteg

### 3.1 Adapter Pattern

```
IDatabaseAdapter (interface)
├── MssqlAdapter      — mssql npm csomag, connection pool
├── PostgresAdapter   — pg npm csomag, $N paraméterek, auto SQL konverzió
└── SqliteAdapter     — better-sqlite3, sync→async wrapper
```

Kiválasztás: `DB_ADAPTER` env var (`mssql` | `postgres` | `sqlite`)

### 3.2 SQL Dialect

A `sql-dialect.ts` absztrakciós réteg kezeli a DB-specifikus szintaxist:
- `now()` — SYSDATETIME() / NOW() / datetime('now')
- `dateAdd()` — DATEADD / INTERVAL / datetime()
- `upsert()` — MERGE / ON CONFLICT
- `limit()` — OFFSET..FETCH / LIMIT..OFFSET
- `returning()` — OUTPUT INSERTED / RETURNING
- `param()` — @name / $N / ?

### 3.3 Core Táblák (14 migráció)

| # | Tábla | Leírás |
|---|-------|--------|
| 001 | `core_users` | Felhasználók (bcrypt hash) |
| 002 | `core_sessions` | Session-ök (UUID, expiry) |
| 003 | `core_settings` | Key-value beállítások |
| 004 | `core_audit_log` | Audit napló |
| 005 | `core_license` | Licenc tábla |
| 006 | `core_permissions` | Jogosultságok |
| 007 | `core_roles` | Szerepkörök |
| 008 | `core_role_permissions` | Szerep-jogosultság kapcsolat |
| 009 | `core_units` | Mértékegységek |
| 010 | `core_translations` | Fordítások |
| 011 | `core_settings_locale` | Nyelvi beállítás |
| 012 | `core_module_settings` | Modul-specifikus beállítások |
| 013 | `core_import_configs/log` | Import konfigurációk |
| 014 | `core_notifications` | Értesítések |

---

## 4. Autentikáció Réteg

### 4.1 Adapter Pattern

```
IAuthAdapter (interface)
├── SessionAdapter    — DB-backed session, 30 perc idle timeout, 24h absolute
│                       In-memory cache (15 perc TTL), rate limiting
└── JwtAdapter        — HMAC-SHA256 access token (15 perc) + DB-backed refresh
                        Stateless validáció (nincs DB hívás)
```

Kiválasztás: `AUTH_ADAPTER` env var (`session` | `jwt`)

### 4.2 Biztonsági rétegek

1. **bcryptjs** — Jelszó hash (12 rounds)
2. **CSRF védelem** — Token-based, `X-CSRF-Token` header
3. **Rate limiting** — DB-backed + in-memory fallback (5 próba / 15 perc)
4. **Audit log** — Bejelentkezések, műveletek naplózása
5. **Session cache** — In-memory cache minimalizálja DB hívásokat
6. **Idle timeout** — 30 perc inaktivitás után automatikus kijelentkezés

---

## 5. RBAC (Role-Based Access Control)

### 5.1 Struktúra

```
Felhasználó → Szerepkör → Jogosultságok
              (admin)      (users.manage, modules.manage, ...)
              (manager)    (workforce.view, workforce.edit, ...)
              (user)       (workforce.view, ...)
```

### 5.2 Middleware

```typescript
// API route-ban:
const auth = await checkAuth(request, 'workforce.edit');
if (!auth.valid) return auth.response;
// auth.userId, auth.username, auth.role elérhető
```

### 5.3 Permission Auto-regisztráció

Modul manifest-ben definiált jogosultságok automatikusan bekerülnek a `core_permissions` táblába a modul betöltésekor.

---

## 6. Modul Rendszer

### 6.1 Modul Életciklus

```
1. Manifest regisztrálás (_loader.ts → registerModule())
2. Permission auto-regisztráció (core_permissions)
3. Admin aktiválás (active_modules setting)
4. Licenc ellenőrzés (tier-based szűrés)
5. Dashboard megjelenítés (dinamikus tile-ok)
6. API proxy (/api/modules/[moduleId]/[...path])
```

### 6.2 Modul Fájlok

Minden modul 6 fájlból áll:
1. `manifest.ts` — ID, név, ikon, tier, permissions, adminSettings
2. `migrations/001_xxx.sql` — DB tábla(k) létrehozása
3. `api/route.ts` — GET (lista) + POST (létrehozás)
4. `api/[id]/route.ts` — GET, PUT, DELETE egyedi elemre
5. `components/DashboardPage.tsx` — React dashboard komponens
6. `types/index.ts` — TypeScript típusok

### 6.3 Tier Rendszer

| Tier | Modulok |
|------|---------|
| `basic` | workforce, tracking, fleet, file-import, reports |
| `professional` | + performance, scheduling, delivery, inventory |
| `enterprise` | + oee, shift-management, quality, maintenance |

---

## 7. Import Pipeline

```
Excel/CSV fájl
    ↓
Upload API (/api/admin/import)
    ↓
File type detection (xlsx/csv)
    ↓
Header olvasás
    ↓
Import config matching (core_import_configs)
    ↓
Column mapping alkalmazás
    ↓
Row-by-row feldolgozás (validáció + insert)
    ↓
Import log (core_import_log)
```

---

## 8. i18n Rendszer

- **Fallback JSON-ok**: `public/locales/{hu,en,de}/common.json`
- **DB override**: `core_translations` tábla (admin panelen szerkeszthető)
- **Client hook**: `useTranslation()` — fetch + merge (fallback + DB)
- **Header lokalizáció**: `Intl.DateTimeFormat` alapú dátum/idő formázás

---

## 9. Deployment

### 9.1 Docker

```bash
docker-compose up -d
# MSSQL + Next.js container
# Automatikus migráció induláskor
```

### 9.2 Környezeti változók

| Változó | Leírás | Alapértelmezett |
|---------|--------|-----------------|
| `DB_ADAPTER` | DB típus | `mssql` |
| `DB_SERVER` | DB szerver | — |
| `DB_DATABASE` | DB név | — |
| `DB_USER` | DB felhasználó | — |
| `DB_PASSWORD` | DB jelszó | — |
| `AUTH_ADAPTER` | Auth típus | `session` |
| `JWT_SECRET` | JWT titkos kulcs (min 32 kar.) | — |
| `NEXTAUTH_SECRET` | Next.js session titkos | — |

---

## 10. API Összefoglaló

### Core API-k
| Endpoint | Leírás |
|----------|--------|
| `POST /api/auth/login` | Bejelentkezés |
| `POST /api/auth/logout` | Kijelentkezés |
| `GET /api/auth/validate-session` | Session validálás |
| `GET /api/csrf` | CSRF token |
| `GET /api/health` | Health check |
| `GET /api/i18n` | Fordítások |

### Admin API-k
| Endpoint | Leírás |
|----------|--------|
| `GET/POST /api/admin/users` | Felhasználók listázás/létrehozás |
| `GET/PUT/DELETE /api/admin/users/[id]` | Felhasználó CRUD |
| `GET/PUT /api/admin/settings` | Beállítások |
| `GET/PUT /api/admin/modules` | Modul aktiválás |
| `GET/POST /api/admin/roles` | Szerepkörök |
| `GET/POST /api/admin/import-configs` | Import konfigurációk |
| `GET /api/admin/audit-log` | Audit napló |
| `GET /api/admin/diagnostics` | Diagnosztika |
| `GET /api/admin/license` | Licenc info |

### Modul API-k (dinamikus)
| Endpoint | Leírás |
|----------|--------|
| `GET /api/modules/[moduleId]/data` | Modul adatok listázás |
| `POST /api/modules/[moduleId]/data` | Modul adat létrehozás |
| `GET/PUT/DELETE /api/modules/[moduleId]/data/[id]` | Egyedi elem CRUD |

### Setup API
| Endpoint | Leírás |
|----------|--------|
| `GET /api/setup` | Setup státusz |
| `POST /api/setup` | Setup lépés végrehajtás |

### Új Feature API-k (v1.1+)
| Endpoint | Leírás |
|----------|--------|
| `GET /api/modules/[moduleId]/export?format=xlsx\|pdf` | Modul adat export |
| `GET /api/search?q=keyword` | Globális keresés (Cmd+K) |
| `GET /api/sse/[moduleId]` | Server-Sent Events (real-time) |
| `POST /api/ai/query` | AI asszisztens (OpenAI GPT) |
| `GET/POST /api/admin/workflows` | Workflow automatizáció szabályok |
| `GET/POST /api/admin/api-keys` | API Gateway kulcsok kezelése |
| `GET/POST /api/admin/sites` | Multi-site telephelyek |
| `GET/POST /api/admin/translations` | Fordítás szerkesztő |
| `GET/POST /api/admin/dashboard-layouts` | Dashboard Builder layoutok |

---

## 11. Új Rendszer Komponensek

### 11.1 Export Pipeline
- **PDF**: HTML template → böngésző print (lib/export/pdf.ts)
- **Excel**: exceljs styled workbook (lib/export/excel.ts)
- Auto filter, frozen panes, alternating row colors

### 11.2 Real-time (SSE)
- **Event Bus**: In-memory pub/sub (lib/sse/event-bus.ts)
- **SSE endpoint**: /api/sse/[moduleId] — heartbeat 30s
- Modul események: created, updated, deleted

### 11.3 Workflow Engine
- **Rule engine**: JSON-based trigger → condition → action (lib/workflows/engine.ts)
- **Akciók**: email, notification, webhook, log
- **DB tábla**: core_workflow_rules

### 11.4 API Gateway
- **API Key auth**: X-API-Key header (lib/api-gateway/middleware.ts)
- **DB tábla**: core_api_keys (key, permissions, rate_limit, expires_at)
- Külső rendszerek integrációja

### 11.5 AI Asszisztens
- **OpenAI GPT-4o-mini**: Természetes nyelvű lekérdezések (lib/ai/assistant.ts)
- Function calling → SQL generálás → végrehajtás → válasz
- Biztonsági réteg: csak SELECT, RBAC szűrés

### 11.6 PWA
- **manifest.json**: Installable web app
- **Service Worker**: Stale-while-revalidate cache
- Apple mobile web app support

### 11.7 Globális Keresés
- **Cmd+K / Ctrl+K**: Command Palette (components/core/CommandPalette.tsx)
- Statikus oldalak + dinamikus modul keresés
- Keyboard navigáció (↑↓ Enter Esc)

### 11.8 Nyelvváltó
- **Header dropdown**: HU 🇭🇺 / EN 🇬🇧 / DE 🇩🇪
- Azonnali váltás → app_locale setting frissítés → page reload
- Kilépés gomb nyelve is változik
