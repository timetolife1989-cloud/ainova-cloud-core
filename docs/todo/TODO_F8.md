# F8 — BASIC CSOMAG MODULOK

> **Cél:** Az 5 alap modul elkészítése, amiket minden Basic csomag tartalmaz. Ezek univerzális modulok — bármilyen iparágban használhatók.
> **Előfeltétel:** F0-F7 kész (a modul rendszer, licenc, RBAC, unit system, i18n mind működik)
> **Időbecslés:** 3 hét (modulonként ~3 nap)

---

## Közös sablon minden modulhoz

Minden modul ugyanazt a struktúrát követi. Mielőtt nekiállsz, értsd meg a mintát:

```
modules/<modul-id>/
  manifest.ts                 ← Modul definíció + registerModule() hívás
  migrations/
    001_<táblanév>.sql        ← DB tábla(k) — idempotens (IF NOT EXISTS)
  api/
    route.ts                  ← Fő CRUD API (GET lista, POST létrehozás)
    [id]/route.ts             ← Egyedi elem (GET, PUT, DELETE)
    export/route.ts           ← Excel export (opcionális)
  components/
    DashboardPage.tsx         ← Modul fő dashboard oldal ('use client')
    Table.tsx                 ← Adatok táblázatos megjelenítése
    Form.tsx                  ← Létrehozás/szerkesztés form (modal)
    Charts.tsx                ← Diagramok (opcionális)
    index.ts                  ← Re-exportok
  hooks/
    useData.ts                ← TanStack Query hook az API-hoz
  types/
    index.ts                  ← TypeScript típusok
  admin/
    settings.tsx              ← Modul-specifikus admin beállítások (opcionális)
  i18n/
    hu.json                   ← Magyar szövegek
    en.json                   ← Angol szövegek
```

**Fontos szabályok:**
- Az API route-okban `@/lib/api-utils` és `@/lib/rbac/middleware` használata (checkAuth)
- A mértékegységek a Unit System-ből jönnek — NEM hardcode
- A szövegek i18n kulcsokkal — NEM hardcode magyar
- Minden tábla `core_` prefix NÉLKÜL, de a modul ID-vel prefixelve: `workforce_daily`, `tracking_items`, stb.
- Minden migráció idempotens (IF NOT EXISTS)
- Permission-ök a manifest.ts-ben definiálva → auto-regisztráció F5.6 alapján

---

## F8.1 — WORKFORCE modul (Létszám & Jelenlét)

### F8.1.1 — manifest.ts

```typescript
import { registerModule } from '@/lib/modules/registry';

export const manifest = {
  id: 'workforce',
  name: 'Létszám & Jelenlét',
  description: 'Napi műszaki létszám rögzítés, hiányzások, jogosítványok nyomon követése',
  icon: 'Users',
  href: '/dashboard/modules/workforce',
  color: 'bg-indigo-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: [
    'workforce.view',
    'workforce.edit',
    'workforce.export',
  ],
  adminSettings: [
    { key: 'workforce_shifts_per_day', label: 'Műszakok száma naponta', type: 'number', default: '3' },
    { key: 'workforce_unit', label: 'Létszám mértékegysége', type: 'unit_select', default: 'pieces' },
    { key: 'workforce_track_absences', label: 'Hiányzások nyomon követése', type: 'boolean', default: 'true' },
  ],
  migrations: ['001_workforce.sql'],
};

registerModule(manifest);
```

### F8.1.2 — Migráció: `modules/workforce/migrations/001_workforce.sql`

```sql
-- Workforce modul tábla: napi műszaki létszám

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'workforce_daily')
  CREATE TABLE workforce_daily (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    record_date     DATE NOT NULL,
    shift_name      NVARCHAR(50),               -- Műszak neve (admin setting-ből konfigurálható)
    area_name       NVARCHAR(100),              -- Terület/részleg neve
    planned_count   DECIMAL(10,2) DEFAULT 0,    -- Tervezett létszám (unit_id szerinti egységben)
    actual_count    DECIMAL(10,2) DEFAULT 0,    -- Tényleges létszám
    absent_count    DECIMAL(10,2) DEFAULT 0,    -- Hiányzók száma
    notes           NVARCHAR(500),
    recorded_by     NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_workforce_daily' AND object_id = OBJECT_ID('workforce_daily'))
  CREATE UNIQUE INDEX UQ_workforce_daily ON workforce_daily(record_date, shift_name, area_name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_workforce_date' AND object_id = OBJECT_ID('workforce_daily'))
  CREATE INDEX idx_workforce_date ON workforce_daily(record_date DESC);
GO
```

### F8.1.3 — API route-ok

**`modules/workforce/api/route.ts`:**
- GET: Lista lekérés (szűrés: dátum range, terület, műszak; paginálás)
- POST: Új bejegyzés (Zod validáció, permission: `workforce.edit`)

**`modules/workforce/api/[id]/route.ts`:**
- GET: Egyedi elem
- PUT: Módosítás
- DELETE: Törlés

**`modules/workforce/api/export/route.ts`:**
- GET: Excel export (ExcelJS, permission: `workforce.export`)

### F8.1.4 — Dashboard oldal

**`modules/workforce/components/DashboardPage.tsx`:**
- **Fejléc:** "Létszám & Jelenlét" + dátum választó + terület szűrő
- **Összesítő kártyák:** Tervezett / Tényleges / Hiányzó (mai nap)
- **Táblázat:** Utolsó 14 nap adatai, soronként: dátum, műszak, terület, tervezett, tényleges, hiányzó, megjegyzés
- **Diagram (Recharts):** Heti trend (tervezett vs. tényleges létszám)
- **Rögzítés gomb (+ modal):** Új napi létszám rögzítése — dátum, műszak, terület, számok

### F8.1.5 — Loader frissítés

**Fájl:** `modules/_loader.ts`

Kommentezd ki a workforce importot:
```typescript
import '@/modules/workforce/manifest';
```

---

## F8.2 — TRACKING modul (Feladat/Rendelés felkövetés)

### F8.2.1 — manifest.ts

```typescript
{
  id: 'tracking',
  name: 'Felkövetés',
  description: 'Feladat és rendelés felkövetés — státuszok, timeline, felelősök',
  icon: 'ClipboardCheck',
  href: '/dashboard/modules/tracking',
  color: 'bg-emerald-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: ['tracking.view', 'tracking.edit', 'tracking.export'],
  adminSettings: [
    { key: 'tracking_statuses', label: 'Státuszok (vesszővel elválasztva)', type: 'string', default: 'Nyitott,Folyamatban,Kész,Lezárt' },
    { key: 'tracking_unit', label: 'Mennyiségi egység', type: 'unit_select', default: 'pieces' },
  ],
  migrations: ['001_tracking.sql'],
}
```

### F8.2.2 — Migráció: `modules/tracking/migrations/001_tracking.sql`

```sql
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tracking_items')
  CREATE TABLE tracking_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    reference_code  NVARCHAR(100),              -- Rendelés/feladat szám
    title           NVARCHAR(200) NOT NULL,
    description     NVARCHAR(MAX),
    status          NVARCHAR(50) NOT NULL DEFAULT 'Nyitott',  -- Admin setting-ből konfigurálható
    priority        NVARCHAR(20) DEFAULT 'normal',            -- 'low', 'normal', 'high', 'urgent'
    assigned_to     NVARCHAR(100),
    quantity         DECIMAL(10,2),              -- Mennyiség (unit_id szerinti)
    due_date        DATE,
    completed_at    DATETIME2,
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

-- Státusz változás napló
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tracking_history')
  CREATE TABLE tracking_history (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    item_id     INT NOT NULL REFERENCES tracking_items(id) ON DELETE CASCADE,
    old_status  NVARCHAR(50),
    new_status  NVARCHAR(50) NOT NULL,
    changed_by  NVARCHAR(100),
    note        NVARCHAR(500),
    created_at  DATETIME2 DEFAULT SYSDATETIME()
  );
GO
```

### F8.2.3 — Dashboard

- **Kanban nézet:** Oszlopok = státuszok (admin setting-ből), kártyák = feladatok, drag & drop (opcionális, lehet sima lista is)
- **Lista nézet:** Táblázat szűrőkkel (státusz, felelős, prioritás, dátum range)
- **Részletek panel:** Kattintásra: timeline (tracking_history), szerkesztés
- **Statisztika kártyák:** Nyitott / Folyamatban / Kész / Késedelmes darabszám

---

## F8.3 — FLEET modul (Gépkocsi futás)

### F8.3.1 — manifest.ts

```typescript
{
  id: 'fleet',
  name: 'Gépjármű nyilvántartás',
  description: 'Gépkocsi futás, kilométerek, tankolás nyomon követése',
  icon: 'Car',
  href: '/dashboard/modules/fleet',
  color: 'bg-amber-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: ['fleet.view', 'fleet.edit', 'fleet.export'],
  adminSettings: [
    { key: 'fleet_distance_unit', label: 'Távolság mértékegysége', type: 'unit_select', default: 'km' },
    { key: 'fleet_fuel_unit', label: 'Üzemanyag mértékegysége', type: 'unit_select', default: 'liters' },
    { key: 'fleet_currency', label: 'Pénznem', type: 'unit_select', default: 'huf' },
  ],
  migrations: ['001_fleet.sql'],
}
```

### F8.3.2 — Migráció: `modules/fleet/migrations/001_fleet.sql`

```sql
-- Járművek
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_vehicles')
  CREATE TABLE fleet_vehicles (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    plate_number    NVARCHAR(20) NOT NULL,
    vehicle_name    NVARCHAR(100),
    vehicle_type    NVARCHAR(50),       -- 'car', 'van', 'truck', 'forklift', 'other'
    is_active       BIT NOT NULL DEFAULT 1,
    notes           NVARCHAR(500),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

-- Futás bejegyzések
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_trips')
  CREATE TABLE fleet_trips (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES fleet_vehicles(id),
    trip_date       DATE NOT NULL,
    driver_name     NVARCHAR(100),
    start_km        DECIMAL(10,1),
    end_km          DECIMAL(10,1),
    distance        DECIMAL(10,1),         -- end_km - start_km (vagy manuális)
    purpose         NVARCHAR(500),         -- Úticél / ok
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

-- Tankolások
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_refuels')
  CREATE TABLE fleet_refuels (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES fleet_vehicles(id),
    refuel_date     DATE NOT NULL,
    amount          DECIMAL(10,2),         -- Üzemanyag mennyiség (unit-ból)
    cost            DECIMAL(10,2),         -- Költség (currency unit-ból)
    km_at_refuel    DECIMAL(10,1),
    fuel_type       NVARCHAR(50),          -- 'diesel', 'benzin', 'electric', 'lpg'
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
```

### F8.3.3 — Dashboard

- **Jármű kártyák:** Rendszám, típus, utolsó futás, összesített km
- **Futás rögzítés:** Jármű kiválasztás → start km, end km, sofőr, cél
- **Tankolás rögzítés:** Jármű → liter, összeg, km állásnál
- **Statisztikák:** Havi km összesítő, fogyasztás átlag (l/100km), költség diagram

---

## F8.4 — FILE-IMPORT modul (Generikus import)

### F8.4.1 — manifest.ts

```typescript
{
  id: 'file-import',
  name: 'Fájl Import',
  description: 'Generikus CSV és Excel fájlok importálása admin konfigurációval',
  icon: 'FileUp',
  href: '/dashboard/modules/file-import',
  color: 'bg-cyan-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: ['file-import.view', 'file-import.execute'],
  adminSettings: [],
  migrations: [],  // Nincs saját tábla — a core_import_configs + core_import_log-ot használja (F6)
}
```

### F8.4.2 — Dashboard

Ez lényegében az F6 import UI használata:
- Dropzone
- Config felismerés / kiválasztás
- Import futtatás + eredmény
- Import napló (utolsó 20 import)

A modul dashboard egy szép wrapper az F6-os import pipeline köré.

---

## F8.5 — REPORTS modul (Alap riport generátor)

### F8.5.1 — manifest.ts

```typescript
{
  id: 'reports',
  name: 'Riportok',
  description: 'Alap riport generátor — diagramok, táblák, Excel export',
  icon: 'PieChart',
  href: '/dashboard/modules/reports',
  color: 'bg-violet-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: [],
  permissions: ['reports.view', 'reports.edit', 'reports.export'],
  adminSettings: [
    { key: 'reports_default_period', label: 'Alapértelmezett időszak', type: 'select', default: '30', options: [
      { value: '7', label: 'Utolsó 7 nap' },
      { value: '30', label: 'Utolsó 30 nap' },
      { value: '90', label: 'Utolsó 90 nap' },
    ]},
  ],
  migrations: ['001_reports.sql'],
}
```

### F8.5.2 — Migráció

```sql
-- Mentett riport definíciók
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'reports_saved')
  CREATE TABLE reports_saved (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    report_name     NVARCHAR(200) NOT NULL,
    description     NVARCHAR(500),
    source_module   NVARCHAR(50),          -- Melyik modul adataiból
    source_table    NVARCHAR(100),         -- Melyik tábla
    chart_type      NVARCHAR(50),          -- 'bar', 'line', 'pie', 'table'
    config          NVARCHAR(MAX),         -- JSON: oszlopok, szűrők, csoportosítás
    created_by      NVARCHAR(100),
    is_public       BIT DEFAULT 1,         -- Mindenki láthatja-e
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
```

### F8.5.3 — Dashboard

- **Mentett riportok listája:** Kártya formátum, kattintásra megnyitás
- **Riport szerkesztő:** Tábla kiválasztás → oszlopok → szűrők → csoportosítás → diagram típus → előnézet
- **Riport megjelenítő:** Diagram (Recharts) + táblázat + Export gomb (Excel)

**Megjegyzés:** Ez a modul később bővülhet (scheduled riportok, PDF export, email küldés). Most az alap riport generátor elég.

---

## F8.6 — `_loader.ts` frissítés

**Fájl:** `modules/_loader.ts`

Minden elkészült Basic modul importját engedélyezd:

```typescript
import '@/modules/workforce/manifest';
import '@/modules/tracking/manifest';
import '@/modules/fleet/manifest';
import '@/modules/file-import/manifest';
import '@/modules/reports/manifest';
```

---

## F8.7 — Teszt (modulonként)

Minden modul tesztelése:

1. `npx tsx scripts/migrate-all.ts` — modul migrációk lefutnak
2. `npm run type-check` — 0 hiba
3. Admin → Modulok: az új modul megjelenik, toggle-ölhető
4. Dashboard: a modul tile megjelenik, kattintásra betölt
5. CRUD műveletek: létrehozás, listázás, módosítás, törlés
6. Export: Excel letöltés működik
7. Permission: `workforce.view` nélküli user nem látja a modult
