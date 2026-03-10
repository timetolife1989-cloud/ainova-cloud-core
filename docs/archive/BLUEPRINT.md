# Ainova Cloud Core — Teljeskörű Tervrajz (Blueprint)

> **Készült:** 2026-03-08
> **Cél:** Eladható dobozos szoftver — gyártási területekre és cégekre optimalizálva
> **Filozófia:** Nulla hardcode, teljes admin-szintű testreszabhatóság, minden kötés előkészítve

---

## 1. A JELENLEGI PROJEKT ÁLLAPOTA (Audit)

### 1.1 Tech Stack (megvan, marad)

| Technológia | Verzió | Szerep |
|---|---|---|
| Next.js (App Router) | 16.x | Fullstack framework |
| React | 19.x | UI |
| TypeScript | 5.9 | Típusbiztonság |
| Tailwind CSS | 4.x | Styling |
| TanStack Query | 5.x | Kliens-oldali state/cache |
| Recharts | 3.x | Diagramok |
| Framer Motion | 12.x | Animációk |
| Lucide React | 0.563 | Ikonok |
| MSSQL (mssql) | 11.x | Adatbázis driver |
| bcryptjs | 3.x | Jelszó hash |
| Zod | 4.x | Validáció |
| ExcelJS | 4.x | Excel import/export |
| Docker | Multi-stage | Deployment |

### 1.2 Ami már kész és jó minőségű (megtartandó)

#### ✅ Core Infrastruktúra
- **IDatabaseAdapter interface** (`lib/db/IDatabase.ts`) — DB-agnosztikus query/execute/transaction
- **MssqlAdapter** (`lib/db/adapters/MssqlAdapter.ts`) — Singleton pool, race-condition guard, TransactionAdapter
- **IAuthAdapter interface** (`lib/auth/IAuthAdapter.ts`) — Login/logout/session/user CRUD
- **SessionAdapter** (`lib/auth/adapters/SessionAdapter.ts`) — DB-backed session, in-memory cache (15min TTL), rate limit (DB + fallback), bcrypt, audit log
- **CSRF** (`lib/csrf.ts` + `hooks/useCsrf.ts`) — Double-submit cookie, constant-time comparison
- **API Utils** (`lib/api-utils.ts`) — checkSession, checkCsrf, apiError/apiSuccess, HTTP status enum
- **Error handler** (`lib/error-handler.ts`) — Környezetfüggő hibaüzenet szanitizálás
- **Structured logger** (`lib/logger.ts`) — Szintek, JSON output prodban, sensitive data redact
- **Settings KV store** (`lib/settings.ts`) — getSetting/setSetting/getAllSettings, MERGE upsert
- **Branding** (`lib/settings-server.ts`) — getAppBranding(), fallback ha DB nem elérhető
- **Sync Events** (`lib/sync-events.ts`) — writeSyncEvent/getSyncStatusSummary, modul-szintű health
- **Constants** (`lib/constants.ts`) — Konfigurálható konstansok (bcrypt rounds, session TTL, rate limit)
- **Validators** (`lib/validators/user.ts`) — Zod sémák, role enum

#### ✅ DB Migrációk (core)
- `001_core_users.sql` — Felhasználók + bootstrap admin
- `002_core_sessions.sql` — DB-backed sessions + indexek
- `003_core_settings.sql` — KV store + default settings (branding, active_modules)
- `004_core_audit_log.sql` — Audit trail + indexek
- `005_core_sync_events.sql` — Import/sync event napló + indexek

#### ✅ API Route-ok (core)
- `POST /api/auth/login` — Zod validáció, IP extraction, session+CSRF cookie
- `POST /api/auth/logout` — CSRF check, best-effort session invalidáció
- `GET /api/auth/validate-session` — Session cookie validáció
- `POST /api/auth/change-password` — Jelszó módosítás
- `GET /api/csrf` — CSRF token kiosztás
- `GET /api/health` — DB ping, uptime, version
- `GET /api/admin/users` + `POST` — Felhasználó lista, létrehozás
- `PUT /api/admin/users/[id]` — Felhasználó módosítás
- `PUT /api/admin/users/[id]/reset-password` — Jelszó reset
- `GET /api/admin/modules` + `PUT` — Modul lista, toggle (dependency validation)
- `GET /api/admin/settings` + `PUT` — Settings CRUD (single + batch)
- `GET /api/admin/audit-log` — Szűrhető audit napló (pagináció)
- `GET /api/admin/diagnostics` — DB health, user/session/setting counts, uptime
- `GET /api/admin/sync-status` — Sync health összesítő

#### ✅ Frontend (core)
- **Auth layout** — Minimális, login-re optimalizált
- **Dashboard layout** — Session check, Header, redirect
- **Admin layout** — Role check (admin only)
- **Dashboard főoldal** — Dinamikus tile-ok a modul registry-ből
- **Admin főoldal** — 6 admin menüpont, SyncStatusWidget
- **Login** — 3D glass card, neon effektek, error/success animáció
- **Header** — AppName, user avatar, role badge, dátum/hét, logout
- **MenuTile** — Dinamikus Lucide ikon, accent stripe, pin support
- **QueryProvider** — TanStack Query kliens konfig

#### ✅ Modul Rendszer (alap)
- **Module Registry** (`lib/modules/registry.ts`) — registerModule, validateModuleToggle, getActiveModules, dependency graph
- **ModuleDefinition interface** — id, name, description, icon, href, color, dependsOn, adminOnly
- **Admin modul UI** — Modul toggle oldal

### 1.3 Ami LAC-specifikus (kiválasztandó / absztrahálandó)

| Fájl / Mappa | LAC-specifikus tartalom | Teendő |
|---|---|---|
| `database/lac/*` | 5 LAC migráció (sap_visszajelentes, norma_friss, targets, shift schedule, v_napi_perces view) | → Példa modulként megmarad, de NEM core |
| `app/api/napi-perces/` | Hardcoded SQL view query-k, LAC oszlopnevek | → Modul API-vá alakítandó |
| `app/api/napi-perces/export/` | LAC export | → Modul API |
| `app/api/munkaterv/` | 3 endpoint: upload, detect, process | → Generikus import pipeline-ra cserélendő |
| `app/api/sap-import/verify/` | SAP-specifikus verifikáció | → Modul API |
| `app/dashboard/napi-perces/` | LAC Napi Perces oldal | → Modul dashboard |
| `components/napi-perces/*` | 9 komponens (chart, table, tooltip, types) | → Modul komponensek |
| `components/admin/SapImportDropzone.tsx` | LAC import típusok (visszajelentes, norma_friss, routing, anyagmozgas) | → Generikus import dropzone |
| `components/admin/SapStatusWidget.tsx` | SAP-specifikus státusz | → Modul widget |
| `lib/db/getPool.ts` | Raw mssql pool (MERGE, bulk) | → Megtartandó adapter bypass-ként |
| `lib/modules/registry.ts` utolsó 10 sor | LAC modul regisztráció hardcode | → Dinamikus regisztrációra cserélendő |
| `lib/validators/user.ts` ROLES | 3 hardcode-olt role | → DB-ből/config-ból töltendő |

### 1.4 Hardcode-ok listája (nulla hardcode cél)

| Hol | Mi van hardcode-olva | Megoldás |
|---|---|---|
| `lib/validators/user.ts:4` | `ROLES = ['admin', 'manager', 'user']` | → `core_settings` / `core_roles` tábla |
| `lib/validators/user.ts:7-11` | `ROLE_LABELS` magyar | → `core_roles` tábla: `label` mező, i18n-ready |
| `lib/validators/user.ts:13-17` | `ROLE_COLORS` | → `core_roles` tábla: `color` mező |
| `lib/constants.ts` | Összes konstans fix értékkel | → `core_settings` override-ok, fallback az aktuális értékre |
| `components/core/Header.tsx:13` | `HU_DAYS` magyar napok | → Locale-alapú (`Intl.DateTimeFormat`) |
| `app/layout.tsx:16` | `lang="hu"` | → Setting-ből: `app_locale` |
| `lib/settings.ts:13-14` | MSSQL MERGE szintaxis | → Adapter-specifikus upsert |
| `lib/sync-events.ts:95-96` | MSSQL `DATEADD`, `SYSDATETIME()` | → Adapter-specifikus dátum függvények |
| `lib/auth/adapters/SessionAdapter.ts:125` | MSSQL `DATEADD(MINUTE, -15, ...)` | → Adapter-specifikus |
| `lib/modules/registry.ts:148-156` | LAC modul regisztráció | → Dinamikus manifest-ből |
| `app/dashboard/admin/page.tsx:38-41` | "SAP Import" admin menüpont | → Modul-regisztrált admin menü |
| `components/login/LoginContainer.tsx:11-15` | Magyar hibaüzenetek | → i18n kulcsok |
| `lib/error-handler.ts` | Magyar hibaüzenetek | → i18n kulcsok |
| `lib/api-utils.ts:98-108` | Magyar hibaüzenetek | → i18n kulcsok |

---

## 2. DOBOZOS SZOFTVER ARCHITEKTÚRA

### 2.1 Alapelvek

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL                              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │Branding │ │  Modulok │ │ Roles &  │ │  DB & Auth     │  │
│  │& i18n   │ │  Toggle  │ │ Permissions│  Config        │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ konfigurálja
┌─────────────────────────▼───────────────────────────────────┐
│                    CORE ENGINE                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ DB       │ │ Auth     │ │ Module   │ │ Unit         │   │
│  │ Adapter  │ │ Adapter  │ │ Registry │ │ System       │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │            │            │               │           │
│  ┌────▼─────┐ ┌────▼─────┐ ┌───▼───────┐ ┌────▼────────┐  │
│  │ MSSQL    │ │ Session  │ │ Manifest  │ │ Config-     │  │
│  │ Postgres │ │ JWT      │ │ Loader    │ │ driven      │  │
│  │ SQLite   │ │ OAuth    │ │           │ │ Units       │  │
│  └──────────┘ └──────────┘ └───────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ betölti
┌─────────────────────────▼───────────────────────────────────┐
│                    MODULES (plug-in)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │workforce │ │tracking  │ │fleet     │ │ custom       │   │
│  │(létszám) │ │(felkövet)│ │(gépkocsi)│ │ module...    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 A "Unit System" — Univerzális mértékegység rendszer

**A legfontosabb innováció.** A vevő NEM percben, NEM darabban van kötve. Az admin panelen definiálja a saját mértékegységeit.

```
core_units tábla:
┌────┬──────────────┬────────────┬────────────┬───────────┐
│ id │ unit_code    │ unit_label │ unit_type  │ decimals  │
├────┼──────────────┼────────────┼────────────┼───────────┤
│ 1  │ minutes      │ perc       │ time       │ 2         │
│ 2  │ pieces       │ darab      │ count      │ 0         │
│ 3  │ kg           │ kilogramm  │ weight     │ 2         │
│ 4  │ eur          │ EUR        │ currency   │ 2         │
│ 5  │ percent      │ %          │ ratio      │ 1         │
│ 6  │ hours        │ óra        │ time       │ 1         │
│ 7  │ custom_1     │ Normaperc  │ custom     │ 2         │
└────┴──────────────┴────────────┴────────────┴───────────┘
```

Minden modul oszlopa `unit_id`-vel van kötve, nem hardcode-olt mértékegységgel.

### 2.3 Role & Permission rendszer (config-driven)

Jelenlegi állapot: 3 hardcode-olt role (`admin`, `manager`, `user`).

Dobozos szoftver:

```
core_roles tábla:
┌────┬────────────┬──────────────┬──────────┬───────────┬─────────┐
│ id │ role_code  │ role_label   │ color    │ priority  │ builtin │
├────┼────────────┼──────────────┼──────────┼───────────┼─────────┤
│ 1  │ admin      │ Rendszergazda│ purple   │ 100       │ true    │
│ 2  │ manager    │ Vezető       │ blue     │ 50        │ true    │
│ 3  │ user       │ Felhasználó  │ gray     │ 10        │ true    │
│ 4  │ operator   │ Operátor     │ green    │ 20        │ false   │
│ 5  │ viewer     │ Megtekintő   │ slate    │ 5         │ false   │
└────┴────────────┴──────────────┴──────────┴───────────┴─────────┘

core_permissions tábla:
┌────┬─────────────────────────┬──────────────────────────────────┐
│ id │ permission_code         │ description                      │
├────┼─────────────────────────┼──────────────────────────────────┤
│ 1  │ admin.access            │ Admin panel hozzáférés            │
│ 2  │ users.manage            │ Felhasználók kezelése             │
│ 3  │ modules.toggle          │ Modulok be/kikapcsolása           │
│ 4  │ settings.edit           │ Beállítások módosítása            │
│ 5  │ data.import             │ Adatok importálása                │
│ 6  │ data.export             │ Adatok exportálása                │
│ 7  │ reports.view            │ Riportok megtekintése             │
│ 8  │ reports.edit            │ Riportok szerkesztése             │
│ 9  │ workforce.view          │ Létszám megtekintése              │
│ 10 │ workforce.edit          │ Létszám rögzítés                  │
└────┴─────────────────────────┴──────────────────────────────────┘

core_role_permissions tábla:
┌─────────┬───────────────┐
│ role_id │ permission_id │
├─────────┼───────────────┤
│ 1       │ 1,2,3,4,5,6...│ (admin: minden)
│ 2       │ 5,6,7,8,9,10  │ (manager: import, export, riport, workforce)
│ 3       │ 7,9           │ (user: riport view, létszám view)
└─────────┴───────────────┘
```

Admin panelből: drag & drop mátrix, role-ok és permission-ök összerendelése.

### 2.4 i18n (Nemzetköziesítés)

A dobozos szoftvernek többnyelvűnek kell lennie (legalább: HU, EN, DE).

```
core_translations tábla:
┌──────────────────────────┬────────┬───────────────────────────┐
│ translation_key          │ locale │ translation_value         │
├──────────────────────────┼────────┼───────────────────────────┤
│ auth.login_failed        │ hu     │ Hibás felhasználónév...   │
│ auth.login_failed        │ en     │ Invalid username or...    │
│ dashboard.welcome        │ hu     │ Üdv, {name}!             │
│ dashboard.welcome        │ en     │ Welcome, {name}!          │
└──────────────────────────┴────────┴───────────────────────────┘
```

Setting: `app_locale = 'hu'` → Admin panelből állítható.
Fallback chain: DB translation → JSON fallback file → kulcs visszaadása.

---

## 3. MODUL ARCHITEKTÚRA (Részletes)

### 3.1 Modul manifest struktúra

Minden modul egy önálló mappa a `modules/` alatt:

```
modules/
  _loader.ts              ← Automatikus manifest betöltés (glob/dynamic import)
  workforce/
    manifest.ts           ← Modul definíció + regisztráció
    migrations/
      001_workforce.sql   ← Modul DB tábla(k)
    api/
      route.ts            ← /api/modules/workforce
    components/
      WorkforceTable.tsx
      WorkforceForm.tsx
    hooks/
      useWorkforceData.ts
    admin/
      settings.tsx        ← Modul-specifikus admin beállítások
    types.ts
    i18n/
      hu.json
      en.json
```

**manifest.ts példa:**

```typescript
import { registerModule } from '@/lib/modules/registry';
import type { ModuleManifest } from '@/lib/modules/types';

export const manifest: ModuleManifest = {
  id: 'workforce',
  name: 'Létszám & Jelenlét',
  description: 'Napi műszaki létszám rögzítés, hiányzások, jogosítványok nyomon követése',
  icon: 'Users',
  href: '/dashboard/modules/workforce',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'basic',              // 'basic' | 'professional' | 'enterprise'
  dependsOn: [],
  permissions: [
    'workforce.view',
    'workforce.edit',
    'workforce.export',
  ],
  adminSettings: [
    {
      key: 'workforce_default_shift_count',
      label: 'Alapértelmezett műszakszám',
      type: 'number',
      default: '3',
    },
    {
      key: 'workforce_unit',
      label: 'Létszám mértékegysége',
      type: 'unit_select',     // a Unit System-ből választ
      default: 'pieces',
    },
  ],
  migrations: ['001_workforce.sql'],
};

registerModule(manifest);
```

### 3.2 Tervezett modulok — Csomagok

#### 🟢 BASIC csomag (alapár, minden telepítésnél)

| Modul | Funkció | Univerzális? |
|---|---|---|
| `workforce` | Napi létszám rögzítés, hiányzás, műszakok | ✅ |
| `tracking` | Feladat/rendelés felkövetés (státuszok, timeline) | ✅ |
| `fleet` | Gépkocsi futás, km rögzítés, tankolás | ✅ |
| `file-import` | Generikus CSV/Excel import, column mapping | ✅ |
| `reports` | Alap riport generátor (diagramok, táblák, export) | ✅ |

#### 🔵 PROFESSIONAL csomag (emelt ár)

| Modul | Funkció | Univerzális? |
|---|---|---|
| `performance` | Egyéni és csapat KPI, normaidő vs valós, trend | ✅ |
| `scheduling` | Kapacitás tervezés, heti allokáció, feltöltési arány | ✅ |
| `delivery` | Kiszállítás riport, értékek, vevő-bontás | ✅ |
| `inventory` | Készletnyilvántartás, minimum szintek, alertek | ✅ |
| `sap-import` | SAP SQVI Excel import (generikus, típus-detekt) | Gyártás |

#### 🟣 ENTERPRISE csomag (prémium, egyedi)

| Modul | Funkció | Univerzális? |
|---|---|---|
| `oee` | OEE (Overall Equipment Effectiveness) dashboard | Gyártás |
| `plc-connector` | Logo PLC / Siemens S7 adatfeldolgozás | Gyártás |
| `shift-management` | Műszakbeosztás tervezés, csapat rotáció | Gyártás |
| `quality` | Minőségellenőrzés, selejt tracking, 8D | Gyártás |
| `maintenance` | Karbantartás ütemezés, MTBF/MTTR | Gyártás |
| `api-gateway` | REST/Webhook integráció külső rendszerekkel | ✅ |
| `multi-site` | Több telephely kezelés egy instance-ból | ✅ |

### 3.3 Modul Dashboard Page — Dinamikus routing

```
app/
  dashboard/
    modules/
      [moduleId]/
        page.tsx          ← Dinamikus: betölti a modul komponensét
        loading.tsx
```

A `[moduleId]/page.tsx` a manifest alapján rendereli a megfelelő modul dashboard-ot:

```typescript
// app/dashboard/modules/[moduleId]/page.tsx
import { notFound } from 'next/navigation';
import { getModuleById } from '@/lib/modules/registry';

export default async function ModulePage({ params }: { params: { moduleId: string } }) {
  const mod = getModuleById(params.moduleId);
  if (!mod || !mod.isActive) notFound();

  // Dinamikus komponens import
  const ModuleComponent = (await import(`@/modules/${mod.id}/components/Dashboard`)).default;
  return <ModuleComponent />;
}
```

### 3.4 Modul API Route — Dinamikus routing

```
app/
  api/
    modules/
      [moduleId]/
        route.ts          ← Generikus dispatcher
        [...path]/
          route.ts        ← Sub-route-ok
```

---

## 4. DB ADAPTER RÉTEG — Multi-DB Support

### 4.1 Jelenlegi állapot

- `IDatabaseAdapter` interface: ✅ kész
- `MssqlAdapter`: ✅ kész, jó minőségű
- `PostgresAdapter`: ❌ hiányzik
- `SqliteAdapter`: ❌ hiányzik

### 4.2 SQL Dialektus probléma

A jelenlegi kódban van ~15 helyen MSSQL-specifikus SQL szintaxis:

| Szintaxis | MSSQL | PostgreSQL | SQLite |
|---|---|---|---|
| `SYSDATETIME()` | ✅ | `NOW()` | `datetime('now')` |
| `DATEADD(...)` | ✅ | `interval` | `datetime(...)` |
| `MERGE ... WHEN MATCHED` | ✅ | `ON CONFLICT DO UPDATE` | `ON CONFLICT DO UPDATE` |
| `TOP N` | ✅ | `LIMIT N` | `LIMIT N` |
| `OFFSET ... FETCH NEXT` | ✅ | `LIMIT ... OFFSET` | `LIMIT ... OFFSET` |
| `NEWID()` | ✅ | `gen_random_uuid()` | custom |
| `NVARCHAR(MAX)` | ✅ | `TEXT` | `TEXT` |
| `BIT` | ✅ | `BOOLEAN` | `INTEGER` |
| `IDENTITY(1,1)` | ✅ | `SERIAL` | `AUTOINCREMENT` |
| `OUTPUT INSERTED.*` | ✅ | `RETURNING *` | nem támogatott |

### 4.3 Megoldás: SQL Builder helper

```typescript
// lib/db/sql-helpers.ts
export interface SqlDialect {
  now(): string;                           // SYSDATETIME() | NOW() | datetime('now')
  dateAdd(unit: string, amount: number, field: string): string;
  upsert(table: string, columns: string[], keyColumns: string[]): string;
  limit(n: number, offset?: number): string;
  newUuid(): string;
  bool(value: boolean): unknown;           // 1/0 | true/false
  autoIncrement(): string;
  returning(columns: string[]): string;    // OUTPUT INSERTED.* | RETURNING * | ''
}
```

Minden adapter implementálja a saját dialektusát. A settings.ts, sync-events.ts, stb. a helper-en keresztül hívja a DB-t.

---

## 5. AUTH ADAPTER RÉTEG

### 5.1 Jelenlegi állapot

- `IAuthAdapter` interface: ✅ kész
- `SessionAdapter`: ✅ kész, production-ready
- `JwtAdapter`: ❌ hiányzik
- `OAuthAdapter`: ❌ hiányzik

### 5.2 Tervezett adapter-ök

```
lib/auth/adapters/
  SessionAdapter.ts     ← ✅ kész (DB-backed, cache, rate limit, audit)
  JwtAdapter.ts         ← Stateless, access+refresh token, Redis opcionális
  OAuthAdapter.ts       ← Google / Microsoft Entra ID / SAML
```

---

## 6. GENERIKUS IMPORT PIPELINE

### 6.1 Jelenlegi állapot

A SAP import pipeline jó architektúrájú (upload → detect → process), de LAC-specifikus.

### 6.2 Generikus pipeline

```
lib/import/
  IImportAdapter.ts       ← interface: detect, validate, process, getColumnMap
  pipeline.ts             ← Orchestrator: upload → detect → confirm → process → audit
  column-mapper.ts        ← Admin UI-ból konfigurálható oszlop mapping
  adapters/
    ExcelImportAdapter.ts ← ExcelJS
    CsvImportAdapter.ts   ← CSV parser
    JsonImportAdapter.ts  ← REST webhook
```

**Admin UI oszlop mapper:**

```
┌─────────────────────────────────────────────────────┐
│  Import konfiguráció: "SAP Visszajelentés"          │
│                                                     │
│  Excel oszlop        →  Rendszer mező               │
│  ┌──────────────┐      ┌──────────────────┐         │
│  │ Gyárt.rend.  │  →   │ order_number     │         │
│  │ Anyagszám    │  →   │ material_code    │         │
│  │ Visszajel.   │  →   │ reported_value   │ (unit!) │
│  │ Hibátlan     │  →   │ good_quantity    │         │
│  │ Dátum        │  →   │ execution_date   │         │
│  └──────────────┘      └──────────────────┘         │
│                                                     │
│  Mértékegység: [perc ▾]                            │
│  Feltételek: gyártásütemező = 246                    │
│                                                     │
│  [Mentés]  [Teszt import]                           │
└─────────────────────────────────────────────────────┘
```

---

## 7. TERVEZETT DB SÉMA (core)

### 7.1 Meglévő core táblák (maradnak, módosulnak)

```sql
-- ✅ Megvan: core_users, core_sessions, core_settings, core_audit_log, core_sync_events
```

### 7.2 Új core táblák

```sql
-- ROLES & PERMISSIONS
core_roles (id, role_code, role_label, color, icon, priority, is_builtin, is_active, created_at)
core_permissions (id, permission_code, description, module_id, created_at)
core_role_permissions (role_id, permission_id)  -- M:N

-- UNIT SYSTEM
core_units (id, unit_code, unit_label, unit_type, symbol, decimals, is_builtin, is_active)

-- i18n
core_translations (id, translation_key, locale, translation_value, updated_at)

-- MODULE METADATA
core_module_settings (id, module_id, setting_key, setting_value, setting_type, updated_at)

-- IMPORT PIPELINE (generikus)
core_import_configs (id, config_name, module_id, file_type, column_mapping JSON, filters JSON, unit_id, created_by, created_at)
core_import_log (id, config_id, filename, rows_total, rows_inserted, rows_updated, rows_skipped, duration_ms, imported_by, imported_at, status, error_message)

-- NOTIFICATION CENTER
core_notifications (id, user_id, module_id, title, message, severity, is_read, created_at)

-- LICENSE / FEATURE FLAGS
core_license (id, license_key, tier, modules_allowed JSON, expires_at, customer_name, created_at)
```

### 7.3 core_users tábla módosítás

```sql
ALTER TABLE core_users ADD role_id INT REFERENCES core_roles(id);
-- A 'role' NVARCHAR mező megmarad backwards-compat-ra, de role_id a primary
-- Migráció: UPDATE core_users SET role_id = (SELECT id FROM core_roles WHERE role_code = core_users.role)
```

---

## 8. ADMIN PANEL — Tervezett struktúra

```
/dashboard/admin/
  page.tsx                    ← Admin főoldal (dinamikus menü: core + modul-regisztrált)
  
  core/
    branding/page.tsx         ← Cégnév, logó, színek, favicon, login háttér
    locale/page.tsx           ← Nyelv, dátum formátum, pénznem
    roles/page.tsx            ← Role CRUD + permission mátrix (drag & drop)
    units/page.tsx            ← Mértékegységek kezelése
    users/page.tsx            ← Felhasználók (meglévő, bővítve role_id-vel)
    modules/page.tsx          ← Modul toggle (meglévő, tier-szűréssel)
    import-configs/page.tsx   ← Import konfigurációk (oszlop mapping)
    audit-log/page.tsx        ← Audit napló (meglévő)
    diagnostics/page.tsx      ← Rendszer állapot (meglévő)
    license/page.tsx          ← Licenc állapot, tier, lejárat
    
  modules/
    [moduleId]/page.tsx       ← Modul-specifikus admin beállítások (manifest-ből)
```

### 8.1 Admin menü generálás

Nem hardcode-olt ADMIN_MENU tömb, hanem:

```typescript
// Core admin menü regisztráció
const coreAdminMenuItems: AdminMenuItem[] = [
  { id: 'branding', title: 'Branding & Megjelenés', icon: 'Palette', href: '/dashboard/admin/core/branding', order: 10 },
  { id: 'locale',   title: 'Nyelv & Formátumok',    icon: 'Globe',   href: '/dashboard/admin/core/locale',   order: 20 },
  { id: 'roles',    title: 'Szerepkörök & Jogok',    icon: 'Shield',  href: '/dashboard/admin/core/roles',    order: 30 },
  { id: 'units',    title: 'Mértékegységek',         icon: 'Ruler',   href: '/dashboard/admin/core/units',    order: 40 },
  // ...
];

// + Modulok saját admin menüi a manifest-ből
const moduleAdminMenuItems = getActiveModules('admin')
  .filter(m => m.adminSettings?.length > 0)
  .map(m => ({
    id: m.id,
    title: `${m.name} beállítások`,
    icon: m.icon,
    href: `/dashboard/admin/modules/${m.id}`,
    order: 100 + m.order,
  }));
```

---

## 9. SETUP WIZARD (Első indítás)

Amikor a `setup_completed` setting `false`:

```
1. Üdvözlés
   → Nyelv választás (HU/EN/DE)

2. Adatbázis
   → DB típus (MSSQL/PostgreSQL/SQLite)
   → Kapcsolati adatok
   → Teszt kapcsolat → Migrációk futtatása

3. Admin fiók
   → Felhasználónév, jelszó, email
   → (Bootstrap admin helyettesítése)

4. Branding
   → Cégnév, logó feltöltés, szín választó

5. Modulok
   → Licenc kulcs megadása (ha van)
   → Elérhető modulok bekapcsolása

6. Mértékegységek
   → Alapértelmezett egységek kiválasztása
   → Egyedi egység hozzáadása

7. Összefoglaló
   → Minden beállítás áttekintése
   → [Indulás!] → setup_completed = true
```

---

## 10. FEJLESZTÉSI FÁZISOK (Végrehajtási terv)

### Fázis 0 — Refaktor előkészítés [1 hét]
- [ ] LAC-specifikus kód szeparálása a core-ból
- [ ] `database/lac/*` → `modules/lac-napi-perces/migrations/`
- [ ] `components/napi-perces/*` → `modules/lac-napi-perces/components/`
- [ ] `app/api/napi-perces/*` → `modules/lac-napi-perces/api/`
- [ ] `app/api/munkaterv/*` → `modules/lac-napi-perces/api/`
- [ ] `app/api/sap-import/*` → `modules/lac-napi-perces/api/`
- [ ] `lib/modules/registry.ts` utolsó 10 sor törlése (LAC regisztráció)
- [ ] `app/dashboard/admin/page.tsx` "SAP Import" hardcode eltávolítása

### Fázis 1 — Core Engine bővítés [2 hét]
- [ ] `core_roles` + `core_permissions` + `core_role_permissions` migráció
- [ ] `core_units` migráció + CRUD API
- [ ] `core_translations` migráció + i18n helper
- [ ] RBAC middleware: `checkPermission(request, 'workforce.edit')`
- [ ] `lib/validators/user.ts` → DB-ből töltött role-ok
- [ ] `lib/db/sql-helpers.ts` — SQL dialektus helper
- [ ] `lib/settings.ts` MERGE → adapter-specifikus upsert
- [ ] Minden MSSQL-specifikus SQL → helper-en keresztül
- [ ] `app_locale` setting + Intl.DateTimeFormat bevezetés

### Fázis 2 — Admin Panel bővítés [2 hét]
- [ ] Roles & Permissions admin oldal (CRUD + mátrix)
- [ ] Units admin oldal (CRUD)
- [ ] Branding admin oldal bővítése (favicon, login háttér)
- [ ] Locale admin oldal
- [ ] Import configs admin oldal (oszlop mapper UI)
- [ ] License admin oldal
- [ ] Admin menü dinamikus generálása
- [ ] Modul-specifikus admin settings renderer

### Fázis 3 — Modul rendszer véglegesítés [1 hét]
- [ ] `modules/_loader.ts` — Automatikus manifest discovery
- [ ] Dinamikus `[moduleId]` route-ok (dashboard + API)
- [ ] Modul migráció runner (modul aktiváláskor)
- [ ] Modul permission auto-regisztráció

### Fázis 4 — Basic csomag modulok [3 hét]
- [ ] `workforce` modul (létszám rögzítés, műszakok, hiányzás)
- [ ] `tracking` modul (feladat/rendelés felkövetés)
- [ ] `fleet` modul (gépkocsi futás, km, tankolás)
- [ ] `file-import` modul (generikus CSV/Excel, column mapping)
- [ ] `reports` modul (alap riport generátor)

### Fázis 5 — Multi-DB [2 hét]
- [ ] `PostgresAdapter` implementálás
- [ ] `SqliteAdapter` implementálás
- [ ] SQL dialektus tesztek (minden core query 3 DB-n)
- [ ] Setup wizard DB választó

### Fázis 6 — Multi-Auth [1 hét]
- [ ] `JwtAdapter` implementálás
- [ ] `OAuthAdapter` (Google, Microsoft Entra ID)
- [ ] Setup wizard auth választó

### Fázis 7 — Piacra vitel [2 hét]
- [ ] Setup wizard frontend
- [ ] Licenc rendszer (tier-ek, feature flag-ek)
- [ ] Docker image optimalizálás
- [ ] README + Dokumentáció (telepítés, modul fejlesztés)
- [ ] Landing page / marketing site

---

## 11. FÁJL STRUKTÚRA (Tervezett végállapot)

```
ainova-cloud-core/
│
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── change-password/page.tsx
│   ├── setup/                        ← SETUP WIZARD (új)
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                  ← Dinamikus tile-ok
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx              ← Dinamikus admin menü
│   │   │   ├── layout.tsx            ← Permission check
│   │   │   ├── core/
│   │   │   │   ├── branding/page.tsx
│   │   │   │   ├── locale/page.tsx
│   │   │   │   ├── roles/page.tsx
│   │   │   │   ├── units/page.tsx
│   │   │   │   ├── users/page.tsx
│   │   │   │   ├── modules/page.tsx
│   │   │   │   ├── import-configs/page.tsx
│   │   │   │   ├── audit-log/page.tsx
│   │   │   │   ├── diagnostics/page.tsx
│   │   │   │   └── license/page.tsx
│   │   │   └── modules/
│   │   │       └── [moduleId]/page.tsx
│   │   └── modules/
│   │       └── [moduleId]/
│   │           ├── page.tsx          ← Dinamikus modul dashboard
│   │           └── loading.tsx
│   ├── api/
│   │   ├── auth/                     ← ✅ megvan
│   │   ├── csrf/                     ← ✅ megvan
│   │   ├── health/                   ← ✅ megvan
│   │   ├── admin/
│   │   │   ├── users/                ← ✅ megvan
│   │   │   ├── modules/              ← ✅ megvan
│   │   │   ├── settings/             ← ✅ megvan
│   │   │   ├── audit-log/            ← ✅ megvan
│   │   │   ├── diagnostics/          ← ✅ megvan
│   │   │   ├── sync-status/          ← ✅ megvan
│   │   │   ├── roles/route.ts        ← ÚJ: Role CRUD
│   │   │   ├── permissions/route.ts  ← ÚJ: Permission CRUD
│   │   │   ├── units/route.ts        ← ÚJ: Unit CRUD
│   │   │   ├── import-configs/       ← ÚJ: Import config CRUD
│   │   │   └── license/route.ts      ← ÚJ: License info
│   │   ├── modules/
│   │   │   └── [moduleId]/
│   │   │       └── [...path]/route.ts ← Dinamikus modul API
│   │   └── setup/route.ts            ← ÚJ: Setup wizard API
│   ├── error.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── core/                         ← ✅ megvan (Header, MenuTile, stb.)
│   ├── admin/                        ← ✅ megvan + bővül
│   │   ├── roles/                    ← ÚJ: Permission mátrix
│   │   ├── units/                    ← ÚJ: Unit manager
│   │   ├── import-configs/           ← ÚJ: Column mapper
│   │   └── license/                  ← ÚJ: License info
│   ├── login/                        ← ✅ megvan
│   ├── providers/                    ← ✅ megvan
│   ├── setup/                        ← ÚJ: Setup wizard lépések
│   └── ui/                           ← ✅ megvan
│
├── lib/
│   ├── db/
│   │   ├── IDatabase.ts              ← ✅ megvan
│   │   ├── index.ts                  ← ✅ megvan
│   │   ├── sql-helpers.ts            ← ÚJ: Dialektus helper
│   │   ├── getPool.ts                ← ✅ megvan (raw MSSQL bypass)
│   │   └── adapters/
│   │       ├── MssqlAdapter.ts       ← ✅ megvan
│   │       ├── PostgresAdapter.ts    ← ÚJ
│   │       └── SqliteAdapter.ts      ← ÚJ
│   ├── auth/
│   │   ├── IAuthAdapter.ts           ← ✅ megvan
│   │   ├── index.ts                  ← ✅ megvan
│   │   └── adapters/
│   │       ├── SessionAdapter.ts     ← ✅ megvan
│   │       ├── JwtAdapter.ts         ← ÚJ
│   │       └── OAuthAdapter.ts       ← ÚJ
│   ├── import/                       ← ÚJ: Generikus import pipeline
│   │   ├── IImportAdapter.ts
│   │   ├── pipeline.ts
│   │   ├── column-mapper.ts
│   │   └── adapters/
│   │       ├── ExcelImportAdapter.ts
│   │       ├── CsvImportAdapter.ts
│   │       └── JsonImportAdapter.ts
│   ├── modules/
│   │   ├── registry.ts              ← ✅ megvan (bővül)
│   │   ├── types.ts                 ← ÚJ: ModuleManifest, AdminMenuItem
│   │   └── _loader.ts              ← ÚJ: Automatikus manifest loader
│   ├── i18n/
│   │   ├── index.ts                 ← ÚJ: t() function, locale cache
│   │   └── fallback/
│   │       ├── hu.json
│   │       └── en.json
│   ├── rbac/                        ← ÚJ: Permission check
│   │   ├── checkPermission.ts
│   │   └── middleware.ts
│   ├── license/                     ← ÚJ: License validation
│   │   └── index.ts
│   ├── api-utils.ts                 ← ✅ megvan
│   ├── constants.ts                 ← ✅ megvan (setting override-ok)
│   ├── csrf.ts                      ← ✅ megvan
│   ├── error-handler.ts             ← ✅ megvan (i18n-re váltandó)
│   ├── logger.ts                    ← ✅ megvan
│   ├── settings.ts                  ← ✅ megvan (adapter-specifikus upsert)
│   ├── settings-server.ts           ← ✅ megvan
│   ├── sync-events.ts               ← ✅ megvan
│   └── validators/
│       └── user.ts                  ← ✅ megvan (DB-role-ra váltandó)
│
├── modules/                          ← ÚJ: Plug-in modulok
│   ├── _loader.ts
│   ├── workforce/
│   ├── tracking/
│   ├── fleet/
│   ├── file-import/
│   ├── reports/
│   ├── performance/
│   ├── scheduling/
│   ├── delivery/
│   ├── sap-import/
│   └── lac-napi-perces/             ← Eredeti LAC modul (referencia implementáció)
│
├── database/
│   ├── core/                         ← ✅ megvan (bővül)
│   │   ├── 001_core_users.sql
│   │   ├── 002_core_sessions.sql
│   │   ├── 003_core_settings.sql
│   │   ├── 004_core_audit_log.sql
│   │   ├── 005_core_sync_events.sql
│   │   ├── 006_core_roles.sql        ← ÚJ
│   │   ├── 007_core_permissions.sql   ← ÚJ
│   │   ├── 008_core_units.sql         ← ÚJ
│   │   ├── 009_core_translations.sql  ← ÚJ
│   │   ├── 010_core_import_configs.sql← ÚJ
│   │   ├── 011_core_notifications.sql ← ÚJ
│   │   └── 012_core_license.sql       ← ÚJ
│   └── modules/                       ← Modul migrációk (dinamikus)
│
├── hooks/
│   └── useCsrf.ts                    ← ✅ megvan
│
├── scripts/
│   ├── migrate-all.ts                ← ✅ megvan (bővül: modul migrációk)
│   └── generate-hash.ts             ← ✅ megvan
│
├── public/
│   └── uploads/                      ← Branding fájlok
│
├── BLUEPRINT.md                      ← Ez a fájl
├── PLAN.md                           ← Eredeti terv (archív)
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 12. KULCSDÖNTÉSEK ÖSSZEFOGLALÓJA

| # | Döntés | Választás | Indok |
|---|---|---|---|
| 1 | Unit System | DB-driven, admin-konfig | Nem akarjuk hogy perc/db legyen hardcode |
| 2 | Role/Permission | DB tábla + admin mátrix | Nincs hardcode role, ügyfél maga állít be |
| 3 | i18n | DB + JSON fallback | Többnyelvű dobozos szoftver |
| 4 | Modul struktúra | manifest.ts + auto-loader | Új modul hozzáadás = 1 mappa |
| 5 | Import pipeline | Generikus + column mapper | Bármilyen Excel/CSV feldolgozható config-ból |
| 6 | Multi-DB | SQL helper + adapter | Fázis 5-ben, de az interface már kész |
| 7 | Multi-Auth | Adapter pattern | Fázis 6-ban, de az interface már kész |
| 8 | Licenc | Tier-based feature flag | basic / professional / enterprise |
| 9 | Setup wizard | Web UI, első indításkor | docker-compose up → böngésző → konfigurál |
| 10 | Admin menü | Dinamikus (core + modul) | Nincs hardcode menüpont |

---

## 13. MI A KÖVETKEZŐ LÉPÉS?

**Fázis 0 → LAC kód szeparálás.** Ez a legkisebb kockázatú, legnagyobb hatású lépés:

1. A `modules/lac-napi-perces/` mappa létrehozása
2. LAC fájlok áthelyezése
3. A core megtisztítása a LAC-specifikus kódtól
4. A modul rendszer tesztelése (LAC modul be/ki kapcsolható)

Ezzel a core "tiszta" lesz, és indulhat a tényleges dobozos feature fejlesztés.

---

*Ez a blueprint a teljes projekt feltérképezése és a dobozos szoftver felé vezető átfogó terv. Minden fejlesztési fázis önállóan deployolható — nincs „big bang" release.*
