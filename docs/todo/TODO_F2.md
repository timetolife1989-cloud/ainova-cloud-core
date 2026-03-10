# F2 — ROLE & PERMISSION RENDSZER

> **Cél:** A role-ok és jogosultságok NE legyenek hardcode-olva. Admin panelen lehessen új role-okat létrehozni és permission-öket hozzárendelni.
> **Előfeltétel:** F0 + F1 kész
> **Időbecslés:** 2 hét

---

## F2.1 — core_roles tábla migráció

**Fájl:** `database/core/007_core_roles.sql` (ÚJ fájl)

```sql
-- Migration 007: core_roles tábla
-- Dinamikus szerepkörök — admin panelből konfigurálható

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_roles'
)
  CREATE TABLE core_roles (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    role_code   NVARCHAR(50)  NOT NULL,
    role_label  NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    color       NVARCHAR(50)  DEFAULT 'bg-gray-700 text-gray-300',
    icon        NVARCHAR(50)  DEFAULT 'User',
    priority    INT           DEFAULT 10,
    is_builtin  BIT           NOT NULL DEFAULT 0,
    is_active   BIT           NOT NULL DEFAULT 1,
    created_at  DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_roles_code' AND object_id = OBJECT_ID('dbo.core_roles'))
  ALTER TABLE core_roles ADD CONSTRAINT UQ_core_roles_code UNIQUE (role_code);
GO

IF NOT EXISTS (SELECT 1 FROM core_roles WHERE role_code = 'admin')
BEGIN
  INSERT INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin)
  VALUES
    ('admin',   'Rendszergazda', 'Teljes hozzáférés',              'bg-purple-900 text-purple-200', 'Shield',    100, 1),
    ('manager', 'Vezető',        'Riportok, importok, felhasználók','bg-blue-900 text-blue-200',     'Briefcase',  50, 1),
    ('user',    'Felhasználó',   'Alap hozzáférés',                'bg-gray-700 text-gray-300',     'User',       10, 1);
END
GO

SELECT COUNT(*) AS core_roles_count FROM core_roles;
GO
```

---

## F2.2 — core_permissions + core_role_permissions tábla migráció

**Fájl:** `database/core/008_core_permissions.sql` (ÚJ fájl)

```sql
-- Migration 008: core_permissions + core_role_permissions

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_permissions'
)
  CREATE TABLE core_permissions (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    permission_code NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500),
    module_id       NVARCHAR(50),       -- NULL = core, egyébként modul ID
    is_builtin      BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_permissions_code' AND object_id = OBJECT_ID('dbo.core_permissions'))
  ALTER TABLE core_permissions ADD CONSTRAINT UQ_core_permissions_code UNIQUE (permission_code);
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_role_permissions'
)
  CREATE TABLE core_role_permissions (
    role_id       INT NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES core_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  );
GO

-- Beépített core permission-ök
IF NOT EXISTS (SELECT 1 FROM core_permissions WHERE permission_code = 'admin.access')
BEGIN
  INSERT INTO core_permissions (permission_code, description, module_id, is_builtin) VALUES
    ('admin.access',   'Admin panel hozzáférés',       NULL, 1),
    ('users.view',     'Felhasználók megtekintése',    NULL, 1),
    ('users.manage',   'Felhasználók kezelése',        NULL, 1),
    ('modules.toggle', 'Modulok be/kikapcsolása',      NULL, 1),
    ('settings.view',  'Beállítások megtekintése',     NULL, 1),
    ('settings.edit',  'Beállítások módosítása',       NULL, 1),
    ('data.import',    'Adatok importálása',           NULL, 1),
    ('data.export',    'Adatok exportálása',           NULL, 1),
    ('reports.view',   'Riportok megtekintése',        NULL, 1),
    ('reports.edit',   'Riportok szerkesztése',        NULL, 1),
    ('audit.view',     'Audit napló megtekintése',     NULL, 1);
END
GO

-- Admin: minden jogosultság
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'admin'
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

-- Manager: import, export, riportok, felhasználók megtekintése
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'manager'
  AND p.permission_code IN ('users.view','data.import','data.export','reports.view','reports.edit','settings.view')
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

-- User: riportok megtekintése
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'user'
  AND p.permission_code IN ('reports.view')
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

SELECT COUNT(*) AS core_permissions_count FROM core_permissions;
GO
```

---

## F2.3 — RBAC service

**Fájl:** `lib/rbac/index.ts` (ÚJ fájl)

**Funkcionalitás:**
- `getPermissionsForRole(roleCode: string): Promise<string[]>` — DB query a core_role_permissions JOIN core_permissions-ből, 5 perces cache
- `hasPermission(roleCode: string, permissionCode: string): Promise<boolean>` — meghívja getPermissionsForRole, ellenőrzi includes
- `getAllRoles(): Promise<RoleInfo[]>` — összes role lekérés (admin UI-hoz)
- `getAllPermissions(): Promise<PermissionInfo[]>` — összes permission lekérés
- `clearPermissionCache(): void` — cache ürítés

**DB Query a `getPermissionsForRole`-hoz:**
```sql
SELECT p.permission_code
FROM core_role_permissions rp
JOIN core_roles r ON rp.role_id = r.id
JOIN core_permissions p ON rp.permission_id = p.id
WHERE r.role_code = @roleCode AND r.is_active = 1
```

**Cache:** `Map<string, string[]>` — role_code → permission_code tömb, 5 perces TTL (ugyanaz a minta mint a license service-ben).

---

## F2.4 — checkAuth middleware helper

**Fájl:** `lib/rbac/middleware.ts` (ÚJ fájl)

**Funkcionalitás:**
Egy kombinált session + permission check helper API route-okhoz:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { hasPermission } from '@/lib/rbac';

export async function checkAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<
  | { valid: true; userId: number; username: string; fullName: string; role: string }
  | { valid: false; response: NextResponse }
> {
  const session = await checkSession(request);
  if (!session.valid) return session;

  if (requiredPermission) {
    const allowed = await hasPermission(session.role, requiredPermission);
    if (!allowed) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Nincs jogosultságod ehhez a művelethez.' },
          { status: 403 }
        ),
      };
    }
  }

  return session;
}
```

**Használat (API route-okban):**
```typescript
const auth = await checkAuth(request, 'data.import');
if (!auth.valid) return auth.response;
// auth.userId, auth.role, stb. elérhető
```

---

## F2.5 — `lib/validators/user.ts` átírás: role-ok DB-ből

**Fájl:** `lib/validators/user.ts`

**Mit csinálj:**
A hardcode-olt `ROLES`, `ROLE_LABELS`, `ROLE_COLORS` konstansokat **töröld**. A `CreateUserSchema` role mezőjét `z.enum(ROLES)`-ról `z.string().min(1).max(50)`-re cseréld. A role validáció API szinten történik a DB-ből töltött role lista alapján.

**Új tartalom:**
```typescript
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, USERNAME_MIN_LENGTH } from '@/lib/constants';

export const FALLBACK_ROLES = ['admin', 'manager', 'user'] as const;

export const CreateUserSchema = z.object({
  username: z.string().min(USERNAME_MIN_LENGTH).max(100).trim(),
  fullName: z.string().min(1).max(200).trim().optional(),
  email:    z.string().email().max(255).optional().or(z.literal('')),
  role:     z.string().min(1).max(50),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(100),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(200).trim().optional(),
  email:    z.string().email().max(255).optional().or(z.literal('')),
  role:     z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

**Fontos:** A `ROLE_LABELS` és `ROLE_COLORS`-t használó komponensek (pl. Header, user lista) ezentúl a `GET /api/admin/roles` API-ból kapják az adatokat.

---

## F2.6 — Roles API: `app/api/admin/roles/route.ts`

**Fájl:** `app/api/admin/roles/route.ts` (ÚJ fájl)

**Endpoint-ok:**

**GET /api/admin/roles** — összes role + permission-jeik
- Session check: `checkAuth(request, 'admin.access')`
- Query: roles + hozzájuk rendelt permission_code-ok
- Válasz:
```json
{
  "roles": [
    {
      "id": 1,
      "roleCode": "admin",
      "roleLabel": "Rendszergazda",
      "description": "Teljes hozzáférés",
      "color": "bg-purple-900 text-purple-200",
      "icon": "Shield",
      "priority": 100,
      "isBuiltin": true,
      "isActive": true,
      "permissions": ["admin.access", "users.view", "users.manage", ...]
    }
  ],
  "allPermissions": [
    { "id": 1, "permissionCode": "admin.access", "description": "Admin panel hozzáférés", "moduleId": null, "isBuiltin": true }
  ]
}
```

**POST /api/admin/roles** — új role létrehozás
- Body: `{ roleCode, roleLabel, description, color, icon, priority, permissions: string[] }`
- Zod validáció
- INSERT core_roles + INSERT core_role_permissions

**PUT /api/admin/roles** — role módosítás
- Body: `{ id, roleLabel, description, color, icon, priority, permissions: string[] }`
- UPDATE core_roles + DELETE/INSERT core_role_permissions
- Permission cache ürítés: `clearPermissionCache()`

**DELETE /api/admin/roles** — role törlés
- Body: `{ id }`
- Ellenőrzés: `is_builtin = false` (beépített role-ok NEM törölhetők)
- Ellenőrzés: nincs felhasználó aki ezt a role-t használja (vagy hiba)
- DELETE core_roles (CASCADE törli a role_permissions-t is)

---

## F2.7 — Roles admin oldal

**Fájl:** `app/dashboard/admin/roles/page.tsx` (ÚJ fájl)

**Felépítés:**
1. **Bal oldal (1/3 szélesség):** Role-ok listája
   - Minden role: színes badge + ikon + role_label + description
   - Kattintásra: kiválasztás → jobb oldal frissül
   - "Új role" gomb alul
   - Beépített role-oknál: 🔒 ikon (nem törölhető)

2. **Jobb oldal (2/3 szélesség):** Kiválasztott role permission mátrixa
   - Cím: role_label szerkesztés (input field)
   - Szín választó (dropdown)
   - Ikon választó (dropdown)
   - Priority (number input)
   - **Permission checkbox lista:**
     - Csoportosítva fejlécekkel: "Core", "Modul: Workforce", "Modul: Tracking", stb. (a `module_id` alapján)
     - Minden permission: checkbox + description
     - Admin role: minden checkbox checked és disabled (admin mindig mindent kap)
   - "Mentés" gomb
   - "Törlés" gomb (csak nem-beépítettnél)

**API hívások:** `GET /api/admin/roles`, `PUT /api/admin/roles`, `POST /api/admin/roles`, `DELETE /api/admin/roles`

**Stílus:** Sötét téma, konzisztens a meglévő admin oldalakkal.

---

## F2.8 — Admin layout frissítése: role check → permission check

**Fájl:** `app/dashboard/admin/layout.tsx`

**Jelenlegi (18-19. sor):**
```typescript
if (session.role !== 'admin') {
  redirect('/dashboard');
}
```

**Cseréld erre:**
```typescript
import { hasPermission } from '@/lib/rbac';

const canAccessAdmin = await hasPermission(session.role, 'admin.access');
if (!canAccessAdmin) {
  redirect('/dashboard');
}
```

---

## F2.9 — Admin API route-ok frissítése: `session.role !== 'admin'` → `checkAuth`

**Érintett fájlok (mindegyikben ugyanaz a minta):**

| Fájl | Jelenlegi | Új permission |
|---|---|---|
| `app/api/admin/users/route.ts` GET | `session.role !== 'admin' && !== 'manager'` | `checkAuth(req, 'users.view')` |
| `app/api/admin/users/route.ts` POST | `session.role !== 'admin'` | `checkAuth(req, 'users.manage')` |
| `app/api/admin/users/[id]/route.ts` | `session.role !== 'admin'` | `checkAuth(req, 'users.manage')` |
| `app/api/admin/modules/route.ts` GET | `session.role !== 'admin'` | `checkAuth(req, 'admin.access')` |
| `app/api/admin/modules/route.ts` PUT | `session.role !== 'admin'` | `checkAuth(req, 'modules.toggle')` |
| `app/api/admin/settings/route.ts` GET | `session.role !== 'admin'` | `checkAuth(req, 'settings.view')` |
| `app/api/admin/settings/route.ts` PUT | `session.role !== 'admin'` | `checkAuth(req, 'settings.edit')` |
| `app/api/admin/audit-log/route.ts` | `session.role !== 'admin'` | `checkAuth(req, 'audit.view')` |
| `app/api/admin/diagnostics/route.ts` | `session.role !== 'admin'` | `checkAuth(req, 'admin.access')` |
| `app/api/admin/license/route.ts` | `session.role !== 'admin'` | `checkAuth(req, 'admin.access')` |

**Minta (minden fájlban):**

Előtte:
```typescript
const session = await checkSession(request);
if (!session.valid) return session.response;
if (session.role !== 'admin') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

Utána:
```typescript
import { checkAuth } from '@/lib/rbac/middleware';

const auth = await checkAuth(request, 'users.view');  // ← a megfelelő permission
if (!auth.valid) return auth.response;
// auth.userId, auth.username, auth.role használható
```

---

## F2.10 — Roles menüpont az admin panelen

**Fájl:** `app/dashboard/admin/page.tsx`

**Mit csinálj:**
Az `ADMIN_MENU` tömbbe adj hozzá (a "Felhasználók" után):

```typescript
{
  title: 'Szerepkörök & Jogok',
  description: 'Szerepkörök kezelése, jogosultság mátrix',
  icon: 'Shield',
  href: '/dashboard/admin/roles',
},
```

---

## F2.11 — User lista és Header: role adatok DB-ből

**Érintett fájlok:**
- `components/core/Header.tsx` — a `getRoleBadgeColor()` függvény jelenleg hardcode-olt. Cseréld: a role szín a DB-ből jöjjön (a session-ben vagy egy API hívásban).
- User lista komponens — ahol `ROLE_LABELS` és `ROLE_COLORS` volt, ott a roles API-ból kapott adatokat használd.

**Megoldás:** A dashboard layout-ban a session mellé kérd le a role-ok adatait is és add át prop-ként, VAGY készíts egy `useRoles()` hook-ot ami a `GET /api/admin/roles`-t cache-eli (TanStack Query).

---

## F2.12 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 007, 008 hiba nélkül lefut
2. `npm run type-check` — 0 hiba
3. Admin → Roles oldal: 3 beépített role megjelenik
4. Új role létrehozás működik (pl. "Operátor")
5. Permission mátrix: checkbox-ok mentése működik
6. Manager felhasználó: az admin panelen látja amit a permission engedélyez, a többit nem
7. Egyedi role: a hozzá rendelt permission-ök érvényesülnek
