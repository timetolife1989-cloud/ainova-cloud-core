# F3 — UNIT SYSTEM (Univerzális mértékegységek)

> **Cél:** A vevő maga definiálja a mértékegységeit. NEM percben, NEM darabban van kötve. Admin panelen hozzáadhat egyedi egységeket.
> **Előfeltétel:** F0, F1, F2 kész
> **Időbecslés:** 1 hét

---

## F3.1 — core_units tábla migráció

**Fájl:** `database/core/009_core_units.sql` (ÚJ fájl)

```sql
-- Migration 009: core_units tábla — Univerzális mértékegység rendszer

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_units'
)
  CREATE TABLE core_units (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    unit_code   NVARCHAR(50)  NOT NULL,       -- 'minutes', 'pieces', 'kg', 'eur'
    unit_label  NVARCHAR(100) NOT NULL,       -- 'perc', 'darab', 'kilogramm'
    unit_type   NVARCHAR(50)  NOT NULL,       -- 'time', 'count', 'weight', 'currency', 'ratio', 'length', 'volume', 'distance', 'custom'
    symbol      NVARCHAR(20),                 -- 'min', 'db', 'kg', '€', '%'
    decimals    INT           DEFAULT 2,
    is_builtin  BIT           NOT NULL DEFAULT 0,
    is_active   BIT           NOT NULL DEFAULT 1,
    created_at  DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_units_code' AND object_id = OBJECT_ID('dbo.core_units'))
  ALTER TABLE core_units ADD CONSTRAINT UQ_core_units_code UNIQUE (unit_code);
GO

IF NOT EXISTS (SELECT 1 FROM core_units WHERE unit_code = 'minutes')
BEGIN
  INSERT INTO core_units (unit_code, unit_label, unit_type, symbol, decimals, is_builtin) VALUES
    ('minutes',  'perc',       'time',     'min',  2, 1),
    ('hours',    'óra',        'time',     'ó',    1, 1),
    ('pieces',   'darab',      'count',    'db',   0, 1),
    ('kg',       'kilogramm',  'weight',   'kg',   2, 1),
    ('tons',     'tonna',      'weight',   't',    2, 1),
    ('meters',   'méter',      'length',   'm',    2, 1),
    ('liters',   'liter',      'volume',   'l',    2, 1),
    ('eur',      'EUR',        'currency', '€',    2, 1),
    ('huf',      'HUF',        'currency', 'Ft',   0, 1),
    ('usd',      'USD',        'currency', '$',    2, 1),
    ('percent',  'százalék',   'ratio',    '%',    1, 1),
    ('km',       'kilométer',  'distance', 'km',   1, 1);
END
GO

SELECT COUNT(*) AS core_units_count FROM core_units;
GO
```

---

## F3.2 — Unit service: `lib/units/index.ts`

**Fájl:** `lib/units/index.ts` (ÚJ fájl)

**Feladatai:**
- `getAllUnits(): Promise<UnitInfo[]>` — összes aktív unit, 5 perces cache
- `getUnitByCode(code: string): Promise<UnitInfo | null>` — egy unit kód alapján
- `formatUnitValue(value: number, unitCode: string): Promise<string>` — formázott érték szimbólummal (pl. "1 234,50 min")
- `clearUnitCache(): void` — cache ürítés

**UnitInfo interface:**
```typescript
export interface UnitInfo {
  id: number;
  unitCode: string;
  unitLabel: string;
  unitType: string;    // 'time' | 'count' | 'weight' | 'currency' | 'ratio' | 'custom' | ...
  symbol: string | null;
  decimals: number;
  isBuiltin: boolean;
  isActive: boolean;
}
```

**DB query:**
```sql
SELECT id, unit_code, unit_label, unit_type, symbol, decimals, is_builtin, is_active
FROM core_units WHERE is_active = 1 ORDER BY unit_type, unit_label
```

**Cache minta:** Ugyanaz mint a license service-ben (let _cache, let _cacheAt, CACHE_TTL = 5 perc).

---

## F3.3 — Units CRUD API

**Fájl:** `app/api/admin/units/route.ts` (ÚJ fájl)

**GET /api/admin/units** — összes unit (aktív + inaktív is, admin számára)
- Permission: `checkAuth(request, 'settings.edit')`

**POST /api/admin/units** — új unit
- Body: `{ unitCode, unitLabel, unitType, symbol, decimals }`
- Zod validáció
- INSERT core_units
- `clearUnitCache()`

**PUT /api/admin/units** — unit módosítás
- Body: `{ id, unitLabel, symbol, decimals, isActive }`
- `unit_code` és `unit_type` NEM módosítható (ha kell, töröld és hozd létre újra)
- UPDATE core_units
- `clearUnitCache()`

**DELETE /api/admin/units** — unit törlés
- Body: `{ id }`
- Ellenőrzés: `is_builtin = false`
- Ellenőrzés: nincs modul/setting ami hivatkozik rá (vagy hiba)
- DELETE core_units
- `clearUnitCache()`

---

## F3.4 — Units admin oldal

**Fájl:** `app/dashboard/admin/units/page.tsx` (ÚJ fájl)

**Felépítés:**
1. **Fejléc:** "Mértékegységek" cím + "Új mértékegység" gomb
2. **Szűrő:** Típus szerinti szűrő gombok (Összes / Idő / Mennyiség / Súly / Pénznem / Egyéb)
3. **Táblázat:**
   - Oszlopok: Kód | Név | Típus | Szimbólum | Tizedes | Beépített | Műveletek
   - Minden sorban: Szerkesztés ikon + Törlés ikon (csak nem-beépítettnél)
4. **Modal:** Új/szerkesztés form
   - unit_code: text input (csak létrehozáskor szerkeszthető)
   - unit_label: text input
   - unit_type: select dropdown (time, count, weight, currency, ratio, custom)
   - symbol: text input
   - decimals: number input (0-6)

**Stílus:** Sötét téma, konzisztens a meglévő admin oldalakkal.

---

## F3.5 — Units menüpont az admin panelen

**Fájl:** `app/dashboard/admin/page.tsx`

**Mit csinálj:**
Az `ADMIN_MENU` tömbbe adj hozzá:

```typescript
{
  title: 'Mértékegységek',
  description: 'Mértékegységek kezelése (perc, darab, kg, egyedi)',
  icon: 'Ruler',
  href: '/dashboard/admin/units',
},
```

---

## F3.6 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 009 hiba nélkül lefut
2. `npm run type-check` — 0 hiba
3. Admin → Units oldal: 12 beépített mértékegység megjelenik
4. Új egyedi mértékegység hozzáadása (pl. "Normaperc", kód: "normamin", típus: custom, szimbólum: "Np", tizedesek: 2)
5. Szerkesztés és törlés működik (csak nem-beépítetteknél)
