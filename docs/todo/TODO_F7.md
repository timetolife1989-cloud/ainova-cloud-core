# F7 — ADMIN PANEL BŐVÍTÉS

> **Cél:** Az összes új admin oldal (F1-F6-ból) összefogása, az admin menü dinamikussá tétele, és a branding oldal bővítése.
> **Előfeltétel:** F1-F6 kész
> **Időbecslés:** 1.5 hét

---

## F7.1 — Admin menü dinamikus generálása

**Fájl:** `app/dashboard/admin/page.tsx`

**Mit csinálj:**
A jelenlegi hardcode-olt `ADMIN_MENU` tömböt cseréld egy dinamikus rendszerre:

```typescript
// Core admin menüpontok (ezek mindig látszanak)
const CORE_ADMIN_MENU = [
  { title: 'Felhasználók',         description: '...', icon: 'Users',     href: '/dashboard/admin/users',          order: 10 },
  { title: 'Szerepkörök & Jogok',  description: '...', icon: 'Shield',    href: '/dashboard/admin/roles',          order: 20 },
  { title: 'Modulok',              description: '...', icon: 'ToggleLeft', href: '/dashboard/admin/modules',       order: 30 },
  { title: 'Branding & Megjelenés',description: '...', icon: 'Palette',   href: '/dashboard/admin/branding',      order: 40 },
  { title: 'Nyelv & Formátumok',   description: '...', icon: 'Globe',     href: '/dashboard/admin/locale',        order: 50 },
  { title: 'Mértékegységek',       description: '...', icon: 'Ruler',     href: '/dashboard/admin/units',         order: 60 },
  { title: 'Import konfigurációk', description: '...', icon: 'FileInput', href: '/dashboard/admin/import-configs', order: 70 },
  { title: 'Diagnosztika',         description: '...', icon: 'Activity',  href: '/dashboard/admin/diagnostics',   order: 80 },
  { title: 'Audit Napló',          description: '...', icon: 'FileText',  href: '/dashboard/admin/audit-log',     order: 90 },
  { title: 'Licenc',               description: '...', icon: 'Key',       href: '/dashboard/admin/license',       order: 100 },
];
```

A `description` értékeket az `i18n` service-ből vedd (ha F4 kész), egyébként maradhat magyar hardcode ideiglenes jelleggel.

**Modul-specifikus admin menüpontok:** Az aktív modulok közül azoknál, ahol van `adminSettings`, automatikusan adj hozzá egy menüpontot:

```typescript
// Modul admin menüpontok (dinamikus)
const moduleAdminItems = activeModules
  .filter(m => m.adminSettings && m.adminSettings.length > 0)
  .map((m, i) => ({
    title: `${m.name} beállítások`,
    description: `${m.name} modul konfigurációja`,
    icon: m.icon,
    href: `/dashboard/admin/modules/${m.id}`,
    order: 200 + i,
  }));

const allMenuItems = [...CORE_ADMIN_MENU, ...moduleAdminItems].sort((a, b) => a.order - b.order);
```

---

## F7.2 — Branding admin oldal bővítése

**Fájl:** `app/dashboard/admin/branding/page.tsx` (ÚJ fájl, vagy a meglévő `settings/page.tsx` átalakítása)

A meglévő settings oldal valószínűleg egyszerű. Bővítsd:

**Felépítés:**
1. **Cégnév:** Text input — `app_name` setting
2. **Elsődleges szín:** Color picker — `app_primary_color` setting (hex)
3. **Másodlagos szín:** Color picker — `app_secondary_color` setting (hex)
4. **Logó feltöltés:** File input (képfájl) — feltöltés `UPLOAD_DIR`-be, `app_logo_path` setting
5. **Favicon feltöltés:** File input — `app_favicon_path` setting
6. **Login oldal háttér:** Szín vagy kép választó — `app_login_bg` setting
7. **Előnézet panel:** A fejlécet és a login oldalt mutatja mini méretben, az aktuális beállításokkal

**API:** A meglévő `PUT /api/admin/settings` endpoint használható. A fájl feltöltéshez egy külön endpoint kell: `POST /api/admin/upload` (vagy `POST /api/admin/settings/upload`).

**Mentés:** Batch update az összes branding setting-re egyszerre:
```json
{
  "updates": [
    { "key": "app_name", "value": "MühlCo Dashboard" },
    { "key": "app_primary_color", "value": "#2563eb" },
    { "key": "app_secondary_color", "value": "#7c3aed" }
  ]
}
```

---

## F7.3 — File upload API endpoint

**Fájl:** `app/api/admin/upload/route.ts` (ÚJ fájl)

**POST /api/admin/upload** — Kép/fájl feltöltés
- FormData fogadás (logo, favicon)
- Permission: `checkAuth(request, 'settings.edit')`
- Validáció: max méret (MAX_UPLOAD_SIZE_BYTES), engedélyezett típusok (png, jpg, svg, ico)
- Mentés: `UPLOAD_DIR` mappába
- Válasz: `{ filePath: '/uploads/logo-1234.png' }`

---

## F7.4 — Notification center tábla (opcionális, de ajánlott)

**Fájl:** `database/core/014_core_notifications.sql` (ÚJ fájl)

```sql
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_notifications'
)
  CREATE TABLE core_notifications (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT,                              -- NULL = broadcast minden user-nek
    module_id   NVARCHAR(50),
    title       NVARCHAR(200) NOT NULL,
    message     NVARCHAR(MAX),
    severity    NVARCHAR(20) DEFAULT 'info',      -- 'info', 'warning', 'error', 'success'
    is_read     BIT NOT NULL DEFAULT 0,
    created_at  DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_user' AND object_id = OBJECT_ID('dbo.core_notifications'))
  CREATE INDEX idx_notifications_user ON core_notifications(user_id, is_read, created_at DESC);
GO
```

**API:**
- `GET /api/notifications` — aktuális user olvasatlan értesítései
- `PUT /api/notifications/read` — olvasottnak jelölés

**Header-ben:** Csengő ikon + olvasatlan szám badge (opcionális, de szép feature).

---

## F7.5 — Teszt

1. `npm run type-check` — 0 hiba
2. `npm run build` — sikeres
3. Admin panel → dinamikus menü: core + modul menüpontok megjelennek
4. Branding oldal: szín váltás → fejléc frissül
5. Logó feltöltés → megjelenik a fejlécben
6. (Ha van notification) Header-ben csengő ikon működik
