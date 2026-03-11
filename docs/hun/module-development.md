# Modul fejlesztői útmutató

Ez az útmutató lépésről-lépésre bemutatja, hogyan készíts új modult az Ainova Cloud Intelligence rendszerhez.

## 1. Mappa struktúra létrehozása

```bash
mkdir -p modules/<modul-id>/{migrations,api,components,types}
```

Példa: `modules/my-module/`

## 2. manifest.ts írása

Hozd létre a `modules/<modul-id>/manifest.ts` fájlt:

```typescript
import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'my-module',
  name: 'Modul neve',
  description: 'Rövid leírás a modul funkcióiról',
  icon: 'Box',                              // Lucide ikon neve
  href: '/dashboard/modules/my-module',
  color: 'bg-blue-600',                     // Tailwind szín
  version: '1.0.0',
  tier: 'basic' as const,                   // 'basic' | 'professional' | 'enterprise'
  dependsOn: [],                            // Függőségek (más modul ID-k)
  permissions: [
    'my-module.view',
    'my-module.edit',
    'my-module.export',
  ],
  adminSettings: [
    { 
      key: 'my_module_setting', 
      label: 'Beállítás neve', 
      type: 'string',                       // 'string' | 'number' | 'boolean' | 'select' | 'unit_select'
      default: 'alapérték' 
    },
  ],
  migrations: ['001_my_module.sql'],
};

registerModule(manifest);
```

### Tier értékek
- `basic` — Basic csomagban elérhető
- `professional` — Professional csomagtól elérhető
- `enterprise` — Csak Enterprise csomagban

### Admin setting típusok
- `string` — Szöveges input
- `number` — Szám input
- `boolean` — Checkbox
- `select` — Legördülő (options tömbbel)
- `unit_select` — Mértékegység választó (Unit System-ből)

## 3. Migráció SQL

Hozd létre: `modules/<modul-id>/migrations/001_my_module.sql`

```sql
-- My Module tábla

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'my_module_items')
  CREATE TABLE my_module_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    value           DECIMAL(10,2),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_my_module_name' AND object_id = OBJECT_ID('my_module_items'))
  CREATE INDEX idx_my_module_name ON my_module_items(name);
GO
```

**Fontos szabályok:**
- Minden migráció **idempotens** (IF NOT EXISTS)
- Tábla neve: `<modul_id>_<táblanév>` (pl. `my_module_items`)
- NE használj `core_` prefixet — az a core tábláknak van fenntartva

## 4. TypeScript típusok

Hozd létre: `modules/<modul-id>/types/index.ts`

```typescript
export interface MyModuleItem {
  id: number;
  name: string;
  value: number | null;
  createdBy: string | null;
  createdAt: string;
}

export interface MyModuleItemInput {
  name: string;
  value?: number;
}
```

## 5. API route-ok

### Fő route: `modules/<modul-id>/api/route.ts`

```typescript
import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — Lista lekérés
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'my-module.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<{ id: number; name: string; value: number | null }>(
      'SELECT id, name, value FROM my_module_items ORDER BY name'
    );
    return Response.json({ items: rows });
  } catch (err) {
    console.error('[MyModule API] GET error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.number().optional(),
});

// POST — Létrehozás
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'my-module.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { name, value } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO my_module_items (name, value, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2)`,
      [
        { name: 'p0', type: 'nvarchar', value: name },
        { name: 'p1', type: 'nvarchar', value: value !== undefined ? String(value) : null },
        { name: 'p2', type: 'nvarchar', value: auth.username },
      ]
    );
    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[MyModule API] POST error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}
```

### Egyedi elem route: `modules/<modul-id>/api/[id]/route.ts`

GET, PUT, DELETE az egyedi elemekhez.

## 6. Dashboard komponens

Hozd létre: `modules/<modul-id>/components/DashboardPage.tsx`

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Box, Plus } from 'lucide-react';

interface Item {
  id: number;
  name: string;
  value: number | null;
}

export default function MyModuleDashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/my-module/data');
      if (res.ok) {
        const json = await res.json() as { items: Item[] };
        setItems(json.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardSectionHeader title="Modul neve" subtitle="Leírás" />
        <div className="animate-pulse mt-6 h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Modul neve" subtitle="Leírás" />
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Új elem
        </button>
      </div>

      {/* Tartalom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-white font-medium">{item.name}</p>
            <p className="text-gray-500">{item.value ?? '-'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 7. _loader.ts frissítés

Nyisd meg: `modules/_loader.ts`

Add hozzá az importot:

```typescript
import '@/modules/my-module/manifest';
```

## 8. Tesztelés

```bash
# Migrációk futtatása
npx tsx scripts/migrate-all.ts

# Type check
npm run type-check

# Build
npm run build

# Fejlesztői szerver
npm run dev
```

### Ellenőrizd:
1. Admin → Modulok: az új modul megjelenik
2. Modul bekapcsolása → Dashboard tile megjelenik
3. Modul dashboard betölt
4. CRUD műveletek működnek
5. Permission nélküli user nem látja a modult

## API route elérési út

A modul API route-jai a dinamikus `/api/modules/[moduleId]/[...path]` route-on keresztül érhetők el:

- `GET /api/modules/my-module/data` → `modules/my-module/api/route.ts` GET
- `POST /api/modules/my-module/data` → `modules/my-module/api/route.ts` POST
- `GET /api/modules/my-module/data/123` → `modules/my-module/api/[id]/route.ts` GET

## Gyakori hibák

1. **Permission hiba** — Ellenőrizd, hogy a manifest permissions tömbje tartalmazza a használt permission-t
2. **Migráció nem fut** — Ellenőrizd, hogy a manifest migrations tömbje tartalmazza a fájlnevet
3. **Modul nem jelenik meg** — Ellenőrizd, hogy a `_loader.ts`-ben importálva van
4. **Tier hiba** — Ellenőrizd, hogy a licenc tartalmazza a megfelelő tier-t

## Segítség

- Nézd meg a meglévő modulokat példaként: `modules/workforce/`, `modules/tracking/`
- Core típusok: `lib/modules/types.ts`
- Registry: `lib/modules/registry.ts`
