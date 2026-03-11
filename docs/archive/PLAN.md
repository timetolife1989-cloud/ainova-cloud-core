# Ainova Cloud Intelligence — Termékterv

> **Státusz:** Tervezési fázis — 2026-03-07  
> **Előző:** Ainova v1 (LAC-specifikus gyártáskövetés, MSSQL-hardwired)  
> **Cél:** Eladható, dobozos core rendszer — gyártó és egyéb cégeknek

---

## 1. Mi ez?

**Ainova Cloud Intelligence** egy white-label termelési / vállalati dashboard platform.

- Nem egy konkrét cégre szabott rendszer
- Admin panelből **minden** konfigurálható (branding, modulok, DB, auth)
- Moduláris: core + opcionális plug-in modulok
- DB-agnosztikus: MSSQL, PostgreSQL, SQLite — mind működik
- Auth-agnosztikus: saját session, JWT, OAuth (Google/MS)
- Alapból Next.js — de az API réteg cserélhető

Az ügyfél kap egy laptopon/szerveren futó Next.js alkalmazást.  
Admin panelen beállítja a DB-t, bekapcsolja a modulokat, feltölti a logót — kész.  
Ha speciális modul kell neki → külön fejlesztjük, plug-inként adjuk hozzá.

---

## 2. Az Ainova-ból kibontott darabok

### 2.1 Core Framework (minden telepítésnél benne van)

| Réteg | Ainova-ban mi volt | Cloud Core-ban mi lesz |
|---|---|---|
| **Auth** | Custom session → MSSQL `dbo.Sessions` | `IAuthAdapter` interface + 3 adapter |
| **DB** | Raw `mssql` pool, `dbo.` prefix | `IDatabaseAdapter` + driver-specifikus impl. |
| **CSRF** | Double-submit cookie, konstans idő | Megmarad, de session-store-tól független |
| **Session** | DB-backed, in-memory cache (15 min TTL) | Ugyanez, de adapter mögött |
| **Rate limit** | DB `LoginHistory` + in-memory fallback | Marad, DB-adapter-alapú |
| **User mgmt** | `AinovaUsers`, 6 role, soft delete | Generikus `users` tábla, role-ok konfigból |
| **RBAC** | Role enum hardcode-olva | Config-alapú role → permission mapping |
| **Admin panel shell** | 11 aloldal, PIN modal | Generikus admin shell, modul-registry |
| **Settings rendszer** | `ainova_admin_settings` tábla | Generikus KV store, typed settings |
| **Audit trail** | `LoginHistory`, `SyncErrors` | Generikus `audit_log` tábla |
| **Health check** | `/api/health` | Megmarad |
| **Import pipeline** | 3 lépéses: upload → detect → process | Generikus `IImportAdapter` interface |
| **Export pipeline** | ExcelJS alapú | Generikus `IExportAdapter` |
| **Notification** | `ainova_sync_errors` alapú | Generikus in-app notification center |

### 2.2 Opcionális modulok (bekapcsolható/kikapcsolható)

Minden modul tartalmaz:
- Saját DB migrációk (csak akkor futnak, ha a modul aktív)
- API route-ok (`/api/modules/<modul-nev>/`)
- Dashboard oldal (`/dashboard/<modul-nev>/`)
- Admin beállítások (saját settings section)
- Saját típusok, hookok, komponensek

| Modul neve | Ainova oldal | Mit csinál | Cél ipar |
|---|---|---|---|
| `workforce` | Létszám rögzítés + Kimutatás | Napi műszaki létszám rögzítés, hiányzások, jogosítványok | Gyártás, logisztika |
| `performance` | Operátori Teljesítmény | Egyéni és területi KPI, normaidő vs. valós idő | Gyártás |
| `delivery` | Leszállított Termékek | Kiszállítási riport, EUR érték | Gyártás, raktár |
| `daily-minutes` | Napi Perces | Leadott/lehívott percek nyomon követése | Gyártás (LAC-típus) |
| `scheduling` | Allokációs Táblázat | Heti kapacitás tervezés, feltöltési arányok | Gyártás, projekt |
| `production-tracking` | Termelés Követés | Rendelés státusz, anyag keresés | Gyártás |
| `area-performance` | Területi Teljesítmény | Munkakör-szintű összesítés, trend | Gyártás |
| `equipment` | Impregnáló Kaloda | Gép/berendezés throughput tracking | Gyártás (domain-specifikus) |
| `war-room` | War Room Print | Nyomtatható műszaki riport | Gyártás |
| `sap-import` | SAP Import | SQVI Excel drop zone, típus-detekt | Gyártás (SAP-os cégek) |
| `file-import` | (generikus) | Generikus CSV/Excel import, column mapping | Bármely ipar |

---

## 3. Technikai architektúra

### 3.1 DB Adapter réteg

```
lib/
  db/
    IDatabase.ts          ← interface: query, execute, transaction, migrate
    adapters/
      MssqlAdapter.ts     ← mssql driver (jelenlegi Ainova logika)
      PostgresAdapter.ts  ← pg / postgres driver
      SqliteAdapter.ts    ← better-sqlite3 (tesztelés / kis cégek)
    index.ts              ← getDb(): IDatabaseAdapter — env alapján auto-select
```

**Env:**
```env
DB_ADAPTER=mssql | postgres | sqlite
DB_SERVER=...
DB_DATABASE=...
```

**Miért nem ORM (Prisma)?**  
ORM behoz egy csomó véleményt a sémáról. A meglévő Ainova SQL view-k (pl. `v_napi_perces`) nem ORM-barátok. Raw adapter + typed query helpers = rugalmasabb.  
*Ha valaki kifejezetten kéri: Prisma adapter is megírható.*

### 3.2 Auth Adapter réteg

```
lib/
  auth/
    IAuthAdapter.ts         ← interface: login, logout, validate, createUser
    adapters/
      SessionAdapter.ts     ← DB-backed session (jelenlegi Ainova logika, DB-agnosztikus)
      JwtAdapter.ts         ← stateless JWT (Redis nélkül is megy)
      OAuthAdapter.ts       ← OAuth2 (Google, Microsoft Entra ID)
    index.ts                ← getAuth(): IAuthAdapter — env alapján auto-select
```

**Env:**
```env
AUTH_ADAPTER=session | jwt | oauth
AUTH_OAUTH_PROVIDER=google | microsoft
AUTH_OAUTH_CLIENT_ID=...
AUTH_OAUTH_CLIENT_SECRET=...
JWT_SECRET=...
SESSION_SECRET=...
```

### 3.3 Modul Rendszer

```
modules/
  registry.ts             ← aktív modulok listája (DB settings-ből tölt be)
  <modul-nev>/
    manifest.ts           ← {name, version, routes, adminSettings, migrations}
    migrations/           ← modul-specifikus SQL / DDL
    api/                  ← modul API route-ok
    components/           ← modul UI komponensek
    hooks/                ← modul hookok
    types.ts              ← modul típusok
```

**Admin panelből:**
```
Modulok → [ ] workforce  [ ] performance  [✓] sap-import  ...
           Mentés → registry frissül → dashboard tile-ok megjelennek/eltűnnek
```

### 3.4 White-Label / Branding

Admin panelből beállítható:
```
Branding:
  - Cégnév (pl. "Ainova" → "MühlCo Dashboard")
  - Logo (fájlfeltöltés)
  - Elsődleges szín (hex)
  - Másodlagos szín (hex)
  - Login oldal háttér (kép vagy szín)
  - Favicon
```

Tárolás: `core_settings` tábla + `public/uploads/` mappában.

### 3.5 Admin Panel struktúra

```
/dashboard/admin/
  core/
    settings/             ← DB kapcsolat, auth mód, branding
    modules/              ← modulok be/ki kapcsolás
    users/                ← felhasználók (megmarad az Ainova logika)
    roles/                ← role → permission mapping (config)
    audit-log/            ← audit trail viewer
    health/               ← rendszer állapot, DB kapcsolat test
  modules/
    <modul-nev>/          ← modul-specifikus beállítások (modul adja be)
```

---

## 4. Import Pipeline (generikus)

Az Ainova 3-lépéses import rendszere általánosítható:

```
lib/
  import/
    IImportAdapter.ts     ← interface: detect(file) → type, process(file, type) → result
    adapters/
      ExcelImportAdapter.ts  ← ExcelJS-alapú (jelenlegi Ainova logika)
      CsvImportAdapter.ts    ← CSV feldolgozás
      JsonImportAdapter.ts   ← REST API / webhook fogadás
    pipeline.ts            ← upload → detect → process → result
```

Az import adapter modulonként regisztrálható:
```typescript
// modules/sap-import/manifest.ts
importAdapters: [
  { type: 'visszajelentes', handler: VisszajelentesImportAdapter },
  { type: 'norma_friss',    handler: NormaFrissImportAdapter },
]
```

---

## 5. Fejlesztési fázisok

### Fázis 1 — Core Framework (ez a következő lépés)
- [ ] Projekt inicializálás (Next.js 15, TypeScript, Tailwind v4)
- [ ] DB adapter réteg: interface + MssqlAdapter (Ainova kódból portolva)
- [ ] Auth adapter réteg: SessionAdapter (Ainova kódból portolva)
- [ ] Core tábla migrációk (users, sessions, settings, audit_log)
- [ ] Login / logout / session validáció
- [ ] CSRF middleware
- [ ] Admin panel shell (üres, modulok nélkül)
- [ ] User management (Ainova admin/users portolva)
- [ ] Settings rendszer (KV store)
- [ ] Health check endpoint
- [ ] Branding settings

### Fázis 2 — Modul Rendszer
- [ ] Module registry (admin panelből be/ki kapcsolható)
- [ ] `workforce` modul (létszám — Ainova portolva)
- [ ] `performance` modul (teljesítmény — Ainova portolva)
- [ ] `sap-import` modul (Ainova import pipeline portolva)
- [ ] `file-import` modul (generikus CSV/Excel)

### Fázis 3 — Multi-DB & Multi-Auth
- [ ] PostgresAdapter
- [ ] SqliteAdapter
- [ ] JwtAdapter
- [ ] OAuthAdapter (Google / Microsoft)

### Fázis 4 — Piacra vitel
- [ ] Docker image (egyszerű telepítés)
- [ ] Setup wizard (első indításkor: DB, admin user, branding)
- [ ] Licenc rendszer (feature flag-ek)
- [ ] Dokumentáció (telepítés, modul fejlesztés)

---

## 6. Ami az Ainova-ban marad (ne portold)

| Mi | Miért nem kell a core-ba |
|---|---|
| `v_napi_perces` view | LAC-specifikus SQL logika |
| `sap_visszajelentes` tábla | LAC-specifikus SAP struktúra |
| `norma_friss` tábla | LAC-specifikus normaidő rendszer |
| `impregnalo-kaloda` modul | Domain-specifikus berendezés |
| `war-room` nyomtatás | LAC-specifikus riport |
| 47-59-es migrációk | LAC-specifikus view refaktorok |

Ezek megmaradnak az **ainova** projektben, LAC-ügyfélspecifikus bővítményként.  
A cloud core-ból `sap-import` és `daily-minutes` modulként opcionálisan elérhető,  
de a LAC-specifikus üzleti logika (05:45 shift, C-termék szűrő, stb.) **nem** kerül bele.

---

## 7. Tech Stack döntések

| Döntés | Választás | Indok |
|---|---|---|
| Framework | Next.js 15 App Router | Ainova-val azonos, könnyű portolás |
| Styling | Tailwind CSS v4 | Ainova-val azonos |
| State | TanStack Query v5 | Ainova-val azonos, bevált |
| Charts | Recharts | Ainova-val azonos |
| Icons | Lucide React | Ainova-val azonos |
| DB default | MSSQL (adapter) | Legtöbb gyártó cégnek ez van |
| Auth default | Session (DB-backed) | Egyszerű, biztonságos, no-JWT overhead |
| Password | bcryptjs | Ainova-val azonos |
| Validation | Zod | Ainova-val azonos |
| File import | ExcelJS | Ainova-val azonos |
| Animációk | Framer Motion | Ainova-val azonos |
| 3D effektek | Three.js (opcionális) | Csak ha branding igényli |
| Containerization | Docker (Fázis 4) | Egyszerű customer deployment |
| Testing | Vitest + Playwright | Jest helyett gyorsabb |

---

## 8. Mappa struktúra (tervezett)

```
ainova-cloud-core/
  app/
    (auth)/
      login/page.tsx
      change-password/page.tsx
    dashboard/
      page.tsx                  ← főoldal, dinamikus tile-ok
      admin/
        core/...
        modules/...
        users/...
      layout.tsx
    api/
      auth/...
      admin/...
      health/route.ts
      modules/                  ← modul-specifikus route-ok
  components/
    core/                       ← shared UI (Header, MenuTile, etc.)
    admin/                      ← admin panel komponensek
  lib/
    db/                         ← DB adapter réteg
    auth/                       ← Auth adapter réteg
    import/                     ← Import pipeline
    export/                     ← Export pipeline
    constants.ts
    csrf.ts
    logger.ts
    error-handler.ts
  modules/
    registry.ts
    workforce/
    performance/
    sap-import/
    file-import/
    ...
  database/
    core/                       ← core migrációk (users, sessions, settings)
    modules/                    ← modul-specifikus migrációk
  public/
    uploads/                    ← branding feltöltések
  PLAN.md                       ← ez a fájl
  README.md
  .env.example
```

---

## 9. Kulcskérdések / Döntések (még nyitott)

| Kérdés | Opciók | Ajánlás |
|---|---|---|
| Licenc modell | Open core? SaaS? Licensz díj? | Egyszeri licensz + éves support |
| Modul árazás | Ingyenes core + fizetős modulok? | Igen, ez a "open core" modell |
| Multi-tenant? | Egy DB minden ügyfélnek, vagy séma/tenant szeparáció? | V1: egy telepítés = egy ügyfél |
| Setup wizard | Webes UI vagy CLI? | Webes (admin panel első indítás) |
| Update rendszer | Git pull? Docker pull? | Docker (Fázis 4) |

---

*Következő lépés: Fázis 1 — Core Framework implementáció.*  
*Szétválasztás: ez az ainova-cloud-core projektben épül, az ainova projekt érintetlen marad.*
