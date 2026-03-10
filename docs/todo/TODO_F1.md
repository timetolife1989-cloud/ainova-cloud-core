# F1 — LICENC & TIER RENDSZER

> **Cél:** A vevő CSAK azt lássa és használhassa, amit megvásárolt. Plusz modul vagy feature = feláras. A szoftverfejlesztő (te) továbbra is szükséges egyedi fejlesztésekhez.
> **Előfeltétel:** F0 kész
> **Időbecslés:** 1 hét

---

## F1.1 — core_license tábla migráció

**Fájl:** `database/core/006_core_license.sql` (ÚJ fájl)

**Tartalom:**

```sql
-- Migration 006: core_license tábla
-- A telepítés licencinformációit tárolja: tier, engedélyezett modulok, lejárat.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_license'
)
  CREATE TABLE core_license (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    license_key     NVARCHAR(255) NOT NULL,
    tier            NVARCHAR(50)  NOT NULL DEFAULT 'basic',   -- 'basic', 'professional', 'enterprise', 'dev'
    customer_name   NVARCHAR(200),
    customer_email  NVARCHAR(255),
    modules_allowed NVARCHAR(MAX),                            -- JSON array: ["workforce","tracking","fleet"]
    features_allowed NVARCHAR(MAX),                           -- JSON array: ["multi_site","api_gateway"]
    max_users       INT           DEFAULT 10,                 -- Max felhasználó szám
    issued_at       DATETIME2     DEFAULT SYSDATETIME(),
    expires_at      DATETIME2,                                -- NULL = nem jár le (lifetime)
    is_active       BIT           NOT NULL DEFAULT 1,
    created_at      DATETIME2     DEFAULT SYSDATETIME()
  );
GO

-- Dev license (fejlesztéshez — mindent engedélyez, nem jár le)
IF NOT EXISTS (SELECT 1 FROM core_license WHERE tier = 'dev')
  INSERT INTO core_license (license_key, tier, customer_name, modules_allowed, features_allowed, max_users, expires_at)
  VALUES (
    'DEV-0000-0000-0000',
    'dev',
    'Development',
    '["*"]',
    '["*"]',
    999,
    NULL
  );
GO

SELECT COUNT(*) AS core_license_count FROM core_license;
GO
```

**Mezők magyarázata:**
- `tier`: milyen csomagot vásárolt ('basic', 'professional', 'enterprise', 'dev')
- `modules_allowed`: JSON tömb — melyik modul ID-kat használhatja. `["*"]` = mindent.
- `features_allowed`: JSON tömb — extra feature flag-ek (pl. "multi_site", "api_gateway").
- `max_users`: hány felhasználót hozhat létre maximum.
- `expires_at`: NULL = lifetime licenc, egyébként lejárat dátuma.
- A `dev` licenc fejlesztéshez van — mindent engedélyez, nem jár le soha.

---

## F1.2 — Tier definíciók

**Fájl:** `lib/license/tiers.ts` (ÚJ fájl)

**Tartalom:**

```typescript
/**
 * Tier → modul hozzárendelés.
 * Ez definiálja, hogy melyik csomag milyen modulokat tartalmaz ALAPBÓL.
 * A core_license tábla modules_allowed mezője felülírhatja (pl. egyedi csomag).
 */
export const TIER_MODULES: Record<string, string[]> = {
  basic: [
    'workforce',       // Létszám & Jelenlét
    'tracking',        // Feladat/rendelés felkövetés
    'fleet',           // Gépkocsi futás
    'file-import',     // Generikus CSV/Excel import
    'reports',         // Alap riport generátor
  ],
  professional: [
    // Minden ami basic-ben van:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    // Plusz:
    'performance',     // Egyéni és csapat KPI
    'scheduling',      // Kapacitás tervezés
    'delivery',        // Kiszállítás riport
    'inventory',       // Készletnyilvántartás
    'sap-import',      // SAP Excel import
  ],
  enterprise: [
    // Minden ami professional-ben van:
    'workforce', 'tracking', 'fleet', 'file-import', 'reports',
    'performance', 'scheduling', 'delivery', 'inventory', 'sap-import',
    // Plusz:
    'oee',             // Overall Equipment Effectiveness
    'plc-connector',   // PLC adatfeldolgozás
    'shift-management',// Műszakbeosztás
    'quality',         // Minőségellenőrzés
    'maintenance',     // Karbantartás
    'api-gateway',     // REST/webhook integráció
    'multi-site',      // Több telephely
  ],
  dev: ['*'],  // Minden modul engedélyezve (fejlesztéshez)
};

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
  dev: 'Development',
};

export const TIER_MAX_USERS: Record<string, number> = {
  basic: 10,
  professional: 50,
  enterprise: 0,     // 0 = korlátlan
  dev: 999,
};

export const TIER_COLORS: Record<string, string> = {
  basic: 'bg-green-600',
  professional: 'bg-blue-600',
  enterprise: 'bg-purple-600',
  dev: 'bg-gray-600',
};
```

---

## F1.3 — Licenc service

**Fájl:** `lib/license/index.ts` (ÚJ fájl)

**Tartalom:**

```typescript
import { getDb } from '@/lib/db';

export type LicenseTier = 'basic' | 'professional' | 'enterprise' | 'dev';

export interface LicenseInfo {
  tier: LicenseTier;
  customerName: string | null;
  modulesAllowed: string[];     // modul ID-k, ['*'] = mind
  featuresAllowed: string[];    // feature flag-ek, ['*'] = mind
  maxUsers: number;
  expiresAt: Date | null;       // null = nem jár le
  isExpired: boolean;
  isActive: boolean;
}

interface LicenseRow {
  tier: string;
  customer_name: string | null;
  modules_allowed: string | null;
  features_allowed: string | null;
  max_users: number;
  expires_at: Date | null;
  is_active: boolean;
}

let _cached: LicenseInfo | null = null;
let _cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 perc

/**
 * Visszaadja az aktív licenc adatait.
 * 5 percig cache-eli.
 * Ha nincs licenc a DB-ben, 'basic' tier-t ad vissza üres modul listával.
 */
export async function getLicense(): Promise<LicenseInfo> {
  const now = Date.now();
  if (_cached && (now - _cachedAt) < CACHE_TTL) return _cached;

  try {
    const rows = await getDb().query<LicenseRow>(
      `SELECT TOP 1 tier, customer_name, modules_allowed, features_allowed,
              max_users, expires_at, is_active
       FROM core_license
       WHERE is_active = 1
       ORDER BY id DESC`
    );

    if (rows.length === 0) {
      _cached = getDefaultLicense();
      _cachedAt = now;
      return _cached;
    }

    const row = rows[0];
    const modulesAllowed = safeJsonParse(row.modules_allowed, []);
    const featuresAllowed = safeJsonParse(row.features_allowed, []);
    const isExpired = row.expires_at
      ? new Date(row.expires_at).getTime() < now
      : false;

    _cached = {
      tier: row.tier as LicenseTier,
      customerName: row.customer_name,
      modulesAllowed,
      featuresAllowed,
      maxUsers: row.max_users ?? 10,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      isExpired,
      isActive: Boolean(row.is_active) && !isExpired,
    };
    _cachedAt = now;
    return _cached;
  } catch (err) {
    console.error('[License] Failed to load license:', err);
    return getDefaultLicense();
  }
}

/** Ellenőrzi, hogy egy adott modul engedélyezett-e a licencben. */
export async function isModuleAllowed(moduleId: string): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.modulesAllowed.includes('*')) return true;
  return license.modulesAllowed.includes(moduleId);
}

/** Ellenőrzi, hogy egy adott feature engedélyezett-e. */
export async function isFeatureAllowed(featureId: string): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.featuresAllowed.includes('*')) return true;
  return license.featuresAllowed.includes(featureId);
}

/** Ellenőrzi, hogy létrehozható-e még új felhasználó. */
export async function canCreateUser(): Promise<boolean> {
  const license = await getLicense();
  if (!license.isActive) return false;
  if (license.maxUsers <= 0) return true; // 0 = korlátlan
  try {
    const rows = await getDb().query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM core_users WHERE is_active = 1'
    );
    return (rows[0]?.total ?? 0) < license.maxUsers;
  } catch {
    return true;
  }
}

/** Cache ürítése (licenc kulcs változtatás után hívandó) */
export function clearLicenseCache(): void {
  _cached = null;
  _cachedAt = 0;
}

function getDefaultLicense(): LicenseInfo {
  return {
    tier: 'basic',
    customerName: null,
    modulesAllowed: [],
    featuresAllowed: [],
    maxUsers: 5,
    expiresAt: null,
    isExpired: false,
    isActive: true,
  };
}

function safeJsonParse(value: string | null, fallback: string[]): string[] {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
```

---

## F1.4 — Licenc szűrés beépítése a modul registry-be

**Fájl:** `lib/modules/registry.ts`

**Mit csinálj:**
Az `getActiveModules()` függvénybe (jelenlegi 114-130. sor) add hozzá a licenc ellenőrzést.

**Jelenlegi kód:**
```typescript
export async function getActiveModules(role: string): Promise<ModuleDefinition[]> {
  let activeIds: string[] = [];
  try {
    const raw = await getSetting('active_modules');
    activeIds = JSON.parse(raw ?? '[]');
  } catch {
    activeIds = [];
  }
  const active = ALL_MODULES.filter(m => activeIds.includes(m.id));
  if (role === 'admin') {
    active.push(ADMIN_MODULE);
  }
  return active;
}
```

**Cseréld erre:**
```typescript
import { isModuleAllowed } from '@/lib/license';

export async function getActiveModules(role: string): Promise<ModuleDefinition[]> {
  let activeIds: string[] = [];
  try {
    const raw = await getSetting('active_modules');
    activeIds = JSON.parse(raw ?? '[]');
  } catch {
    activeIds = [];
  }

  // Szűrés: csak licencben engedélyezett ÉS admin által aktivált modulok
  const licenseChecks = await Promise.all(
    ALL_MODULES
      .filter(m => activeIds.includes(m.id))
      .map(async m => ({ mod: m, allowed: await isModuleAllowed(m.id) }))
  );
  const active = licenseChecks.filter(c => c.allowed).map(c => c.mod);

  if (role === 'admin') {
    active.push(ADMIN_MODULE);
  }
  return active;
}
```

**Hatás:** Ha a vevő Basic csomagot vett és az admin bekapcsolja az "OEE" modult → a modul NEM jelenik meg a dashboard-on, mert a licenc nem engedi.

---

## F1.5 — Licenc ellenőrzés a modul toggle API-ban

**Fájl:** `app/api/admin/modules/route.ts`

**Mit csinálj:**
A PUT handler-ben, a `const { moduleId, enable } = parsed.data;` sor után, a dependency validation előtt, add hozzá:

```typescript
import { isModuleAllowed } from '@/lib/license';

// ...a parsed.data kiolvasása után, enable=true esetén:
if (enable) {
  const allowed = await isModuleAllowed(moduleId);
  if (!allowed) {
    return Response.json(
      { error: 'Ez a modul nem elérhető a jelenlegi licenccsomagban. Vegye fel a kapcsolatot a szoftver szállítóval.' },
      { status: 403 }
    );
  }
}
```

**Hatás:** Ha a vevő a toggle-t próbálja bekapcsolni egy nem engedélyezett modulra → hibaüzenet.

---

## F1.6 — Licenc ellenőrzés a felhasználó létrehozásnál

**Fájl:** `app/api/admin/users/route.ts`

**Mit csinálj:**
A POST handler-ben, a csrf check után és a CreateUserSchema.safeParse ELŐTT add hozzá:

```typescript
import { canCreateUser } from '@/lib/license';

// ...a csrf check után:
const userLimitOk = await canCreateUser();
if (!userLimitOk) {
  return Response.json(
    { error: 'Elérte a maximális felhasználó számot a jelenlegi licenccsomagban.' },
    { status: 403 }
  );
}
```

---

## F1.7 — Licenc info API endpoint

**Fájl:** `app/api/admin/license/route.ts` (ÚJ fájl)

**Tartalom:**

```typescript
import { type NextRequest } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { getLicense } from '@/lib/license';

export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const license = await getLicense();
  return Response.json({
    tier: license.tier,
    customerName: license.customerName,
    modulesAllowed: license.modulesAllowed,
    featuresAllowed: license.featuresAllowed,
    maxUsers: license.maxUsers,
    expiresAt: license.expiresAt,
    isExpired: license.isExpired,
    isActive: license.isActive,
  });
}
```

---

## F1.8 — Licenc admin oldal

**Fájl:** `app/dashboard/admin/license/page.tsx` (ÚJ fájl)

**Mit csinálj:**
Készíts egy 'use client' admin oldalt ami:
1. Lekéri a `GET /api/admin/license` endpointot
2. Megjeleníti kártya formátumban:
   - **Csomag szint**: Tier neve + szín badge (Basic=zöld, Pro=kék, Enterprise=lila)
   - **Ügyfél neve**: customerName
   - **Engedélyezett modulok**: lista, chip-ek formájában
   - **Max felhasználó**: maxUsers (vagy "Korlátlan")
   - **Lejárat**: expiresAt formázva, vagy "Lifetime"
   - **Státusz**: Aktív / Lejárt / Inaktív — szín kódolva

**Stílus:** Sötét téma (bg-gray-900, border-gray-800), a meglévő admin oldalak stílusával konzisztens. Tailwind + Lucide ikonok.

---

## F1.9 — Licenc menüpont az admin panelen

**Fájl:** `app/dashboard/admin/page.tsx`

**Mit csinálj:**
Az `ADMIN_MENU` tömbbe adj hozzá egy új elemet:

```typescript
{
  title: 'Licenc',
  description: 'Csomag szint, engedélyezett modulok, lejárat',
  icon: 'Key',
  href: '/dashboard/admin/license',
},
```

---

## F1.10 — Modul toggle oldalon: tier badge és lock

**Fájl:** A modul toggle admin oldal komponense (nézd meg a `app/dashboard/admin/modules/` vagy `components/admin/modules/` alatt hol van)

**Mit csinálj:**
A modul listában minden modulnál jelenjen meg:
- Tier badge: 🟢 BASIC / 🔵 PRO / 🟣 ENTERPRISE
- Ha a modul NEM engedélyezett a vevő csomagjában: 🔒 zárt ikon + "Licenc szükséges" szöveg, a toggle legyen disabled

Ehhez a `GET /api/admin/modules` endpoint-nak is vissza kell adnia a licenc infót. Módosítsd a GET handler-t:

```typescript
import { getLicense } from '@/lib/license';

// A GET handler-ben, az allModules és activeIds lekérése után:
const license = await getLicense();

return Response.json({
  modules: allModules,
  activeIds,
  license: {
    tier: license.tier,
    modulesAllowed: license.modulesAllowed,
  },
});
```

A frontend komponens a `license.modulesAllowed` alapján dönti el, melyik toggle aktív és melyik disabled.

---

## F1.11 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 006_core_license hiba nélkül lefut
2. DB-ben: `SELECT * FROM core_license` → 1 sor (dev licenc, `modules_allowed = '["*"]'`)
3. `npm run type-check` — 0 hiba
4. `npm run build` — sikeres
5. Admin → Licenc oldal: dev licenc adatok megjelennek
6. Admin → Modulok: minden modul toggle-ölhető (dev licenc mindent enged)
7. **Extra teszt:** Változtasd a DB-ben a licencet `modules_allowed = '["workforce"]'`-re → csak a workforce modul toggle-ölhető, a többi locked
