# F5 — MODUL RENDSZER VÉGLEGESÍTÉS

> **Cél:** A modul manifest-ek automatikusan betöltődjenek, a dashboard és API route-ok dinamikusak legyenek. Új modul hozzáadása = 1 mappa + manifest.ts + import a loader-ben.
> **Előfeltétel:** F0-F4 kész
> **Időbecslés:** 1 hét

---

## F5.1 — ModuleManifest típus definíció

**Fájl:** `lib/modules/types.ts` (ÚJ fájl)

```typescript
export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;                     // Lucide ikon neve (pl. 'Users', 'BarChart2')
  href: string;                     // Dashboard route (pl. '/dashboard/modules/workforce')
  color: string;                    // Tailwind bg color class (pl. 'bg-indigo-600')
  version: string;
  tier: 'basic' | 'professional' | 'enterprise';
  dependsOn: string[];              // Függőségek (modul ID-k)
  permissions: string[];            // Modul-specifikus permission kódok
  adminSettings: AdminSettingDef[]; // Admin panelből konfigurálható beállítások
  migrations: string[];             // SQL fájl nevek a modul migrations/ mappájából
  adminOnly?: boolean;
}

export interface AdminSettingDef {
  key: string;                      // pl. 'workforce_default_shift_count'
  label: string;                    // pl. 'Alapértelmezett műszakszám'
  type: 'string' | 'number' | 'boolean' | 'select' | 'unit_select' | 'color';
  default: string;
  options?: { value: string; label: string }[];  // type='select' esetén
  description?: string;
}

export interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  order: number;
}
```

---

## F5.2 — Modul loader: `modules/_loader.ts`

**Fájl:** `modules/_loader.ts` (ÚJ fájl)

**Tartalom:**

```typescript
/**
 * Modul loader — importálja az összes modul manifest.ts fájlját.
 * Minden manifest a registerModule()-t hívja, ami a registry-be teszi a modult.
 *
 * ÚJ MODUL HOZZÁADÁSAKOR: adj hozzá egy import sort ide.
 */

// LAC (referencia implementáció)
import '@/modules/lac-napi-perces/manifest';

// === BASIC csomag ===
// import '@/modules/workforce/manifest';
// import '@/modules/tracking/manifest';
// import '@/modules/fleet/manifest';
// import '@/modules/file-import/manifest';
// import '@/modules/reports/manifest';

// === PROFESSIONAL csomag ===
// import '@/modules/performance/manifest';
// import '@/modules/scheduling/manifest';
// import '@/modules/delivery/manifest';
// import '@/modules/inventory/manifest';
// import '@/modules/sap-import/manifest';

// === ENTERPRISE csomag ===
// import '@/modules/oee/manifest';
// import '@/modules/plc-connector/manifest';
// import '@/modules/shift-management/manifest';
// import '@/modules/quality/manifest';
// import '@/modules/maintenance/manifest';
// import '@/modules/api-gateway/manifest';
// import '@/modules/multi-site/manifest';
```

**Megjegyzés:** A ki-kommentezett importok akkor lesznek aktiválva, amikor az adott modul elkészül.

---

## F5.3 — Registry frissítés: loader importálása

**Fájl:** `lib/modules/registry.ts`

**Mit csinálj:**
A fájl elején (az importok után, de a `const ALL_MODULES` előtt) adj hozzá:

```typescript
// Betölti az összes modul manifest-jét
import '@/modules/_loader';
```

**Ha F0.8-ban már megcsináltad a LAC manifest importot:** cseréld ki arra hogy a loader-t importálja (az a központi hely).

Tehát töröld ha van ilyen:
```typescript
import '@/modules/lac-napi-perces/manifest';
```
És cseréld erre:
```typescript
import '@/modules/_loader';
```

---

## F5.4 — core_module_settings tábla migráció

**Fájl:** `database/core/012_core_module_settings.sql` (ÚJ fájl)

```sql
-- Migration 012: core_module_settings tábla
-- Modul-specifikus beállítások tárolása (a manifest adminSettings-ből)

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_module_settings'
)
  CREATE TABLE core_module_settings (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    module_id     NVARCHAR(50)  NOT NULL,
    setting_key   NVARCHAR(100) NOT NULL,
    setting_value NVARCHAR(MAX),
    setting_type  NVARCHAR(20)  DEFAULT 'string',
    updated_by    NVARCHAR(100),
    updated_at    DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_module_settings' AND object_id = OBJECT_ID('dbo.core_module_settings'))
  ALTER TABLE core_module_settings ADD CONSTRAINT UQ_module_settings UNIQUE (module_id, setting_key);
GO
```

---

## F5.5 — Modul settings service: `lib/modules/settings.ts`

**Fájl:** `lib/modules/settings.ts` (ÚJ fájl)

**Funkcionalitás:**
- `getModuleSetting(moduleId: string, key: string): Promise<string | null>` — egy beállítás lekérése
- `setModuleSetting(moduleId: string, key: string, value: string, updatedBy?: string): Promise<void>` — beállítás mentése (MERGE/upsert)
- `getAllModuleSettings(moduleId: string): Promise<Record<string, string>>` — egy modul összes beállítása

**DB query példa:**
```sql
SELECT setting_key, setting_value FROM core_module_settings WHERE module_id = @moduleId
```

---

## F5.6 — Modul permission auto-regisztráció

**Fájl:** `lib/modules/registry.ts`

**Mit csinálj:**
A `registerModule()` függvényben, a modul regisztrációja után, a modul `permissions` tömbjéből automatikusan hozd létre a hiányzó permission-öket a `core_permissions` táblában.

**Fontos:** Ez NEM blokkoló — ha a DB nem elérhető (pl. első indítás előtt), ne dobjon hibát. Best-effort, non-blocking:

```typescript
export function registerModule(mod: ModuleDefinition): void {
  const existing = ALL_MODULES.find(m => m.id === mod.id);
  if (!existing) {
    ALL_MODULES.push(mod);
  }

  // Auto-regisztráció: modul permission-ök (best-effort, non-blocking)
  if (mod.permissions && mod.permissions.length > 0) {
    ensurePermissionsExist(mod.id, mod.permissions).catch(() => {});
  }
}

async function ensurePermissionsExist(moduleId: string, permissions: string[]): Promise<void> {
  const db = getDb();
  for (const perm of permissions) {
    await db.execute(
      `IF NOT EXISTS (SELECT 1 FROM core_permissions WHERE permission_code = @code)
       INSERT INTO core_permissions (permission_code, description, module_id, is_builtin)
       VALUES (@code, @desc, @moduleId, 0)`,
      [
        { name: 'code', type: 'nvarchar', value: perm, maxLength: 100 },
        { name: 'desc', type: 'nvarchar', value: `${moduleId} modul jogosultság`, maxLength: 500 },
        { name: 'moduleId', type: 'nvarchar', value: moduleId, maxLength: 50 },
      ]
    );
  }
}
```

**Hatás:** Amikor egy új modult aktiválsz, a permission-jei automatikusan megjelennek a Roles admin oldalon.

---

## F5.7 — Dinamikus modul dashboard page

**Fájl:** `app/dashboard/modules/[moduleId]/page.tsx` (ÚJ fájl)

**Mit csinálj:**
Készíts egy dinamikus Next.js oldalt ami a modul ID alapján tölti be a modul dashboard komponensét.

```typescript
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getActiveModules } from '@/lib/modules/registry';

interface Props {
  params: Promise<{ moduleId: string }>;
}

export default async function ModuleDashboardPage({ params }: Props) {
  const { moduleId } = await params;

  // Session check
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  if (!sessionId) notFound();

  const session = await getAuth().validateSession(sessionId);
  if (!session) notFound();

  // Ellenőrzés: modul aktív-e
  const activeModules = await getActiveModules(session.role);
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod) notFound();

  // Dinamikus komponens betöltés
  // A modul dashboard komponensét a modules/<moduleId>/components/DashboardPage.tsx-ből tölti
  try {
    const ModuleComponent = (await import(`@/modules/${moduleId}/components/DashboardPage`)).default;
    return <ModuleComponent />;
  } catch {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-400">A(z) &quot;{mod.name}&quot; modul dashboard oldala nem elérhető.</p>
      </div>
    );
  }
}
```

**Fájl:** `app/dashboard/modules/[moduleId]/loading.tsx` (ÚJ fájl)
```typescript
export default function ModuleLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-4" />
      <div className="h-64 bg-gray-800 rounded" />
    </div>
  );
}
```

---

## F5.8 — Dinamikus modul API route

**Fájl:** `app/api/modules/[moduleId]/[...path]/route.ts` (ÚJ fájl)

**Mit csinálj:**
Egy catch-all route ami a modul API-ját proxy-zza:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { isModuleAllowed } from '@/lib/license';
import { getActiveModuleIds } from '@/lib/modules/registry';

interface Props {
  params: Promise<{ moduleId: string; path: string[] }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'GET');
}

export async function POST(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'POST');
}

export async function PUT(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'DELETE');
}

async function handleModuleRequest(
  request: NextRequest,
  params: { moduleId: string; path: string[] },
  method: string
): Promise<NextResponse> {
  const { moduleId, path } = params;

  // Session check
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  // Licenc check
  const allowed = await isModuleAllowed(moduleId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Ez a modul nem elérhető a jelenlegi licenccsomagban.' },
      { status: 403 }
    );
  }

  // Aktív modul check
  const activeIds = await getActiveModuleIds();
  if (!activeIds.includes(moduleId)) {
    return NextResponse.json(
      { error: 'Ez a modul nincs aktiválva.' },
      { status: 404 }
    );
  }

  // Dinamikus handler betöltés
  const subPath = path.join('/');
  try {
    const handler = await import(`@/modules/${moduleId}/api/${subPath}/route`);
    const fn = handler[method];
    if (typeof fn === 'function') {
      return fn(request);
    }
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
}
```

**Hatás:** `/api/modules/workforce/summary` → betölti a `modules/workforce/api/summary/route.ts` GET handler-jét.

---

## F5.9 — Modul-specifikus admin settings renderer

**Fájl:** `app/dashboard/admin/modules/[moduleId]/page.tsx` (ÚJ fájl)

**Mit csinálj:**
Ez az oldal a modul manifest `adminSettings` tömbjéből generál egy beállítás formot.

1. Lekéri a modul manifest-jét (ID alapján)
2. Lekéri a modul aktuális settings-eit (`GET /api/admin/module-settings?moduleId=...`)
3. Generál egy formot az `adminSettings` definíciók alapján:
   - `type: 'string'` → text input
   - `type: 'number'` → number input
   - `type: 'boolean'` → toggle switch
   - `type: 'select'` → dropdown (options-ből)
   - `type: 'unit_select'` → dropdown a core_units táblából
   - `type: 'color'` → color picker
4. Mentés gomb → `PUT /api/admin/module-settings`

**API endpoint:** `app/api/admin/module-settings/route.ts` (ÚJ fájl)
- GET: `getModuleSetting()` hívás, modul összes beállítása
- PUT: `setModuleSetting()` hívás

---

## F5.10 — Modul migráció runner

**Fájl:** `scripts/migrate-all.ts`

**Mit csinálj:**
Bővítsd a `main()` függvényt, hogy a modul migrációkat is futtassa:

A jelenlegi kód:
```typescript
const folders = ['core'];
```

Cseréld erre:
```typescript
import fs from 'fs';
import path from 'path';

const folders = ['core'];

// Modul migrációk: minden modules/<id>/migrations/ mappa
const modulesDir = path.join(process.cwd(), 'modules');
if (fs.existsSync(modulesDir)) {
  const moduleIds = fs.readdirSync(modulesDir)
    .filter(f => f !== '_loader.ts' && fs.statSync(path.join(modulesDir, f)).isDirectory());
  for (const moduleId of moduleIds) {
    const migrationsDir = path.join(modulesDir, moduleId, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      // A runFile() függvényt használd, de a dir-t a modulDir-re cseréld
      // Hasonlóan a core migrációkhoz, de a mappa: modules/<id>/migrations/
      folders.push(`../../modules/${moduleId}/migrations`);
      // VAGY egyszerűbben: adj hozzá egy külön loop-ot a modulokra
    }
  }
}
```

**Egyszerűbb megoldás:** Készíts egy új ciklust a main()-ben:

```typescript
// Modul migrációk
const modulesDir = path.join(process.cwd(), 'modules');
if (fs.existsSync(modulesDir)) {
  const moduleDirs = fs.readdirSync(modulesDir)
    .filter(f => !f.startsWith('_') && fs.statSync(path.join(modulesDir, f)).isDirectory());

  for (const moduleId of moduleDirs) {
    const migDir = path.join(modulesDir, moduleId, 'migrations');
    if (!fs.existsSync(migDir)) continue;

    const files = fs.readdirSync(migDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(f => path.join(migDir, f));

    if (files.length > 0) {
      console.log(`[migrate] module/${moduleId}: ${files.length} migráció`);
      for (const f of files) {
        await runFile(pool, f);
      }
    }
  }
}
```

---

## F5.11 — Admin panel admin menü dinamikussá tétele

**Fájl:** `app/dashboard/admin/page.tsx`

**Mit csinálj:**
A hardcode-olt `ADMIN_MENU` tömb helyett egy dinamikus megközelítés:

1. Core admin menüpontok (hardcode maradhatnak, de bővítve az összes új oldallal)
2. Modul admin menüpontok: a `getAllModules()` + `getActiveModuleIds()` alapján, ha a modulnak van `adminSettings`

A modulok admin menüpontjai automatikusan megjelennek ha a modul aktív és van adminSettings-je.

---

## F5.12 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 012 + modul migrációk lefutnak
2. `npm run type-check` — 0 hiba
3. `npm run build` — sikeres
4. `/dashboard/modules/lac-napi-perces` — a LAC modul dashboard-ja betölt (ha aktív)
5. Nem aktív modul URL → 404
6. Nem licencelt modul API hívás → 403
7. Admin → Modulok → modul-specifikus admin settings oldal betölt
