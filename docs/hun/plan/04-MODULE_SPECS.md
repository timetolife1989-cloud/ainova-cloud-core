# 04 — ÚJ MODULOK TECHNIKAI SPECIFIKÁCIÓJA

> **Verzió:** 2.0 | **Dátum:** 2026-03-14 | **Státusz:** AKTÍV
> **Célközönség:** AI fejlesztő modell — ez az utasításkészlet a modulok implementálásához
> **Kapcsolódó dokumentumok:**
> - [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) — Tier beosztás és árazás
> - [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — Javítandó hibák
> - [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) — Szektordefiníciók, prioritások
> - [05-ROADMAP.md](./05-ROADMAP.md) — Fejlesztési sorrend és függőségek

---

## 0. KÖZÖS SZABÁLYOK — MINDEN ÚJ MODULRA VONATKOZIK

### 0.1 Fájlstruktúra (KÖTELEZŐ sablon)

Minden új modul az alábbi mappastruktúrát KELL kövesse:

```
modules/<module-id>/
├── manifest.ts                    # Modul definíció + registerModule() hívás
├── migrations/
│   └── 001_<module-id>.sql        # Első migráció (CREATE TABLE)
├── api/
│   ├── route.ts                   # GET (lista) + POST (létrehozás)
│   └── [id]/
│       └── route.ts               # GET (egy elem) + PUT (frissítés) + DELETE (törlés)
├── components/
│   └── DashboardPage.tsx          # Fő UI (React, 'use client')
└── types/                         # Opcionális, ha komplex típusok kellenek
    └── index.ts
```

### 0.2 Manifest sablon

```typescript
import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: '<module-id>',
  name: '<Modul név>',
  description: '<Rövid leírás angolul>',
  icon: '<LucideIkonNeve>',
  href: '/dashboard/modules/<module-id>',
  color: '<bg-COLOR-600>',
  version: '1.0.0',
  tier: '<basic|professional|enterprise>' as const,
  dependsOn: [],              // Más modul ID-k ha szükséges
  permissions: [
    '<module-id>.view',
    '<module-id>.edit',
    '<module-id>.export',
  ],
  adminSettings: [],          // Admin panel beállítások
  migrations: ['001_<module-id>.sql'],
};

registerModule(manifest);
```

### 0.3 Regisztrálási checklist (MINDEN modulnál)

| # | Lépés | Fájl | Minta |
|---|-------|------|-------|
| 1 | Manifest létrehozása | `modules/<id>/manifest.ts` | Lásd §0.2 |
| 2 | Loader import | `modules/_loader.ts` | `import '@/modules/<id>/manifest';` |
| 3 | Tier regisztráció | `lib/license/tiers.ts` | `TIER_MODULES.<tier>.push('<id>')` |
| 4 | Migráció futtatás | `scripts/migrate-all.ts` | Automatikus (manifest.migrations) |
| 5 | RBAC permissions | `lib/rbac/` | Permissions auto-regisztrálódnak manifest-ből |
| 6 | i18n kulcsok | `lib/i18n/locales/hu.json`, `en.json`, `de.json` | `<id>.*` prefix |
| 7 | API route | **NEM KELL külön** — a catch-all `app/api/modules/[moduleId]/[...path]/route.ts` automatikusan betölti a `modules/<id>/api/` route-okat |
| 8 | Dashboard page | **NEM KELL külön** — a catch-all `app/dashboard/modules/[moduleId]/page.tsx` dinamikusan tölti a `modules/<id>/components/DashboardPage.tsx`-t |

### 0.4 SQL konvenciók

- **Dialektus:** PostgreSQL (Supabase) — MSSQL szintaxis NEM!
- **Idempotens:** `CREATE TABLE IF NOT EXISTS`
- **Táblanév:** `<module_id>_<tabla>` (pl. `purchasing_suppliers`, `pos_transactions`)
- **PK:** `id SERIAL PRIMARY KEY` (auto-increment)
- **Timestamp:** `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- **FK:** Explicit referenciák, `ON DELETE CASCADE` vagy `SET NULL` az üzleti logika szerint
- **Index:** `CREATE INDEX IF NOT EXISTS idx_<modul>_<oszlop> ON <tábla>(<oszlop>);`

### 0.5 API konvenciók

```typescript
// modules/<id>/api/route.ts — Példa
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — Lista lekérdezés
export async function GET(request: NextRequest) {
  const { userId } = await checkAuth(request, '<module-id>.view');
  const db = getDb();
  const result = await db.query('SELECT * FROM <module_id>_<tabla> ORDER BY created_at DESC');
  return NextResponse.json(result.recordset);
}

// POST — Létrehozás (Zod validációval)
const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  // ...mezők
});

export async function POST(request: NextRequest) {
  const { userId } = await checkAuth(request, '<module-id>.edit');
  await checkCsrf(request);
  const body = CreateSchema.parse(await request.json());
  const db = getDb();
  // INSERT INTO ...
  return NextResponse.json({ success: true, id: result.recordset[0].id }, { status: 201 });
}
```

### 0.6 DashboardPage sablon

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { csrfFetch } = useCsrf();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/modules/<module-id>/data')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title={t('<module-id>.title')}
        description={t('<module-id>.description')}
      />
      {/* Tartalom */}
    </div>
  );
}
```

---

## MODUL 1: `purchasing` — Beszerzés

### 1.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `purchasing` |
| **Név** | Beszerzés / Purchasing |
| **Tier** | Basic |
| **Ikon** | `ShoppingBag` |
| **Szín** | `bg-orange-600` |
| **Dependency** | `inventory` |
| **Permissions** | `purchasing.view`, `purchasing.edit`, `purchasing.approve`, `purchasing.export` |
| **Szektorok** | S1 Gyártás, S2 Kereskedelem, S4 Vendéglátás, S5 Építőipar |

### 1.2 Funkciók

| # | Funkció | Leírás | Prioritás |
|---|---------|--------|-----------|
| F1 | Beszállító kezelés | CRUD beszállítók, elérhetőségek, fizetési feltételek, értékelés | 🔴 |
| F2 | Rendelés létrehozás | Beszállítónak rendelés (tételek, mennyiségek, egységár) | 🔴 |
| F3 | Rendelés státusz | Megrendelve → Szállítás alatt → Beérkezett → Ellenőrizve | 🔴 |
| F4 | Automatikus rendelés | Alacsony készlet → rendelési javaslat (inventory.min_quantity trigger) | 🟠 |
| F5 | Árajánlat kérés | Több beszállítónak küldeni → árajánlatok összehasonlítása | 🟡 |
| F6 | Rendelés → Raktár | Beérkezettként jelölés → inventory_movements rekord készül | 🔴 |
| F7 | Beszállítói számla | Szállítói számla hozzárendelése a rendeléshez | 🟠 |

### 1.3 Adatbázis séma

```sql
-- modules/purchasing/migrations/001_purchasing.sql

-- Beszállítók
CREATE TABLE IF NOT EXISTS purchasing_suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(200),
  email           VARCHAR(200),
  phone           VARCHAR(50),
  address         TEXT,
  tax_number      VARCHAR(30),
  payment_terms   VARCHAR(50) DEFAULT '30 nap',  -- '0 nap', '15 nap', '30 nap', '60 nap'
  currency        VARCHAR(3) DEFAULT 'HUF',
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Beszerzési rendelések
CREATE TABLE IF NOT EXISTS purchasing_orders (
  id              SERIAL PRIMARY KEY,
  order_number    VARCHAR(30) NOT NULL UNIQUE,    -- AUTO: PO-2026-0001
  supplier_id     INTEGER NOT NULL REFERENCES purchasing_suppliers(id),
  status          VARCHAR(20) DEFAULT 'draft',    -- draft, ordered, shipped, received, verified, cancelled
  order_date      DATE DEFAULT CURRENT_DATE,
  expected_date   DATE,
  received_date   DATE,
  total_net       DECIMAL(12,2) DEFAULT 0,
  total_gross     DECIMAL(12,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'HUF',
  notes           TEXT,
  created_by      INTEGER REFERENCES core_users(id),
  approved_by     INTEGER REFERENCES core_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Rendelés tételek
CREATE TABLE IF NOT EXISTS purchasing_order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES purchasing_orders(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES inventory_items(id),  -- FK az inventory modulba
  description     VARCHAR(300),                              -- ha nincs inventory-ban
  quantity        DECIMAL(10,3) NOT NULL,
  unit            VARCHAR(20) DEFAULT 'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 27.00,               -- ÁFA %
  line_total_net  DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_qty    DECIMAL(10,3) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchasing_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchasing_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchasing_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_poi_order ON purchasing_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchasing_order_items(product_id);
```

### 1.4 API Végpontok

| Metódus | Útvonal | Funkció | Permission |
|---------|---------|---------|------------|
| GET | `/api/modules/purchasing/suppliers` | Beszállítók listázása | `purchasing.view` |
| POST | `/api/modules/purchasing/suppliers` | Beszállító létrehozás | `purchasing.edit` |
| GET | `/api/modules/purchasing/suppliers/[id]` | Egy beszállító | `purchasing.view` |
| PUT | `/api/modules/purchasing/suppliers/[id]` | Beszállító frissítés | `purchasing.edit` |
| DELETE | `/api/modules/purchasing/suppliers/[id]` | Beszállító törlés | `purchasing.edit` |
| GET | `/api/modules/purchasing/orders` | Rendelések listázása | `purchasing.view` |
| POST | `/api/modules/purchasing/orders` | Rendelés létrehozás | `purchasing.edit` |
| GET | `/api/modules/purchasing/orders/[id]` | Egy rendelés + tételek | `purchasing.view` |
| PUT | `/api/modules/purchasing/orders/[id]` | Rendelés frissítés | `purchasing.edit` |
| POST | `/api/modules/purchasing/orders/[id]/receive` | Beérkezés rögzítés | `purchasing.edit` |
| POST | `/api/modules/purchasing/orders/[id]/approve` | Rendelés jóváhagyás | `purchasing.approve` |

### 1.5 API route fájlok struktúra

```
modules/purchasing/api/
├── route.ts              # GET: rendelések lista → /api/modules/purchasing 
├── suppliers/
│   ├── route.ts          # GET: supplier lista + POST: supplier létrehozás
│   └── [id]/
│       └── route.ts      # GET/PUT/DELETE egy supplier
├── orders/
│   ├── route.ts          # GET: order lista + POST: order létrehozás
│   └── [id]/
│       ├── route.ts      # GET/PUT egy order
│       ├── receive/
│       │   └── route.ts  # POST: beérkezés
│       └── approve/
│           └── route.ts  # POST: jóváhagyás
```

### 1.6 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Beszerzés                           [+ Új rendelés]     │
├─────────────────────────────────────────────────────────────┤
│ Tab: [Rendelések] [Beszállítók] [Javaslatok]               │
│                                                             │
│ [Rendelések tab:]                                          │
│ ┌─────────┬──────────┬──────────┬─────────┬───────┬──────┐ │
│ │ Szám    │ Beszáll. │ Dátum    │ Státusz │ Összeg│ Akció│ │
│ ├─────────┼──────────┼──────────┼─────────┼───────┼──────┤ │
│ │ PO-0042 │ Metro    │ 2026-03-│ Rendelt │ 45K Ft│ 👁️📝│ │
│ │ PO-0041 │ Würth    │ 2026-03-│ Beérk.  │ 12K Ft│ 👁️  │ │
│ └─────────┴──────────┴──────────┴─────────┴───────┴──────┘ │
│                                                             │
│ [Javaslatok tab:]                                          │
│ ⚠️ 3 termék készlete alacsony → rendelés javasolt:         │
│ • Csavar M6x20 (12 db ← min: 50) — Beszáll.: Würth      │
│ • Festék RAL9010 (2 L ← min: 10) — Beszáll.: PPG        │
│ [Rendelés indítása kijelöltekből]                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.7 Integráció — Inventory modul

**Beérkezés flow:**
1. `purchasing_orders` → `status = 'received'`
2. Minden `purchasing_order_items` tétel → `inventory_movements` INSERT:
   ```sql
   INSERT INTO inventory_movements (item_id, type, quantity, reference, created_by)
   VALUES ($productId, 'in', $receivedQty, 'PO-2026-0042', $userId);
   ```
3. `inventory_items.current_stock += received_qty`

**Automatikus rendelési javaslat flow:**
1. CRON / dashboard betöltésekor: `SELECT * FROM inventory_items WHERE current_stock <= min_quantity`
2. A találat → `purchasing` dashboard "Javaslatok" tab-on megjelenik
3. Admin kattintás → rendelés vázlat generálás (draft order) a preferált beszállítóval

### 1.8 i18n kulcsok (szükségesek)

```json
{
  "purchasing.title": "Beszerzés",
  "purchasing.description": "Beszállítók és rendelések kezelése",
  "purchasing.suppliers": "Beszállítók",
  "purchasing.orders": "Rendelések",
  "purchasing.suggestions": "Rendelési javaslatok",
  "purchasing.new_order": "Új rendelés",
  "purchasing.order_number": "Rendelés szám",
  "purchasing.supplier": "Beszállító",
  "purchasing.status.draft": "Vázlat",
  "purchasing.status.ordered": "Megrendelve",
  "purchasing.status.shipped": "Szállítás alatt",
  "purchasing.status.received": "Beérkezett",
  "purchasing.status.verified": "Ellenőrizve",
  "purchasing.status.cancelled": "Visszavonva",
  "purchasing.receive": "Beérkezés rögzítése",
  "purchasing.approve": "Jóváhagyás",
  "purchasing.low_stock_alert": "Alacsony készlet — rendelés javasolt"
}
```

### 1.9 Admin beállítások

```typescript
adminSettings: [
  {
    key: 'purchasing_auto_suggest',
    label: 'Automatic purchase suggestions',
    type: 'boolean',
    default: 'true',
    description: 'Show suggestions when stock falls below minimum'
  },
  {
    key: 'purchasing_order_prefix',
    label: 'Order number prefix',
    type: 'string',
    default: 'PO'
  },
  {
    key: 'purchasing_default_vat',
    label: 'Default VAT rate (%)',
    type: 'number',
    default: '27'
  },
],
```

---

## MODUL 2: `pos` — POS / Pénztár

### 2.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `pos` |
| **Név** | Pénztár / Point of Sale |
| **Tier** | Basic |
| **Ikon** | `CreditCard` |
| **Szín** | `bg-emerald-600` |
| **Dependencies** | `inventory`, `invoicing` |
| **Permissions** | `pos.view`, `pos.sell`, `pos.refund`, `pos.close_day`, `pos.export` |
| **Szektorok** | S2 Kereskedelem, S4 Vendéglátás |

### 2.2 Funkciók

| # | Funkció | Leírás | Prioritás |
|---|---------|--------|-----------|
| F1 | Eladási felület | Termékek hozzáadása (kereső/vonalkód), mennyiség, kosár | 🔴 |
| F2 | Fizetés | Készpénz, kártya, átutalás → nyugta/számla generálás | 🔴 |
| F3 | Készlet csökkentés | Eladás → `inventory_items.current_stock -= sold_qty` | 🔴 |
| F4 | Napi zárás | Nap végi összesítő (forgalom, fizetési módok, pénztárkülönbözet) | 🔴 |
| F5 | Kedvezmény | Tételszintű vagy kosárszintű kedvezmény (%, fix) | 🟠 |
| F6 | Visszáru | Visszavétel → készlet visszaadás + negatív tranzakció | 🟠 |
| F7 | Vonalkód olvasás | Kamera vagy USB scanner → termék azonosítás | 🟡 |
| F8 | Számla generálás | Vevő adatai → `invoicing` modul számla | 🟠 |

### 2.3 Adatbázis séma

```sql
-- modules/pos/migrations/001_pos.sql

-- POS tranzakciók (egy eladás = egy tranzakció)
CREATE TABLE IF NOT EXISTS pos_transactions (
  id              SERIAL PRIMARY KEY,
  receipt_number  VARCHAR(30) NOT NULL UNIQUE,     -- REC-2026-0001
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  cashier_id      INTEGER REFERENCES core_users(id),
  payment_method  VARCHAR(20) NOT NULL,            -- cash, card, transfer
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_type   VARCHAR(10),                      -- percent, fixed
  total_net       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_vat       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_gross     DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_refund       BOOLEAN DEFAULT FALSE,
  original_id     INTEGER REFERENCES pos_transactions(id), -- ha visszáru
  invoice_id      INTEGER,                          -- FK invoicing_invoices ha számla kell
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- POS eladási tételek
CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id              SERIAL PRIMARY KEY,
  transaction_id  INTEGER NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES inventory_items(id),
  product_name    VARCHAR(300) NOT NULL,            -- snapshot (ha a termék törlődik)
  barcode         VARCHAR(50),
  quantity        DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit            VARCHAR(20) DEFAULT 'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 27.00,
  discount        DECIMAL(10,2) DEFAULT 0,
  line_total      DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Napi zárások
CREATE TABLE IF NOT EXISTS pos_daily_closings (
  id              SERIAL PRIMARY KEY,
  closing_date    DATE NOT NULL,
  cashier_id      INTEGER REFERENCES core_users(id),
  total_cash      DECIMAL(12,2) DEFAULT 0,
  total_card      DECIMAL(12,2) DEFAULT 0,
  total_transfer  DECIMAL(12,2) DEFAULT 0,
  total_refunds   DECIMAL(12,2) DEFAULT 0,
  expected_cash   DECIMAL(12,2) DEFAULT 0,
  actual_cash     DECIMAL(12,2),                    -- betárazott készpénz
  difference      DECIMAL(12,2),                    -- eltérés
  transaction_count INTEGER DEFAULT 0,
  notes           TEXT,
  closed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_pos_tx_date ON pos_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pos_tx_cashier ON pos_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_tx ON pos_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_product ON pos_transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_close_date ON pos_daily_closings(closing_date);
```

### 2.4 API Végpontok

| Metódus | Útvonal | Funkció | Permission |
|---------|---------|---------|------------|
| GET | `/api/modules/pos/transactions` | Tranzakciók lista (szűrhető) | `pos.view` |
| POST | `/api/modules/pos/sell` | Eladás végrehajtás (kosár → tranzakció) | `pos.sell` |
| POST | `/api/modules/pos/refund` | Visszáru | `pos.refund` |
| GET | `/api/modules/pos/transactions/[id]` | Egy tranzakció + tételek | `pos.view` |
| POST | `/api/modules/pos/close-day` | Napi zárás | `pos.close_day` |
| GET | `/api/modules/pos/daily-summary` | Mai nap összesítő (real-time) | `pos.view` |
| GET | `/api/modules/pos/product-search` | Termékkereső (inventory-ból) | `pos.view` |

### 2.5 Eladás flow (API: `/api/modules/pos/sell`)

```
1. Kliens küld: { items: [{ productId, quantity, unitPrice }], paymentMethod, discount? }
2. Zod validáció
3. Tranzakció:
   a. INSERT pos_transactions (total kiszámolva)
   b. INSERT pos_transaction_items (egy sor per tétel)
   c. UPDATE inventory_items SET current_stock = current_stock - quantity WHERE id = productId
   d. INSERT inventory_movements (type='out', reference=receipt_number)
   e. Ha számla kell: INSERT invoicing_invoices + items (→ invoicing modul API hívás)
4. Válasz: { success: true, receiptNumber: 'REC-2026-0001', total: 12500 }
```

### 2.6 UI Layout — POS felület (TOUCHSCREEN optimalizált)

```
┌─────────────────────────────────────────────────────────────┐
│ 🛒 Pénztár                                   [Napi zárás]  │
├────────────────────────────┬────────────────────────────────┤
│ BAL: Termékkereső          │ JOBB: Kosár                   │
│ ┌─ [🔍 Terméknév / kód] ─┐│ ┌──────────────────────────┐  │
│ │                         ││ │ Csavar M6x20     3×  150 │  │
│ │ Találatok:              ││ │ Festék RAL9010   1× 2800 │  │
│ │ ┌──────┐ ┌──────┐      ││ │ Ecset 50mm       2×  450 │  │
│ │ │Csavar│ │Festék│      ││ ├──────────────────────────┤  │
│ │ │ 50 Ft│ │2800Ft│      ││ │ Részösszeg:       4.250  │  │
│ │ └──────┘ └──────┘      ││ │ ÁFA (27%):        1.148  │  │
│ │ ┌──────┐ ┌──────┐      ││ │ ────────────────────────  │  │
│ │ │Ecset │ │Szalag│      ││ │ ÖSSZESEN:         5.398  │  │
│ │ │225 Ft│ │ 90 Ft│      ││ ├──────────────────────────┤  │
│ │ └──────┘ └──────┘      ││ │ [💵 Készpénz] [💳 Kártya]│  │
│ └─────────────────────────┘│ │ [📄 Számla kell]         │  │
│                            │ │ [🗑️ Kosár törlése]       │  │
│ 📊 Mai forgalom: 45.200 Ft│ └──────────────────────────┘  │
└────────────────────────────┴────────────────────────────────┘
```

**FONTOS:** A POS felület **touchscreen-barát** kell legyen:
- Nagy gombok (min 48x48px)
- Minimum text input (vonalkód/keresés → kattintás a termékre)
- Kosár tételek: swipe/kattintás a törléshez
- Mennyiség: +/- gombok, nem számbeírás

### 2.7 Integráció

- **`inventory`:** Eladás → `inventory_movements` + `current_stock` update
- **`invoicing`:** Ha a vevő számlát kér → `invoicing` modul API hívás számla generáláshoz
- **`reports`:** Napi/heti/havi forgalmi riportok adatforrásaként

---

## MODUL 3: `crm` — Ügyfélkezelés

### 3.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `crm` |
| **Név** | Ügyfélkezelés / CRM |
| **Tier** | Professional |
| **Ikon** | `Users` |
| **Szín** | `bg-blue-600` |
| **Dependencies** | (nincs — standalone) |
| **Permissions** | `crm.view`, `crm.edit`, `crm.delete`, `crm.export` |
| **Szektorok** | S2 Kereskedelem, S3 Szolgáltatás, S5 Építőipar, S6 Logisztika |

### 3.2 Funkciók

| # | Funkció | Leírás | Prioritás |
|---|---------|--------|-----------|
| F1 | Ügyfél kezelés | CRUD ügyfelek (név, cím, adószám, email, telefon) | 🔴 |
| F2 | Kapcsolattartási előzmény | Hívások, meetingek, emailek naplózása | 🔴 |
| F3 | Megjegyzések | Szabad szöveges jegyzetek ügyfélhez | 🔴 |
| F4 | Pipeline / Üzleti lehetőségek | Lead → Ajánlat → Tárgyalás → Megnyert/Elvesztett | 🟠 |
| F5 | Emlékeztetők | Visszahívás/follow-up emlékeztető | 🟠 |
| F6 | Ügyfél → Számla | Ügyfélválasztó az invoicing modulban | 🟠 |
| F7 | Ügyfél → Munkalap | Ügyfélválasztó a worksheets modulban | 🟠 |

### 3.3 Adatbázis séma

```sql
-- modules/crm/migrations/001_crm.sql

-- Ügyfelek
CREATE TABLE IF NOT EXISTS crm_customers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  company_name    VARCHAR(200),
  email           VARCHAR(200),
  phone           VARCHAR(50),
  address         TEXT,
  city            VARCHAR(100),
  postal_code     VARCHAR(10),
  country         VARCHAR(2) DEFAULT 'HU',
  tax_number      VARCHAR(30),
  eu_tax_number   VARCHAR(30),
  customer_type   VARCHAR(20) DEFAULT 'company',   -- company, individual
  tags            TEXT[],                            -- PostgreSQL array
  source          VARCHAR(50),                       -- referral, website, cold, event
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Kapcsolattartási előzmények
CREATE TABLE IF NOT EXISTS crm_interactions (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL,             -- call, meeting, email, note
  subject         VARCHAR(300),
  description     TEXT,
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  next_follow_up  DATE,
  created_by      INTEGER REFERENCES core_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Üzleti lehetőségek (pipeline)
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES crm_customers(id),
  title           VARCHAR(300) NOT NULL,
  stage           VARCHAR(20) DEFAULT 'lead',       -- lead, proposal, negotiation, won, lost
  value           DECIMAL(12,2),
  currency        VARCHAR(3) DEFAULT 'HUF',
  probability     SMALLINT DEFAULT 0,               -- 0-100%
  expected_close  DATE,
  assigned_to     INTEGER REFERENCES core_users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Emlékeztetők
CREATE TABLE IF NOT EXISTS crm_reminders (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER REFERENCES crm_customers(id),
  opportunity_id  INTEGER REFERENCES crm_opportunities(id),
  user_id         INTEGER NOT NULL REFERENCES core_users(id),
  title           VARCHAR(200) NOT NULL,
  due_date        TIMESTAMPTZ NOT NULL,
  is_completed    BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_crm_cust_name ON crm_customers(name);
CREATE INDEX IF NOT EXISTS idx_crm_cust_email ON crm_customers(email);
CREATE INDEX IF NOT EXISTS idx_crm_cust_active ON crm_customers(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_inter_cust ON crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_cust ON crm_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_remind_user ON crm_reminders(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_crm_remind_due ON crm_reminders(due_date);
```

### 3.4 API Végpontok

| Metódus | Útvonal | Funkció | Permission |
|---------|---------|---------|------------|
| GET | `/api/modules/crm/customers` | Ügyfelek (keresés, lap, szűrő) | `crm.view` |
| POST | `/api/modules/crm/customers` | Ügyfél létrehozás | `crm.edit` |
| GET | `/api/modules/crm/customers/[id]` | Ügyfél + előzmények | `crm.view` |
| PUT | `/api/modules/crm/customers/[id]` | Ügyfél frissítés | `crm.edit` |
| DELETE | `/api/modules/crm/customers/[id]` | Ügyfél törlés (soft) | `crm.delete` |
| POST | `/api/modules/crm/interactions` | Interakció létrehozás | `crm.edit` |
| GET | `/api/modules/crm/opportunities` | Pipeline lista | `crm.view` |
| POST | `/api/modules/crm/opportunities` | Lehetőség létrehozás | `crm.edit` |
| PUT | `/api/modules/crm/opportunities/[id]` | Lehetőség frissítés (stage change) | `crm.edit` |
| GET | `/api/modules/crm/reminders` | Aktív emlékeztetők | `crm.view` |
| POST | `/api/modules/crm/reminders` | Emlékeztető létrehozás | `crm.edit` |

---

## MODUL 4: `worksheets` — Munkalapok

### 4.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `worksheets` |
| **Név** | Munkalapok / Work Orders |
| **Tier** | Professional |
| **Ikon** | `ClipboardList` |
| **Szín** | `bg-teal-600` |
| **Dependencies** | `inventory` |
| **Permissions** | `worksheets.view`, `worksheets.edit`, `worksheets.sign`, `worksheets.export` |
| **Szektorok** | S3 Szolgáltatás, S5 Építőipar |

### 4.2 Funkciók

| # | Funkció | Leírás | Prioritás |
|---|---------|--------|-----------|
| F1 | Munkalap kezelés | CRUD munkalap (ügyfél, gépjármű/tárgy, hiba leírás) | 🔴 |
| F2 | Munkafázisok | Felvétel → Diagnosztika → Javítás → Ellenőrzés → Átadás | 🔴 |
| F3 | Munkaóra nyilvántartás | Dolgozó + óra → munkadíj kalkuláció | 🔴 |
| F4 | Anyagfelhasználás | Felhasznált anyagok (inventory-ből) → készlet csökkentés | 🔴 |
| F5 | Kalkuláció | Munkadíj + anyagdíj = végösszeg → számla generálás | 🔴 |
| F6 | Ügyfél aláírás | Canvas aláírás → base64 mentés (nem külső rendszer) | 🟠 |
| F7 | PDF munkalap | @react-pdf/renderer-rel generált PDF | 🟠 |

### 4.3 Adatbázis séma

```sql
-- modules/worksheets/migrations/001_worksheets.sql

-- Munkalapok
CREATE TABLE IF NOT EXISTS worksheets_orders (
  id              SERIAL PRIMARY KEY,
  order_number    VARCHAR(30) NOT NULL UNIQUE,       -- WO-2026-0001
  customer_id     INTEGER,                            -- FK crm_customers, ha CRM aktív
  customer_name   VARCHAR(200),                       -- ha nincs CRM → kézi írás
  customer_phone  VARCHAR(50),
  subject         VARCHAR(300) NOT NULL,              -- "Mi a tárgy?" (gépjármű, gép, eszköz)
  subject_id      VARCHAR(100),                       -- Rendszám, sorozatszám
  fault_desc      TEXT,                                -- Hiba leírás
  diagnosis       TEXT,                                -- Diagnosztika eredménye
  status          VARCHAR(20) DEFAULT 'received',     -- received, diagnosing, in_progress, testing, completed, invoiced
  priority        VARCHAR(10) DEFAULT 'normal',       -- low, normal, high, urgent
  assigned_to     INTEGER REFERENCES core_users(id),
  estimated_hours DECIMAL(5,1),
  estimated_cost  DECIMAL(10,2),
  actual_hours    DECIMAL(5,1) DEFAULT 0,
  labor_rate      DECIMAL(10,2) DEFAULT 5000,         -- Ft/óra (beállításból)
  total_labor     DECIMAL(10,2) DEFAULT 0,
  total_materials DECIMAL(10,2) DEFAULT 0,
  total_cost      DECIMAL(12,2) DEFAULT 0,
  customer_signature TEXT,                             -- base64 canvas aláírás
  invoice_id      INTEGER,                             -- FK invoicing, ha számla készült
  notes           TEXT,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Munkaóra bejegyzések
CREATE TABLE IF NOT EXISTS worksheets_labor (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES worksheets_orders(id) ON DELETE CASCADE,
  worker_id       INTEGER REFERENCES core_users(id),
  description     VARCHAR(300),
  hours           DECIMAL(5,1) NOT NULL,
  rate            DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) GENERATED ALWAYS AS (hours * rate) STORED,
  work_date       DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Felhasznált anyagok
CREATE TABLE IF NOT EXISTS worksheets_materials (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES worksheets_orders(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES inventory_items(id),
  product_name    VARCHAR(300) NOT NULL,
  quantity        DECIMAL(10,3) NOT NULL,
  unit            VARCHAR(20) DEFAULT 'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_ws_status ON worksheets_orders(status);
CREATE INDEX IF NOT EXISTS idx_ws_assigned ON worksheets_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ws_customer ON worksheets_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_ws_labor_order ON worksheets_labor(order_id);
CREATE INDEX IF NOT EXISTS idx_ws_mat_order ON worksheets_materials(order_id);
```

### 4.4 Integráció

- **`inventory`:** Anyagfelhasználás → `inventory_movements` (type='out') + `current_stock -= qty`
- **`crm`:** Ha CRM aktív → ügyfélválasztó a CRM ügyféllistából (FK: `crm_customers.id`)
- **`invoicing`:** Számla generálás → munkalap tételek (munkaóra + anyag) → invoice + items

### 4.5 Munkalap → Számla generálás flow

```
1. Munkalap status = 'completed'
2. Admin kattint: "Számla generálás"
3. API: POST /api/modules/worksheets/orders/[id]/invoice
4. Backend:
   a. Munkalap tételek lekérdezés (labor + materials)
   b. Invoicing modul API hívás:
      - Vevő: worksheets_orders.customer_* adatok
      - Tételek: 
        - "Munkadíj: [description], [hours] óra × [rate] Ft" (soronként)
        - "Anyag: [product_name], [qty] × [unit_price] Ft" (soronként)
   c. Invoice ID → worksheets_orders.invoice_id UPDATE
5. Válasz: { invoiceId: 123, invoiceNumber: 'INV-2026-0042' }
```

---

## MODUL 5: `recipes` — Receptúrák (ADD-ON)

### 5.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `recipes` |
| **Név** | Receptúrák / Recipes |
| **Tier** | Add-on (+€29/hó, Starter+) |
| **Ikon** | `BookOpen` |
| **Szín** | `bg-amber-600` |
| **Dependencies** | `inventory` |
| **Permissions** | `recipes.view`, `recipes.edit`, `recipes.export` |
| **Szektorok** | S4 Vendéglátás (pékség, étterem, cukrászda) |

### 5.2 Funkciók

| # | Funkció | Prioritás |
|---|---------|-----------|
| F1 | Receptúra kezelés (CRUD) — név, kategória, leírás, hozam | 🔴 |
| F2 | Alapanyag összetétel — melyik inventory termékből mennyi kell | 🔴 |
| F3 | Kalkuláció — önköltség = Σ(alapanyag qty × egységár) | 🔴 |
| F4 | Gyártás rögzítés — "Ma sütöttünk 50 db kiflit" → készlet csökkentés az alapanyagokból | 🔴 |
| F5 | HACCP megjegyzések — allergén, hőfok, lejárat | 🟠 |

### 5.3 Adatbázis séma

```sql
-- modules/recipes/migrations/001_recipes.sql

CREATE TABLE IF NOT EXISTS recipes_recipes (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(100),                      -- pékáru, sütemény, étel
  description     TEXT,
  yield_qty       DECIMAL(10,3) NOT NULL DEFAULT 1,  -- hozam (pl. 50 db kifli)
  yield_unit      VARCHAR(20) DEFAULT 'db',
  cost_per_unit   DECIMAL(10,2),                     -- önköltség/db (kalkulált)
  prep_time_min   INTEGER,                            -- előkészítési idő (perc)
  cook_time_min   INTEGER,                            -- sütési/főzési idő (perc)
  allergens       TEXT[],                             -- ['glutén', 'tojás', 'tej']
  haccp_notes     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes_ingredients (
  id              SERIAL PRIMARY KEY,
  recipe_id       INTEGER NOT NULL REFERENCES recipes_recipes(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES inventory_items(id),
  product_name    VARCHAR(200) NOT NULL,
  quantity        DECIMAL(10,3) NOT NULL,
  unit            VARCHAR(20) DEFAULT 'kg',
  unit_cost       DECIMAL(10,2),                     -- egységár (inventory-ből frissül)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes_production (
  id              SERIAL PRIMARY KEY,
  recipe_id       INTEGER NOT NULL REFERENCES recipes_recipes(id),
  batch_qty       DECIMAL(10,3) NOT NULL,            -- hányszoros adag
  produced_qty    DECIMAL(10,3) NOT NULL,             -- tényleges hozam
  production_date DATE DEFAULT CURRENT_DATE,
  produced_by     INTEGER REFERENCES core_users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_category ON recipes_recipes(category);
CREATE INDEX IF NOT EXISTS idx_rec_ing_recipe ON recipes_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_rec_prod_recipe ON recipes_production(recipe_id);
CREATE INDEX IF NOT EXISTS idx_rec_prod_date ON recipes_production(production_date);
```

### 5.4 Gyártás rögzítés flow

```
1. Felhasználó: "Sütöttem 2 adag kenyeret" → recipe_id=5, batch_qty=2
2. Backend:
   a. Receptúra alapanyagok lekérdezése (recipes_ingredients WHERE recipe_id=5)
   b. Mindegyik alapanyag × batch_qty → inventory_movements INSERT (type='out', reference='PROD-2026-0042')
   c. inventory_items.current_stock -= (ingredient.quantity × batch_qty)
   d. recipes_production INSERT
   e. HA a végzett termék is az inventory-ben van → current_stock += produced_qty (type='in')
3. Válasz: { produced: 16, ingredientsUsed: [...] }
```

---

## MODUL 6: `appointments` — Időpontfoglalás (ADD-ON)

### 6.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `appointments` |
| **Név** | Időpontfoglalás / Appointments |
| **Tier** | Add-on (+€29/hó, Starter+) |
| **Ikon** | `CalendarCheck` |
| **Szín** | `bg-purple-600` |
| **Dependencies** | (nincs) |
| **Permissions** | `appointments.view`, `appointments.edit`, `appointments.manage` |
| **Szektorok** | S3 Szolgáltatás (szerviz, fodrász, orvos) |

### 6.2 Adatbázis séma

```sql
-- modules/appointments/migrations/001_appointments.sql

CREATE TABLE IF NOT EXISTS appointments_slots (
  id              SERIAL PRIMARY KEY,
  provider_id     INTEGER REFERENCES core_users(id), -- ki fogadja (dolgozó)
  day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=hétfő
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_duration   INTEGER DEFAULT 30,                 -- perc
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS appointments_bookings (
  id              SERIAL PRIMARY KEY,
  provider_id     INTEGER REFERENCES core_users(id),
  customer_id     INTEGER,                            -- FK crm_customers ha CRM aktív
  customer_name   VARCHAR(200) NOT NULL,
  customer_phone  VARCHAR(50),
  customer_email  VARCHAR(200),
  service_type    VARCHAR(100),
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  status          VARCHAR(20) DEFAULT 'confirmed',    -- confirmed, cancelled, completed, no_show
  notes           TEXT,
  reminder_sent   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appt_provider ON appointments_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments_bookings(status);
CREATE INDEX IF NOT EXISTS idx_appt_cust ON appointments_bookings(customer_id);
```

---

## MODUL 7: `projects` — Projektkezelés (ADD-ON)

### 7.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `projects` |
| **Név** | Projektkezelés / Projects |
| **Tier** | Add-on (+€49/hó, Basic+) |
| **Ikon** | `FolderKanban` |
| **Szín** | `bg-cyan-600` |
| **Dependencies** | (nincs) |
| **Permissions** | `projects.view`, `projects.edit`, `projects.manage`, `projects.export` |
| **Szektorok** | S5 Építőipar, S6 Logisztika |

### 7.2 Adatbázis séma

```sql
-- modules/projects/migrations/001_projects.sql

CREATE TABLE IF NOT EXISTS projects_projects (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(300) NOT NULL,
  client_name     VARCHAR(200),
  client_id       INTEGER,                           -- FK crm_customers ha CRM aktív
  status          VARCHAR(20) DEFAULT 'planning',    -- planning, active, on_hold, completed, cancelled
  start_date      DATE,
  end_date        DATE,
  budget          DECIMAL(12,2),
  actual_cost     DECIMAL(12,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'HUF',
  description     TEXT,
  manager_id      INTEGER REFERENCES core_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects_tasks (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects_projects(id) ON DELETE CASCADE,
  parent_id       INTEGER REFERENCES projects_tasks(id), -- al-feladatok
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'todo',       -- todo, in_progress, done, blocked
  assigned_to     INTEGER REFERENCES core_users(id),
  start_date      DATE,
  due_date        DATE,
  estimated_hours DECIMAL(5,1),
  actual_hours    DECIMAL(5,1) DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects_costs (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects_projects(id) ON DELETE CASCADE,
  description     VARCHAR(300) NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  cost_type       VARCHAR(20) DEFAULT 'material',   -- material, labor, subcontract, other
  invoice_id      INTEGER,                           -- FK invoicing ha van számla
  cost_date       DATE DEFAULT CURRENT_DATE,
  created_by      INTEGER REFERENCES core_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proj_status ON projects_projects(status);
CREATE INDEX IF NOT EXISTS idx_proj_manager ON projects_projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_proj_task_proj ON projects_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_task_assigned ON projects_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_proj_cost_proj ON projects_costs(project_id);
```

---

## MODUL 8: `e-commerce` — Webshop szinkronizáció (ADD-ON)

### 8.1 Meta

| Mező | Érték |
|------|-------|
| **Modul ID** | `e-commerce` |
| **Név** | Webshop szinkron / E-Commerce Sync |
| **Tier** | Add-on (+€49/hó, Basic+) |
| **Ikon** | `Globe` |
| **Szín** | `bg-pink-600` |
| **Dependencies** | `inventory` |
| **Permissions** | `e-commerce.view`, `e-commerce.edit`, `e-commerce.sync` |

### 8.2 Koncepció

- NEM webshop motor → ACI nem lesz Shopify
- Szinkronizáció meglévő webshoppal (WooCommerce, Shopify API)
- 2-irányú: ACI készlet → webshop készlet, webshop rendelés → ACI rendelés
- Webhook-alapú vagy polling (15 perc intervallum)

### 8.3 Adatbázis séma

```sql
-- modules/e-commerce/migrations/001_e-commerce.sql

CREATE TABLE IF NOT EXISTS ecommerce_connections (
  id              SERIAL PRIMARY KEY,
  platform        VARCHAR(30) NOT NULL,              -- woocommerce, shopify
  store_url       VARCHAR(500) NOT NULL,
  api_key         VARCHAR(500),                       -- encrypted
  api_secret      VARCHAR(500),                       -- encrypted
  is_active       BOOLEAN DEFAULT TRUE,
  last_sync       TIMESTAMPTZ,
  sync_interval   INTEGER DEFAULT 15,                 -- perc
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecommerce_product_map (
  id              SERIAL PRIMARY KEY,
  connection_id   INTEGER NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
  local_product_id INTEGER NOT NULL REFERENCES inventory_items(id),
  remote_product_id VARCHAR(100) NOT NULL,           -- webshop product ID
  remote_sku      VARCHAR(100),
  sync_stock      BOOLEAN DEFAULT TRUE,
  sync_price      BOOLEAN DEFAULT TRUE,
  last_synced     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id              SERIAL PRIMARY KEY,
  connection_id   INTEGER REFERENCES ecommerce_connections(id),
  remote_order_id VARCHAR(100) NOT NULL,
  order_data      JSONB NOT NULL,                     -- teljes rendelés (snapshot)
  status          VARCHAR(20) DEFAULT 'new',
  invoice_id      INTEGER,                            -- FK invoicing
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Megjegyzés:** Az `api_key` és `api_secret` mezők titkosítottak (AES-256-GCM, kulcs ENV-ből). A lekérdezés → decrypt → API hívás → encrypt → mentés pattern kötelező.

---

## ÖSSZEFOGLALÓ — MODULOK ÉS BECSÜLT FEJLESZTÉSI IDŐ

| # | Modul | Táblák | API végpontok | UI oldalak | Becsült idő (AI) | Dependency |
|---|-------|--------|--------------|------------|-------------------|------------|
| 1 | `purchasing` | 3 | 11 | 3 (list, form, detail) | 3-4 óra | inventory |
| 2 | `pos` | 3 | 7 | 2 (POS felület, napi zárás) | 4-5 óra | inventory, invoicing |
| 3 | `crm` | 4 | 11 | 3 (list, detail, pipeline) | 3-4 óra | — |
| 4 | `worksheets` | 3 | 9 | 3 (list, form, detail) | 4-5 óra | inventory |
| 5 | `recipes` | 3 | 8 | 3 (list, form, production) | 3 óra | inventory |
| 6 | `appointments` | 2 | 7 | 2 (naptár, foglaláslista) | 2-3 óra | — |
| 7 | `projects` | 3 | 10 | 3 (list, kanban, detail) | 3-4 óra | — |
| 8 | `e-commerce` | 3 | 6 | 2 (connection setup, mapping) | 4-5 óra | inventory |

**Összesen: ~27-33 AI óra** az összes új modulra (nem napok, nem hetek — órák).

---

## IMPLEMENTÁLÁSI SORREND

> Lásd részletesen: [05-ROADMAP.md](./05-ROADMAP.md)

```
Phase 1 (M2): purchasing + pos    → Kiskereskedelem kiszolgálható
Phase 2 (M3): crm + worksheets   → Szolgáltatás/építőipar kiszolgálható
Phase 3 (M5): recipes + appointments + projects → Niche szektorok
Phase 4 (M6): e-commerce         → Digitális kereskedelem
```

MINDEN FÁZIS ELŐTT: frissíteni `modules/_loader.ts`, `lib/license/tiers.ts`, `i18n/*.json`, és ez a dokumentum is frissítendő ha változás van.

---

*Következő dokumentum: [05-ROADMAP.md](./05-ROADMAP.md) — Fejlesztési ütemterv és függőségek*
