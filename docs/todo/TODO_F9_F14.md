# F9–F14 — Multi-DB, Multi-Auth, Setup Wizard, Pro/Enterprise modulok, Piacra vitel

> **Ezek a későbbi fázisok.** Csak akkor kezdj hozzájuk, ha F0–F8 teljesen kész és tesztelve van.
> **Összesített időbecslés:** ~8 hét

---

## F9 — MULTI-DB SUPPORT

> **Cél:** PostgreSQL és SQLite adapter, hogy a vevő ne csak MSSQL-t használhasson.
> **Előfeltétel:** F0–F8 kész
> **Időbecslés:** 2 hét

### F9.1 — SQL dialektus helper: `lib/db/sql-helpers.ts`

**Fájl:** `lib/db/sql-helpers.ts` (ÚJ fájl)

Interface ami adapter-specifikus SQL kifejezéseket ad:

```typescript
export interface SqlDialect {
  now(): string;                                         // SYSDATETIME() | NOW() | datetime('now')
  dateAdd(unit: string, amount: number, field: string): string;  // DATEADD(...) | interval | datetime(...)
  upsert(table: string, columns: string[], keyColumns: string[]): string;  // MERGE | ON CONFLICT
  limit(n: number, offset?: number): string;             // OFFSET..FETCH | LIMIT..OFFSET
  newUuid(): string;                                     // NEWID() | gen_random_uuid() | custom
  bool(value: boolean): unknown;                         // 1/0 | true/false
  autoIncrement(): string;                               // IDENTITY(1,1) | SERIAL | AUTOINCREMENT
  returning(columns: string[]): string;                  // OUTPUT INSERTED.* | RETURNING * | ''
  top(n: number): string;                                // TOP N | '' (LIMIT a végén)
  concat(...parts: string[]): string;                    // + | || 
}
```

Implementáció: `MssqlDialect`, `PostgresDialect`, `SqliteDialect` osztályok.

### F9.2 — Meglévő MSSQL-specifikus SQL-ek cseréje

Az összes fájl ahol MSSQL-specifikus szintaxis van (`SYSDATETIME()`, `DATEADD`, `MERGE`, `TOP`, `OUTPUT INSERTED`, stb.) — cseréld a dialect helper hívásokra.

**Érintett fájlok (minimum):**
- `lib/settings.ts` — MERGE → dialect.upsert()
- `lib/sync-events.ts` — DATEADD, SYSDATETIME → dialect.dateAdd(), dialect.now()
- `lib/auth/adapters/SessionAdapter.ts` — DATEADD, SYSDATETIME, OUTPUT INSERTED
- `app/api/admin/audit-log/route.ts` — OFFSET..FETCH → dialect.limit()
- Összes migráció SQL — DB-specifikus verziók kellenek

### F9.3 — PostgresAdapter: `lib/db/adapters/PostgresAdapter.ts`

**Dependency:** `npm install pg @types/pg`

Implementáld az `IDatabaseAdapter` interface-t a `pg` driver-rel:
- Connection pool (pg.Pool)
- `query()` — paraméteres ($1, $2 syntax, nem @param)
- `execute()` — rowCount
- `transaction()` — BEGIN/COMMIT/ROLLBACK
- `close()`, `isConnected()`

**Fontos:** A PostgreSQL `$1` paraméter szintaxisa eltér az MSSQL `@param` szintaxisától. A QueryParam-okból kell konvertálni.

### F9.4 — SqliteAdapter: `lib/db/adapters/SqliteAdapter.ts`

**Dependency:** `npm install better-sqlite3 @types/better-sqlite3`

Szinkron driver — de az interface async. A `better-sqlite3` szinkron, wrappeld Promise-ba.

**Használat:** Kis cégeknek, demó telepítésekhez, vagy teszteléshez. Nem kell production-ready teljesítmény.

### F9.5 — Migrációk DB-specifikus verziói

Minden SQL migráció fájlnak létre kell hozni PostgreSQL és SQLite verziót is:

```
database/core/
  mssql/
    001_core_users.sql
    ...
  postgres/
    001_core_users.sql      ← SERIAL, BOOLEAN, NOW() szintaxis
    ...
  sqlite/
    001_core_users.sql      ← AUTOINCREMENT, INTEGER, datetime('now')
    ...
```

**Vagy:** Egyetlen migráció file, ami a dialect helper-rel generálja a megfelelő SQL-t (bonyolultabb, de kevesebb duplikáció).

### F9.6 — `lib/db/index.ts` bővítés

A `getDb()` factory-ban:
```typescript
case 'postgres':
  _db = new PostgresAdapter();
  break;
case 'sqlite':
  _db = new SqliteAdapter();
  break;
```

### F9.7 — Teszt

1. Minden core feature tesztelése MSSQL-lel (regresszió)
2. PostgreSQL: Docker-ben indítás, migrációk, login, CRUD
3. SQLite: lokális fájl, migrációk, login, CRUD
4. `DB_ADAPTER=postgres npm run dev` — működik
5. `DB_ADAPTER=sqlite npm run dev` — működik

---

## F10 — MULTI-AUTH SUPPORT

> **Cél:** JWT és OAuth (Google, Microsoft) adapter-ek.
> **Előfeltétel:** F0–F8 kész
> **Időbecslés:** 1.5 hét

### F10.1 — JwtAdapter: `lib/auth/adapters/JwtAdapter.ts`

**Dependency:** `npm install jose` (vagy a beépített Node.js crypto)

**Működés:**
- `login()` → access token (15 perc) + refresh token (7 nap, DB-ben tárolva)
- `validateSession()` → JWT verify (nem kell DB hívás az access token-hez, csak lejárat ellenőrzés)
- `logout()` → refresh token törlés DB-ből
- Rate limit és audit log ugyanúgy mint a SessionAdapter-ben

**Env:**
```
AUTH_ADAPTER=jwt
JWT_SECRET=minimum-32-karakter-titok
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### F10.2 — OAuthAdapter: `lib/auth/adapters/OAuthAdapter.ts`

**Működés:**
- `login()` → redirect az OAuth provider-hez (Google / Microsoft Entra ID)
- Callback endpoint: `/api/auth/oauth/callback` → token exchange → user létrehozás/felismerés → session cookie
- Az OAuth user-t a `core_users` táblában is eltároljuk (email alapján match)
- Ha az OAuth user nem létezik a rendszerben → auto-create (opcionális, admin setting-ből)

**Env:**
```
AUTH_ADAPTER=oauth
AUTH_OAUTH_PROVIDER=google | microsoft
AUTH_OAUTH_CLIENT_ID=...
AUTH_OAUTH_CLIENT_SECRET=...
AUTH_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/callback
```

### F10.3 — OAuth callback route

**Fájl:** `app/api/auth/oauth/callback/route.ts` (ÚJ fájl)

### F10.4 — Login oldal frissítés

Ha `AUTH_ADAPTER=oauth`: a login oldalon "Bejelentkezés Google-lel" / "Bejelentkezés Microsoft-tal" gomb jelenik meg a form helyett (vagy mellette).

### F10.5 — `lib/auth/index.ts` bővítés

```typescript
case 'jwt':
  _auth = new JwtAdapter(getDb());
  break;
case 'oauth':
  _auth = new OAuthAdapter(getDb());
  break;
```

### F10.6 — Teszt

1. `AUTH_ADAPTER=session` — regresszió (minden működik mint előtte)
2. `AUTH_ADAPTER=jwt` — login → token-ek kiosztása → session validate → logout
3. `AUTH_ADAPTER=oauth` — redirect → callback → session → dashboard

---

## F11 — SETUP WIZARD

> **Cél:** Amikor a rendszer először indul, egy wizard végigvezeti a telepítőt a konfiguráción.
> **Előfeltétel:** F0–F10 kész (vagy legalább F0–F8)
> **Időbecslés:** 1.5 hét

### F11.1 — Setup middleware

**Fájl:** `middleware.ts` (Next.js root middleware)

Ha `setup_completed` setting `false` (vagy a DB még nem elérhető):
- Minden request → redirect `/setup`-ra
- Kivéve: `/setup`, `/api/setup/*`, `/api/health`, statikus fájlok

### F11.2 — Setup API: `app/api/setup/route.ts`

**Endpoint-ok:**
- `GET /api/setup/status` — hol tart a setup (melyik lépésnél)
- `POST /api/setup/step/db` — DB konfiguráció tesztelés és mentés
- `POST /api/setup/step/admin` — Admin fiók létrehozás
- `POST /api/setup/step/branding` — Branding beállítás
- `POST /api/setup/step/modules` — Modulok aktiválás
- `POST /api/setup/step/license` — Licenc kulcs megadás
- `POST /api/setup/complete` — `setup_completed = true`

### F11.3 — Setup UI: `app/setup/page.tsx`

**7 lépéses wizard:**

1. **Üdvözlés** — Nyelv választás (HU/EN/DE)
2. **Adatbázis** — DB típus (MSSQL/PostgreSQL/SQLite), kapcsolati adatok, teszt gomb
3. **Admin fiók** — Felhasználónév, jelszó, email (a bootstrap admin helyettesítése)
4. **Branding** — Cégnév, logó feltöltés, szín választó
5. **Licenc** — Licenc kulcs megadás (opcionális — ha nem ad meg, basic)
6. **Modulok** — Elérhető modulok bekapcsolása (licenc alapján szűrve)
7. **Összefoglaló** — Minden beállítás áttekintése → "Indulás!" gomb

**Stílus:** Teljes képernyős wizard, lépés indikátor (1/7), "Előző" / "Következő" gombok, validáció lépésenként.

### F11.4 — Teszt

1. Töröld a `setup_completed` setting-et (vagy állítsd `false`-ra)
2. Böngészőben: minden URL → `/setup`-ra irányít
3. Wizard végigvezet → utána `/dashboard` betölt
4. Újraindítás → NEM mutatja a wizard-ot (setup_completed = true)

---

## F12 — PROFESSIONAL CSOMAG MODULOK

> **Előfeltétel:** F0–F8 kész
> **Időbecslés:** 3 hét (modulonként ~3 nap)

Minden modul az F8 sablonját követi (manifest, migráció, API, dashboard, hooks, types).

### F12.1 — PERFORMANCE modul
- Egyéni és csapat KPI dashboard
- Normaidő vs. valós idő összehasonlítás
- Trendek (heti/havi teljesítmény)
- Unit System: a mértékegység admin setting-ből

### F12.2 — SCHEDULING modul
- Heti kapacitás tervezés grid
- Feltöltési arányok (terv vs. tényleges)
- Drag & drop allokáció (opcionális)

### F12.3 — DELIVERY modul
- Kiszállítási riport
- Vevő-bontás, értékek (pénznem unit-ból)
- Diagram: havi kiszállítási trend

### F12.4 — INVENTORY modul
- Készletnyilvántartás (termék, mennyiség, minimum szint)
- Alertek: minimum szint alatti tételek
- Mozgás napló (bevétel / kiadás)

### F12.5 — SAP-IMPORT modul
- A LAC modul generalizált változata
- SAP SQVI Excel import, de az oszlop mapping az Import Pipeline config-ból jön (F6)
- Nem hardcode-olt SAP struktúra

---

## F13 — ENTERPRISE CSOMAG MODULOK

> **Előfeltétel:** F0–F8 kész
> **Időbecslés:** 4+ hét (ezek komplexebbek)

### F13.1 — OEE modul
- Overall Equipment Effectiveness dashboard
- 3 komponens: Rendelkezésre állás × Teljesítmény × Minőség
- Gép kiválasztó, időszak szűrő
- Automatikus kalkuláció vagy manuális bevitel

### F13.2 — PLC-CONNECTOR modul
- Logo PLC / Siemens S7 adatfeldolgozás
- TCP/IP vagy OPC-UA kapcsolat konfigurálása admin panelből
- Valós idejű adatgyűjtés → DB
- **Ez a legkomplexebb modul — külön specifikáció kell**

### F13.3 — SHIFT-MANAGEMENT modul
- Műszakbeosztás tervezés (heti/havi naptár nézet)
- Csapat rotáció szabályok
- Ütközés detektálás

### F13.4 — QUALITY modul
- Minőségellenőrzés: mérések, selejtezés
- 8D riport generátor
- Hibakód katalógus (admin konfigurálható)

### F13.5 — MAINTENANCE modul
- Karbantartás ütemezés (gépek, eszközök)
- MTBF / MTTR kalkuláció
- Alertek: esedékes karbantartások

### F13.6 — API-GATEWAY modul
- REST webhook fogadás (külső rendszerekből adatok)
- Webhook küldés (eseményekre)
- API kulcs kezelés
- Rate limiting per API kulcs

### F13.7 — MULTI-SITE modul
- Több telephely kezelés egy instance-ból
- Telephely szűrő a fejlécben
- Telephelyenként külön modulok/adatok

---

## F14 — DOCKER, DOKUMENTÁCIÓ, PIACRA VITEL

> **Előfeltétel:** F0–F11 kész (minimum)
> **Időbecslés:** 2 hét

### F14.1 — Docker image optimalizálás

- Multi-stage build (már van, finomhangolás)
- docker-compose.yml frissítés (PostgreSQL opció, SQLite volume)
- Health check finomítás
- Automatikus migráció induláskor (már van)

### F14.2 — Licenc generáló script

**Fájl:** `scripts/generate-license.ts` (ÚJ fájl)

CLI tool amivel te (a fejlesztő) generálsz licenc kulcsot a vevőnek:

```bash
npx tsx scripts/generate-license.ts \
  --tier professional \
  --customer "MühlCo Kft." \
  --email "admin@muhlco.hu" \
  --max-users 50 \
  --expires "2027-03-08" \
  --modules "workforce,tracking,fleet,file-import,reports,performance,scheduling"
```

Output: SQL INSERT amit a vevő DB-jébe kell futtatni, vagy egy licenc kulcs ami az admin panelen megadható.

### F14.3 — README.md

Tartalom:
- Mi ez a szoftver (1 bekezdés)
- Gyors start: `docker-compose up -d` → böngésző → setup wizard
- Követelmények: Docker, vagy Node.js 22+ és DB
- Csomagok és árazás (Basic / Pro / Enterprise)
- Modul lista
- Admin panel leírás
- Fejlesztői dokumentáció: új modul készítés (manifest sablon)
- Licenszelés
- Support

### F14.4 — Modul fejlesztői útmutató

**Fájl:** `docs/module-development.md` (ÚJ fájl)

Lépésről-lépésre útmutató arra, hogyan kell új modult készíteni:
1. Mappa létrehozás
2. manifest.ts írás
3. Migráció SQL
4. API route-ok
5. Dashboard komponens
6. `_loader.ts` frissítés
7. Tesztelés

### F14.5 — Changelog

**Fájl:** `CHANGELOG.md` (ÚJ fájl)

Verziónkénti változásnapló:
```
## 1.0.0 (2026-xx-xx)
- Initial release
- Core: auth, RBAC, units, i18n, license
- Basic: workforce, tracking, fleet, file-import, reports
- Admin: branding, roles, modules, diagnostics, audit log
```

### F14.6 — Végső teszt csomag

1. **Tiszta telepítés teszt:** Új Docker environment, semmi meglévő adat
   - docker-compose up → setup wizard → admin login → modulok bekapcsolása → CRUD
2. **Licenc teszt:** Basic licenc → csak Basic modulok → Pro upgrade → Pro modulok megjelennek
3. **Multi-user teszt:** Admin + Manager + User → különböző jogosultságok
4. **i18n teszt:** HU → EN → DE váltás
5. **Import teszt:** Excel feltöltés → config felismerés → import → adatok megjelennek
6. **Backup/Restore teszt:** DB dump → restore → minden működik
