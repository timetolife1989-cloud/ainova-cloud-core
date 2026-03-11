# Ainova Cloud Intelligence — Fejlesztői & Szoftvertulajdonosi Útmutató

> Ez a dokumentum neked szól, mint a szoftver fejlesztőjének és tulajdonosának. Minden lényeges tudást tartalmaz arról, hogyan működik a rendszer, mit hol találsz, és hogyan készítheted elő az értékesítésre.

---

## I. RENDSZER MŰKÖDÉSE

### 1. Első indítás — Setup Wizard

Amikor a szoftvert először telepíted egy ügyfélnél (vagy Docker-ben elindul):

1. Böngészőben megnyitja: `http://localhost:3000/setup`
2. **Admin fiók** létrehozása (felhasználónév + jelszó)
3. **Branding** beállítása (cégnév, nyelv)
4. **Modulok** kiválasztása (melyiket használják)
5. **Licenc kulcs** megadása (opcionális — nélküle Basic csomag)
6. → Rendszer használatra kész, redirect a login-ra

**API végpont:** `/api/setup` — GET (státusz), POST (lépés végrehajtás)
**UI:** `app/setup/page.tsx`

### 2. Bejelentkezés Flow

```
Felhasználó → /login → POST /api/auth/login
  ├── SessionAdapter: DB-backed session cookie (alapértelmezett)
  └── JwtAdapter: HMAC-SHA256 access token (opcionális)

Session validálás minden API hívásnál:
  Request → checkSession() → checkAuth() → API handler
```

**Fontos fájlok:**
- `lib/auth/index.ts` — Auth factory (SessionAdapter vagy JwtAdapter)
- `lib/auth/adapters/SessionAdapter.ts` — Session kezelés, rate limiting, cache
- `lib/auth/adapters/JwtAdapter.ts` — JWT token generálás és validálás
- `lib/api-utils.ts` — checkSession(), checkCsrf()
- `lib/rbac/middleware.ts` — checkAuth() permission ellenőrzés

### 3. Dashboard & Modul Betöltés

```
Felhasználó bejelentkezés után:
  1. GET /api/auth/validate-session → userId, role
  2. Dashboard betölti az aktív modulokat (getActiveModules)
  3. Modul tile-ok megjelennek a dashboardon
  4. Kattintás → /dashboard/modules/[moduleId]
  5. Dinamikus betöltés: modules/[moduleId]/components/DashboardPage.tsx
```

### 4. Admin Panel

Elérhető: `/dashboard/admin` (csak admin role)

| Menüpont | Funkció | API |
|----------|---------|-----|
| Felhasználók | CRUD, jelszó reset | `/api/admin/users` |
| Szerepkörök | RBAC, jogosultság mátrix | `/api/admin/roles` |
| Modulok | Be/kikapcsolás, beállítások | `/api/admin/modules` |
| Branding | Cégnév, logó, színek | `/api/admin/settings` |
| Mértékegységek | Egyedi unit-ok | `/api/admin/units` |
| Nyelv | HU/EN/DE, formátumok | `/api/i18n` |
| Import konfig | Oszlop mapping | `/api/admin/import-configs` |
| Diagnosztika | DB, uptime | `/api/admin/diagnostics` |
| Audit napló | Login/műveletek | `/api/admin/audit-log` |
| Licenc | Csomag, lejárat | `/api/admin/license` |

### 5. Modul Rendszer — Hogyan Működik

Minden modul egy önálló egység ezzel a struktúrával:

```
modules/workforce/
  manifest.ts             ← Modul definíció (registerModule hívás)
  migrations/001_xxx.sql  ← DB tábla(k)
  api/route.ts            ← API: GET (lista), POST (create)
  api/[id]/route.ts       ← API: GET/PUT/DELETE egyedi elem
  components/DashboardPage.tsx  ← React UI
  types/index.ts          ← TypeScript típusok
```

**Betöltés:** `modules/_loader.ts` importálja a manifest-eket → `registerModule()` hívódik → modul bekerül a registry-be → admin aktiválja → dashboard-on megjelenik.

**API proxy:** A `/api/modules/[moduleId]/[...path]` route automatikusan a megfelelő modul API fájlra routol.

### 6. Licenc Rendszer

**Generálás (fejlesztőként te csinálod):**
```bash
npx tsx scripts/generate-license.ts \
  --tier professional \
  --customer "Cég Kft." \
  --email "admin@ceg.hu" \
  --max-users 50 \
  --expires "2027-12-31"
```

**Output:** Licenc kulcs (XXXX-XXXX-XXXX-XXXX) + SQL INSERT + Base64 kód

**Tier-ek:**
- `basic` — 5 modul, max 10 user
- `professional` — 9 modul, max 50 user
- `enterprise` — 13+ modul, max 999 user

**Ellenőrzés:** Minden modul betöltésnél a `isModuleAllowed()` funkció ellenőrzi, hogy a modul tier-je megegyezik-e a licenc tier-jével.

### 7. Adatbázis Kapcsolat

**Kiválasztás:** `DB_ADAPTER` környezeti változó

| Érték | Driver | Telepítendő csomag |
|-------|--------|-------------------|
| `mssql` (default) | mssql | — (már benne van) |
| `postgres` | pg | `npm install pg` |
| `sqlite` | better-sqlite3 | `npm install better-sqlite3` |

**Migrációk futtatása:**
```bash
npx tsx scripts/migrate-all.ts
```

Ez végigfuttatja a `database/core/` mappában lévő SQL fájlokat, majd az aktív modulok `migrations/` mappáit.

---

## II. ÉRTÉKESÍTÉS & ÜGYFÉL KEZELÉS

### 8. Új ügyfél telepítése — Lépésről lépésre

1. **Docker image kiadása** (vagy kézi telepítés)
2. **DB létrehozása** az ügyfél szerverén (MSSQL / PostgreSQL)
3. **.env.local** konfigurálás (DB kapcsolat, titkos kulcsok)
4. **Licenc generálás** (tier + modulok + lejárat)
5. **Setup Wizard** futtatás (admin fiók + branding)
6. **Modul aktiválás** admin panelen
7. **Felhasználók** létrehozása

### 9. Ügyfél-specifikus testreszabás

Az ügyfélnek **nem kell** kódot módosítania. Minden testreszabás admin panelen:
- Cégnév, logó, színek → Branding beállítások
- Mértékegységek → Unit System (perc, darab, kg, stb.)
- Nyelv → Fordítások (JSON felülírás DB-ből)
- Import formátum → Import konfigurációk (oszlop mapping)
- Jogosultságok → Szerepkörök és jogok mátrix

### 10. Frissítés (Update) Folyamata

```
1. Új Docker image / git pull
2. npm install (ha új dependency van)
3. npm run build
4. Migrációk futnak automatikusan (idempotens SQL-ek)
5. Nincs adatvesztés, backward compatible
```

---

## III. FEJLESZTÉSI ÚTMUTATÓ

### 11. Új Modul Hozzáadása

Részletes útmutató: `docs/module-development.md`

**Gyors összefoglaló:**
1. Mappa létrehozás: `modules/<modul-id>/`
2. `manifest.ts` — registerModule()
3. `migrations/001_xxx.sql` — Idempotens tábla létrehozás
4. `api/route.ts` — GET + POST, checkAuth + checkCsrf
5. `components/DashboardPage.tsx` — React UI
6. `modules/_loader.ts` — Import hozzáadás
7. `npm run type-check && npm run build`

### 12. API Route Konvenciók

```typescript
// Minden API route ebből áll:
export async function GET(request: NextRequest) {
  // 1. Auth ellenőrzés
  const auth = await checkAuth(request, 'modul.view');
  if (!auth.valid) return auth.response;

  // 2. Query paraméterek
  const { searchParams } = new URL(request.url);

  // 3. DB lekérdezés (parameterized)
  const rows = await getDb().query<RowType>(sql, params);

  // 4. Válasz (camelCase mapping)
  return Response.json({ items: rows.map(mapRow) });
}

export async function POST(request: NextRequest) {
  // 1. Auth + CSRF
  const auth = await checkAuth(request, 'modul.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  // 2. Zod validáció
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: ... }, { status: 400 });

  // 3. DB insert (OUTPUT INSERTED.id)
  const result = await getDb().query<{ id: number }>(insertSql, params);

  // 4. 201 Created
  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
```

### 13. Dashboard Komponens Konvenciók

```tsx
// Minden DashboardPage.tsx ebből áll:
'use client';

export default function XxxDashboardPage() {
  // 1. State: items, loading, modalOpen, form state, error
  // 2. fetchData: GET /api/modules/xxx/data
  // 3. handleSave: POST + CSRF token
  // 4. Summary cards (grid)
  // 5. Data table vagy card grid
  // 6. Modal form (create/edit)
}
```

### 14. Környezeti Változók (.env.local)

```env
# DB
DB_ADAPTER=mssql
DB_SERVER=localhost
DB_DATABASE=ainova
DB_USER=sa
DB_PASSWORD=xxxxx
DB_PORT=1433

# Auth
AUTH_ADAPTER=session
JWT_SECRET=minimum-32-karakter-titkos-kulcs

# Features
FE_LOGIN_AUDIT=true
FE_LOGIN_RATE_LIMIT=true

# App
NEXTAUTH_SECRET=xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 15. Docker Telepítés

```bash
# Fejlesztéshez
docker-compose -f docker-compose.dev.yml up -d

# Élesben
docker-compose up -d
```

**docker-compose.yml** tartalmazza:
- `app` — Next.js container (port 3000)
- `db` — MSSQL container (port 1433)

### 16. Tesztelés

```bash
# Type check
npm run type-check

# Build (teljes)
npm run build

# Dev szerver
npm run dev

# Migráció
npx tsx scripts/migrate-all.ts

# Admin létrehozás
npx tsx scripts/bootstrap-admin.ts
```

---

## IV. HIBAELHÁRÍTÁS

### 17. Gyakori Hibák

| Hiba | Ok | Megoldás |
|------|----|---------|
| "DB connection failed" | Nincs DB kapcsolat | Ellenőrizd .env.local, DB szerver fut-e |
| "Nincs jogosultságod" | Permission hiányzik | Admin panelen adj jogot a szerepkörhöz |
| "Ismeretlen modul" | Modul nincs regisztrálva | Ellenőrizd _loader.ts importot |
| "Licenc lejárt" | Lejárt licenc | Generálj új licencet |
| "CSRF token invalid" | Cookie hiányzik | Hívd meg GET /api/csrf először |
| Build hiba | TypeScript hiba | `npm run type-check` részletes hibaüzenetért |

### 18. Naplózás

A rendszer a `console.log/error` formátumot használja prefix-ekkel:
- `[Auth]` — Bejelentkezés, session
- `[RBAC]` — Jogosultság ellenőrzés
- `[DB]` — Adatbázis kapcsolat
- `[Module API]` — Modul-specifikus API hívások
- `[Import]` — Import pipeline

---

## V. GYORS REFERENCIA

### Fontos fájl helyek

| Mit keresek? | Hol találom? |
|-------------|--------------|
| Auth logika | `lib/auth/adapters/SessionAdapter.ts` |
| DB adapter | `lib/db/adapters/MssqlAdapter.ts` |
| Permission check | `lib/rbac/middleware.ts` |
| Modul regisztráció | `lib/modules/registry.ts` |
| Modul betöltés | `modules/_loader.ts` |
| Beállítások | `lib/settings.ts` |
| Licenc check | `lib/license.ts` |
| Core migrációk | `database/core/` |
| Modul migrációk | `modules/[moduleId]/migrations/` |
| Admin API-k | `app/api/admin/` |
| Dashboard főoldal | `app/dashboard/page.tsx` |
| Setup wizard | `app/setup/page.tsx` |
| PDF/Excel export | `lib/export/pdf.ts`, `lib/export/excel.ts` |
| Email értesítések | `lib/notifications/email.ts` |
| SSE real-time | `lib/sse/event-bus.ts`, `app/api/sse/` |
| Workflow engine | `lib/workflows/engine.ts` |
| API Gateway | `lib/api-gateway/middleware.ts` |
| AI asszisztens | `lib/ai/assistant.ts` |
| Globális keresés | `components/core/CommandPalette.tsx` |
| Landing page | `app/(marketing)/page.tsx` |
| PWA manifest | `public/manifest.json`, `public/sw.js` |

### Parancsok

```bash
npm run dev          # Dev szerver (port 3000)
npm run build        # Production build
npm run type-check   # TypeScript ellenőrzés
npm run test         # Unit tesztek (vitest)
npm run test:watch   # Tesztek watch módban
npm run test:coverage # Tesztek + lefedettség
npx tsx scripts/migrate-all.ts        # DB migrációk
npx tsx scripts/bootstrap-admin.ts    # Admin fiók
npx tsx scripts/generate-license.ts   # Licenc generálás
npx tsx scripts/seed-demo-data.ts     # Demo adatok generálása
```

---

## VI. ÚJ FEATURE-ÖK (v1.1+)

### 19. PDF/Excel Export
Minden modulban elérhető export funkció:
- **API**: `GET /api/modules/[moduleId]/export?format=xlsx` vagy `?format=pdf`
- **Excel**: Styled header, auto-width, frozen panes, auto filter
- **PDF**: HTML template, cégnév + logó + dátum fejléc

### 20. Globális Keresés (Ctrl+K)
- **Ctrl+K** vagy **Cmd+K** → Command Palette megnyitása
- Keresés oldalak, admin menüpontok, és aktív modulok között
- Keyboard navigáció: ↑↓ Enter Esc
- API: `GET /api/search?q=keyword`

### 21. Nyelvváltó (HU/EN/DE)
- Header-ben zászlós dropdown → azonnali nyelvváltás
- `app_locale` setting frissítése → page reload
- Kilépés gomb, hét szám, stb. is változik

### 22. Email Értesítések
- **SMTP konfiguráció**: Admin panelből VAGY környezeti változókból
- Sablonok: alert, riport összefoglaló, welcome email
- `lib/notifications/email.ts` — nodemailer (optional dependency)

### 23. Real-time Updates (SSE)
- **Server-Sent Events**: `GET /api/sse/[moduleId]`
- Event Bus (in-memory pub/sub): `lib/sse/event-bus.ts`
- Heartbeat: 30 másodperces keep-alive

### 24. Workflow Automatizáció
- **No-code szabály motor**: HA feltétel AKKOR akció(k)
- Trigger → Conditions (AND) → Actions (email, notification, webhook, log)
- Admin API: `GET/POST /api/admin/workflows`
- DB: `core_workflow_rules` tábla

### 25. API Gateway
- **Külső rendszerek** API key-vel érhetik el az adatokat
- `X-API-Key` header → jogosultság ellenőrzés
- Admin API: `GET/POST /api/admin/api-keys`
- DB: `core_api_keys` tábla

### 26. AI Asszisztens
- **OpenAI GPT-4o-mini** integration
- Természetes nyelvű kérdések → SQL generálás → válasz
- API: `POST /api/ai/query { question: "..." }`
- **Szükséges**: `OPENAI_API_KEY` env var

### 27. Multi-site Támogatás
- Több telephely kezelése: `core_sites` tábla
- Admin API: `GET/POST /api/admin/sites`
- Alapértelmezett telephely: "Főtelephely" (HQ)

### 28. PLC Connector
- PLC vezérlők automatikus adatgyűjtése (Siemens S7, Modbus, MQTT)
- Eszközök, registerek, adatgyűjtés táblák
- Dashboard: online/offline státusz, eszközlista

### 29. Digital Twin
- 2D gyártósor vizualizáció canvas-on
- Gépek valós idejű állapota (fut/áll/figyelmeztetés/hiba/karbantartás)
- Kattintás → részletek popup
- Demo adatok, ha nincs layout

### 30. Dashboard Builder
- Felhasználónkénti dashboard layoutok
- Widget típusok: KPI, bar, line, pie, table, gauge, heatmap
- API: `GET/POST /api/admin/dashboard-layouts`

### 31. PWA (Progressive Web App)
- Installable web app (manifest.json)
- Service Worker (stale-while-revalidate cache)
- Apple mobile web app support

### 32. Tesztek & CI
- **vitest**: Unit tesztek (`tests/` mappa)
- **GitHub Actions**: CI pipeline (lint + type-check + build + test)
- Coverage: v8 provider, text + HTML riporter
