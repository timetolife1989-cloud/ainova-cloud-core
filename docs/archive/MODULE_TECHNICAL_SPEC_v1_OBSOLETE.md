# MODUL-SZINTŰ TECHNIKAI TERV — Részletes fejlesztési specifikáció

> **Verzió:** 1.0 | **Dátum:** 2026-03-14
> **Társdokumentum:** [EXPANSION_MASTER_PLAN.md](./EXPANSION_MASTER_PLAN.md)
> **Szabály:** Minden modul a meglévő ACI minta alapján épül (`manifest.ts` + `migrations/` + `api/` + `components/` + `i18n/`)

---

## 1. ÚJ MODUL: `purchasing` (Beszerzés)

### 1.1 Fájlstruktúra

```
modules/purchasing/
├── manifest.ts                          # Modul regisztráció
├── migrations/
│   ├── 001_purchasing_suppliers.sql      # Szállítók tábla
│   ├── 002_purchasing_orders.sql         # Beszerzési megrendelések
│   ├── 003_purchasing_order_items.sql    # Megrendelés tételek
│   ├── 004_purchasing_price_lists.sql    # Szállítói árlisták
│   └── 005_purchasing_receiving.sql      # Átvétel
├── i18n/
│   ├── hu.json                          # Magyar fordítás (~80 kulcs)
│   ├── en.json                          # Angol fordítás
│   └── de.json                          # Német fordítás
├── api/                                 # Backend logika (app/api/modules gateway által hívva)
│   ├── suppliers.ts                     # Szállító CRUD
│   ├── orders.ts                        # Megrendelés CRUD + jóváhagyás
│   ├── receiving.ts                     # Átvétel → inventory_movements "in"
│   ├── price-lists.ts                   # Szállítói árlista kezelés
│   └── suggestions.ts                   # Automatikus rendelési javaslat
└── components/
    ├── PurchasingDashboard.tsx           # Főoldal (aktív rendelések, javaslatok)
    ├── SupplierManager.tsx              # Szállító lista + form
    ├── SupplierForm.tsx                 # Szállító szerkesztő
    ├── OrderEditor.tsx                  # Megrendelés szerkesztő (tételek + összeg)
    ├── OrderList.tsx                    # Megrendelés lista (szűrős, rendezős)
    ├── ReceivingForm.tsx                # Átvételi bizonylat
    ├── PriceListEditor.tsx              # Árlista szerkesztő
    └── SuggestionPanel.tsx              # Automatikus rendelési javaslat panel
```

### 1.2 Adatbázis — Részletes táblaszerkezet

```sql
-- 001_purchasing_suppliers.sql
CREATE TABLE purchasing_suppliers (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name    VARCHAR(255) NOT NULL,          -- "Festék Kft."
    tax_number      VARCHAR(20),                    -- "12345678-2-42"
    eu_vat_number   VARCHAR(20),                    -- "HU12345678"
    contact_name    VARCHAR(255),                    -- kapcsolattartó neve
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address_zip     VARCHAR(10),
    address_city    VARCHAR(100),
    address_street  VARCHAR(255),
    address_country VARCHAR(3) DEFAULT 'HUN',       -- ISO 3166-1 alpha-3
    bank_name       VARCHAR(100),
    bank_account    VARCHAR(50),                     -- IBAN
    payment_terms   INTEGER DEFAULT 30,              -- fizetési határidő (nap)
    currency        VARCHAR(3) DEFAULT 'HUF',
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchasing_suppliers_tax ON purchasing_suppliers(tax_number);
CREATE INDEX idx_purchasing_suppliers_active ON purchasing_suppliers(is_active);

-- 002_purchasing_orders.sql
CREATE TABLE purchasing_orders (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number    VARCHAR(30) NOT NULL UNIQUE,     -- "PO-2026-00001"
    supplier_id     UUID NOT NULL REFERENCES purchasing_suppliers(id),
    status          VARCHAR(20) DEFAULT 'draft',     -- draft → submitted → confirmed → received → cancelled
    order_date      TIMESTAMPTZ DEFAULT NOW(),
    expected_date   DATE,                            -- várható szállítási dátum
    subtotal        DECIMAL(15,2) DEFAULT 0,         -- nettó összeg
    vat_total       DECIMAL(15,2) DEFAULT 0,         -- ÁFA összeg
    grand_total     DECIMAL(15,2) DEFAULT 0,         -- bruttó összeg
    currency        VARCHAR(3) DEFAULT 'HUF',
    notes           TEXT,
    approved_by     UUID REFERENCES core_users(id),
    approved_at     TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES core_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchasing_orders_status ON purchasing_orders(status);
CREATE INDEX idx_purchasing_orders_supplier ON purchasing_orders(supplier_id);
CREATE INDEX idx_purchasing_orders_date ON purchasing_orders(order_date);

-- 003_purchasing_order_items.sql
CREATE TABLE purchasing_order_items (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id        UUID NOT NULL REFERENCES purchasing_orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES inventory_items(id),
    quantity        DECIMAL(15,3) NOT NULL,           -- megrendelt mennyiség
    unit_price      DECIMAL(15,2) NOT NULL,           -- egységár (nettó)
    vat_rate        DECIMAL(5,2) DEFAULT 27.00,       -- ÁFA kulcs (%)
    line_total      DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    received_qty    DECIMAL(15,3) DEFAULT 0,          -- eddig átvett mennyiség
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchasing_items_order ON purchasing_order_items(order_id);
CREATE INDEX idx_purchasing_items_product ON purchasing_order_items(product_id);

-- 004_purchasing_price_lists.sql
CREATE TABLE purchasing_price_lists (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id     UUID NOT NULL REFERENCES purchasing_suppliers(id),
    product_id      UUID NOT NULL REFERENCES inventory_items(id),
    unit_price      DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'HUF',
    min_quantity    DECIMAL(15,3) DEFAULT 1,           -- minimális rendelési mennyiség
    valid_from      DATE DEFAULT CURRENT_DATE,
    valid_until     DATE,
    is_preferred    BOOLEAN DEFAULT false,              -- elsődleges szállító e termékhez
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, product_id, valid_from)
);

CREATE INDEX idx_purchasing_prices_supplier ON purchasing_price_lists(supplier_id);
CREATE INDEX idx_purchasing_prices_product ON purchasing_price_lists(product_id);
CREATE INDEX idx_purchasing_prices_preferred ON purchasing_price_lists(is_preferred) WHERE is_preferred = true;

-- 005_purchasing_receiving.sql
CREATE TABLE purchasing_receiving (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id        UUID NOT NULL REFERENCES purchasing_orders(id),
    order_item_id   UUID NOT NULL REFERENCES purchasing_order_items(id),
    received_qty    DECIMAL(15,3) NOT NULL,
    received_date   TIMESTAMPTZ DEFAULT NOW(),
    warehouse_location VARCHAR(50),                    -- raktári hely (pl. "A-3-7")
    lot_number      VARCHAR(50),                       -- gyártási szám/lot
    expiry_date     DATE,                              -- lejárati dátum (ha van)
    quality_ok      BOOLEAN DEFAULT true,              -- minőségi ellenőrzés eredménye
    quality_notes   TEXT,
    inventory_movement_id UUID,                        -- → inventory_movements.id
    received_by     UUID NOT NULL REFERENCES core_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchasing_receiving_order ON purchasing_receiving(order_id);
```

### 1.3 Manifest

```typescript
// modules/purchasing/manifest.ts
import { registerModule } from '../_loader';

registerModule({
  id: 'purchasing',
  name: 'Beszerzés / Purchasing',
  version: '1.0.0',
  tier: 'starter',
  icon: 'ShoppingCart',
  category: 'operations',
  dependencies: ['inventory'],
  permissions: [
    'purchasing.view',
    'purchasing.create',
    'purchasing.edit',
    'purchasing.delete',
    'purchasing.approve',
    'purchasing.export'
  ],
  adminSettings: [
    {
      key: 'default_payment_terms',
      type: 'number',
      default: 30,
      label: 'Alapértelmezett fizetési határidő (nap)'
    },
    {
      key: 'auto_suggest_threshold',
      type: 'number',
      default: 20,
      label: 'Automatikus rendelési javaslat küszöb (%)'
    },
    {
      key: 'require_approval',
      type: 'boolean',
      default: false,
      label: 'Megrendelés jóváhagyás szükséges'
    },
    {
      key: 'order_number_prefix',
      type: 'string',
      default: 'PO',
      label: 'Megrendelés szám előtag'
    },
    {
      key: 'currency',
      type: 'string',
      default: 'HUF',
      label: 'Alapértelmezett pénznem'
    }
  ],
  migrations: [
    '001_purchasing_suppliers',
    '002_purchasing_orders',
    '003_purchasing_order_items',
    '004_purchasing_price_lists',
    '005_purchasing_receiving'
  ]
});
```

### 1.4 API Logika — Kulcsfolyamatok

#### Megrendelés létrehozás flow:
```
1. POST /api/modules/purchasing/orders
   { supplier_id, items: [{ product_id, quantity, unit_price, vat_rate }], notes }
   
2. Megrendelés száma automatikus: PO-{ÉV}-{SORSZÁM} (atomi, mint az invoicing)
   
3. Ha `require_approval` = true:
   → status = 'pending_approval'
   → Értesítés az approver-nek (notification rendszeren keresztül)
   
4. Ha `require_approval` = false:
   → status = 'submitted'
```

#### Átvételi flow:
```
1. POST /api/modules/purchasing/orders/{id}/receive
   { items: [{ order_item_id, received_qty, warehouse_location, lot_number, expiry_date, quality_ok }] }
   
2. Minden tételhez:
   a. purchasing_receiving INSERT
   b. purchasing_order_items.received_qty UPDATE (+= received_qty)
   c. inventory_movements INSERT { item_id, type: 'in', quantity: received_qty, reference: 'PO-2026-00001' }
   d. inventory_items.current_qty UPDATE (+=)
   
3. Ha MINDEN tétel átvéve (received_qty >= quantity):
   → purchasing_orders.status = 'received'
   
4. Ha RÉSZLEGES:
   → purchasing_orders.status = 'partially_received'
```

#### Automatikus rendelési javaslat:
```
1. GET /api/modules/purchasing/suggestions
   
2. Query:
   SELECT i.id, i.name, i.current_qty, i.min_stock_level, i.unit,
          pl.supplier_id, s.company_name, pl.unit_price
   FROM inventory_items i
   LEFT JOIN purchasing_price_lists pl ON pl.product_id = i.id AND pl.is_preferred = true
   LEFT JOIN purchasing_suppliers s ON s.id = pl.supplier_id
   WHERE i.current_qty <= i.min_stock_level * (threshold / 100)
   
3. Eredmény: lista termékekből, amelyek a küszöb alatt vannak,
   az elsődleges szállítóval és árral.
```

### 1.5 i18n kulcsok (hu.json minta)

```json
{
  "purchasing.title": "Beszerzés",
  "purchasing.suppliers": "Szállítók",
  "purchasing.suppliers.add": "Új szállító",
  "purchasing.suppliers.edit": "Szállító szerkesztése",
  "purchasing.suppliers.company_name": "Cégnév",
  "purchasing.suppliers.tax_number": "Adószám",
  "purchasing.suppliers.contact_name": "Kapcsolattartó",
  "purchasing.suppliers.payment_terms": "Fizetési határidő (nap)",
  "purchasing.orders": "Megrendelések",
  "purchasing.orders.add": "Új megrendelés",
  "purchasing.orders.edit": "Megrendelés szerkesztése",
  "purchasing.orders.number": "Megrendelés szám",
  "purchasing.orders.status": "Státusz",
  "purchasing.orders.status.draft": "Piszkozat",
  "purchasing.orders.status.submitted": "Elküldve",
  "purchasing.orders.status.confirmed": "Visszaigazolva",
  "purchasing.orders.status.partially_received": "Részben átvéve",
  "purchasing.orders.status.received": "Átvéve",
  "purchasing.orders.status.cancelled": "Törölve",
  "purchasing.orders.supplier": "Szállító",
  "purchasing.orders.expected_date": "Várható szállítás",
  "purchasing.orders.items": "Tételek",
  "purchasing.orders.add_item": "Tétel hozzáadása",
  "purchasing.orders.subtotal": "Nettó összeg",
  "purchasing.orders.vat_total": "ÁFA",
  "purchasing.orders.grand_total": "Bruttó összeg",
  "purchasing.orders.approve": "Jóváhagyás",
  "purchasing.orders.submit": "Megrendelés elküldése",
  "purchasing.receiving": "Átvétel",
  "purchasing.receiving.receive": "Átvétel rögzítése",
  "purchasing.receiving.quantity": "Átvett mennyiség",
  "purchasing.receiving.warehouse_location": "Raktári hely",
  "purchasing.receiving.lot_number": "Gyártási szám",
  "purchasing.receiving.expiry_date": "Lejárati dátum",
  "purchasing.receiving.quality_ok": "Minőségi ellenőrzés OK",
  "purchasing.price_lists": "Szállítói árlisták",
  "purchasing.price_lists.preferred": "Elsődleges szállító",
  "purchasing.suggestions": "Rendelési javaslatok",
  "purchasing.suggestions.below_threshold": "Készletszint a küszöb alatt",
  "purchasing.suggestions.create_order": "Megrendelés létrehozása",
  "purchasing.settings.default_payment_terms": "Alapértelmezett fizetési határidő",
  "purchasing.settings.auto_suggest_threshold": "Automatikus javaslat küszöb (%)",
  "purchasing.settings.require_approval": "Megrendelés jóváhagyás szükséges",
  "purchasing.settings.order_number_prefix": "Megrendelés szám előtag",
  "purchasing.settings.currency": "Alapértelmezett pénznem"
}
```

---

## 2. ÚJ MODUL: `pos` (Pénztár / Gyorsértékesítés)

### 2.1 Fájlstruktúra

```
modules/pos/
├── manifest.ts
├── migrations/
│   ├── 001_pos_sessions.sql
│   ├── 002_pos_transactions.sql
│   ├── 003_pos_transaction_items.sql
│   └── 004_pos_cash_movements.sql
├── i18n/
│   ├── hu.json
│   ├── en.json
│   └── de.json
├── api/
│   ├── sessions.ts
│   ├── transactions.ts
│   ├── refunds.ts
│   ├── cash-movements.ts
│   └── daily-summary.ts
└── components/
    ├── PosTerminal.tsx           # Teljes képernyős POS felület
    ├── ProductGrid.tsx           # Gyakori termékek rács (gyorsgombok)
    ├── ProductSearch.tsx          # Termék keresés (név/vonalkód/SKU)
    ├── Cart.tsx                  # Kosár (tételek, összeg)
    ├── PaymentModal.tsx          # Fizetés ablak (készpénz/kártya/átutalás)
    ├── ReceiptPreview.tsx        # Nyugta/Számla előnézet
    ├── DailySummary.tsx          # Napi zárás összesítő
    ├── CashMovementForm.tsx      # Pénzbetét/kivét
    ├── RefundForm.tsx            # Visszáru kezelés
    └── PosSettings.tsx           # POS beállítások
```

### 2.2 Adatbázis

```sql
-- 001_pos_sessions.sql
CREATE TABLE pos_sessions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_number  VARCHAR(20) NOT NULL UNIQUE,       -- "POS-2026-03-14-001"
    opened_by       UUID NOT NULL REFERENCES core_users(id),
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_by       UUID REFERENCES core_users(id),
    closed_at       TIMESTAMPTZ,
    opening_cash    DECIMAL(15,2) NOT NULL DEFAULT 0,  -- nyitó összeg
    closing_cash    DECIMAL(15,2),                     -- záró összeg (kézi számolás)
    expected_cash   DECIMAL(15,2),                     -- várt összeg (számított)
    cash_difference DECIMAL(15,2),                     -- eltérés
    status          VARCHAR(20) DEFAULT 'open',         -- open, closed
    total_sales     DECIMAL(15,2) DEFAULT 0,           -- összes eladás
    total_refunds   DECIMAL(15,2) DEFAULT 0,           -- összes visszáru
    transaction_count INTEGER DEFAULT 0,                -- tranzakciók száma
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX idx_pos_sessions_date ON pos_sessions(opened_at);

-- 002_pos_transactions.sql
CREATE TABLE pos_transactions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES pos_sessions(id),
    transaction_number VARCHAR(30) NOT NULL UNIQUE,     -- "TRX-2026-03-14-0001"
    type            VARCHAR(10) DEFAULT 'sale',         -- sale, refund
    customer_id     UUID REFERENCES invoicing_customers(id), -- opcionális ügyfél
    subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total     DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(20) NOT NULL,               -- cash, card, transfer, mixed
    cash_received   DECIMAL(15,2),                      -- fizetett összeg (készpénznél)
    cash_change     DECIMAL(15,2),                      -- visszajáró
    invoice_id      UUID REFERENCES invoicing_invoices(id), -- generált számla
    sold_by         UUID NOT NULL REFERENCES core_users(id),
    sold_at         TIMESTAMPTZ DEFAULT NOW(),
    voided          BOOLEAN DEFAULT false,
    void_reason     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(sold_at);
CREATE INDEX idx_pos_transactions_type ON pos_transactions(type);

-- 003_pos_transaction_items.sql
CREATE TABLE pos_transaction_items (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id  UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES inventory_items(id),
    product_name    VARCHAR(255) NOT NULL,               -- denormalizálva a gyorsaság miatt
    quantity        DECIMAL(15,3) NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,              -- eladási egységár (nettó)
    vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 27.00,
    discount_pct    DECIMAL(5,2) DEFAULT 0,
    line_total      DECIMAL(15,2) NOT NULL,              -- quantity * unit_price * (1 - discount_pct/100)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_items_transaction ON pos_transaction_items(transaction_id);
CREATE INDEX idx_pos_items_product ON pos_transaction_items(product_id);

-- 004_pos_cash_movements.sql
CREATE TABLE pos_cash_movements (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES pos_sessions(id),
    type            VARCHAR(10) NOT NULL,                -- deposit (betét), withdrawal (kivét)
    amount          DECIMAL(15,2) NOT NULL,
    reason          VARCHAR(255),                        -- "Váltópénz betét", "Bevétel elvitel"
    performed_by    UUID NOT NULL REFERENCES core_users(id),
    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_cash_session ON pos_cash_movements(session_id);
```

### 2.3 POS UI — Részletes layout terv

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⬛ ACI POS                              Kassza: NYITVA │ 14:35:22  │
│                                          Pénztáros: Kovács Anna     │
├──────────────────────────────┬───────────────────────────────────────┤
│ 🔍 Keresés (név/vonalkód)   │  🛒 KOSÁR                            │
│ ┌──────────────────────────┐ │  ┌─────────────────────────────────┐ │
│ │ [Csavar M6x30]  [Anya]  │ │  │ 3x Csavar M6x30    3×120=  360 │ │
│ │ [Fúró 6mm]   [Festék]   │ │  │ 1x Fúró 6mm HSS        1.290   │ │
│ │ [Csiszolópapír] [Ragasztó]│ │  │ 2x Ragasztó 50ml   2×890= 1.780│ │
│ │ [Bilincs]    [Szalag]    │ │  │                                 │ │
│ └──────────────────────────┘ │  │                                 │ │
│ ┌──────────────────────────┐ │  ├─────────────────────────────────┤ │
│ │ Keresési eredmények       │ │  │ Nettó:                  2.701  │ │
│ │ ▸ Csavar M6x30 (120 Ft)  │ │  │ ÁFA (27%):                729  │ │
│ │ ▸ Csavar M6x40 (140 Ft)  │ │  │ BRUTTÓ:               3.430    │ │
│ │ ▸ Csavar M8x50 (180 Ft)  │ │  ├─────────────────────────────────┤ │
│ └──────────────────────────┘ │  │ [💵 KÉSZPÉNZ] [💳 KÁRTYA]      │ │
│                              │  │ [🏦 ÁTUTALÁS] [🧾 SZÁMLA]      │ │
│                              │  │ [❌ TÖRLÉS]   [🖨️ NYUGTA]      │ │
├──────────────────────────────┴───────────────────────────────────────┤
│ ⏐ Napi forgalom: 47.320 Ft ⏐ Tranzakciók: 14 ⏐ Kassza: 82.500 Ft │
└──────────────────────────────────────────────────────────────────────┘
```

**Billentyűparancsok (keyboard shortcuts):**
- `F1` → keresés fókusz
- `F2` → mennyiség módosítás
- `F5` → készpénzes fizetés
- `F6` → kártyás fizetés
- `F8` → kosár törlés
- `F10` → napi zárás
- `Enter` → termék hozzáadás kosárhoz
- `Esc` → bezárás/vissza

### 2.4 Integráció az inventory + invoicing modulokkal

**Eladáskor:**
```
1. pos_transactions INSERT (sale)
2. pos_transaction_items INSERT (minden tétel)
3. FOREACH tétel:
   a. inventory_movements INSERT { item_id, type: 'out', quantity, reference: 'TRX-2026-03-14-0001' }
   b. inventory_items UPDATE SET current_qty = current_qty - quantity
4. HA vevő megadva ÉS számlát kér:
   a. invoicing_invoices INSERT (auto-populated from transaction)
   b. invoicing_invoice_items INSERT (from transaction items)
   c. invoicing_invoices UPDATE SET status = 'issued'
   d. pos_transactions UPDATE SET invoice_id = generated_invoice_id
5. pos_sessions UPDATE SET total_sales += grand_total, transaction_count += 1
```

**Visszárukor:**
```
1. pos_transactions INSERT (type = 'refund', linked to original transaction)
2. pos_transaction_items INSERT (visszáru tételek, negatív értékkel)
3. FOREACH tétel:
   a. inventory_movements INSERT { type: 'in', reference: 'REFUND-...' }
   b. inventory_items UPDATE SET current_qty += quantity
4. HA volt számla:
   a. Stornó számla generálás (invoicing_invoices INSERT, status = 'storno')
5. pos_sessions UPDATE SET total_refunds += amount
```

---

## 3. ÚJ MODUL: `crm` (Ügyfélkezelés)

### 3.1 Fájlstruktúra

```
modules/crm/
├── manifest.ts
├── migrations/
│   ├── 001_crm_contacts.sql
│   ├── 002_crm_interactions.sql
│   ├── 003_crm_pipeline.sql
│   ├── 004_crm_deals.sql
│   └── 005_crm_tags.sql
├── i18n/
│   ├── hu.json
│   ├── en.json
│   └── de.json
├── api/
│   ├── contacts.ts
│   ├── interactions.ts
│   ├── pipeline.ts
│   ├── deals.ts
│   └── analytics.ts
└── components/
    ├── CrmDashboard.tsx
    ├── ContactList.tsx
    ├── ContactCard.tsx
    ├── ContactForm.tsx
    ├── InteractionLog.tsx
    ├── PipelineBoard.tsx        # Kanban nézet
    ├── DealEditor.tsx
    ├── DealList.tsx
    ├── TagManager.tsx
    └── CrmAnalytics.tsx         # CLV, szegmentáció
```

### 3.2 Adatbázis

```sql
-- 001_crm_contacts.sql
CREATE TABLE crm_contacts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id     UUID REFERENCES invoicing_customers(id),  -- opcionális összekötés
    type            VARCHAR(20) DEFAULT 'company',  -- company, person
    company_name    VARCHAR(255),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    mobile          VARCHAR(50),
    website         VARCHAR(255),
    address_zip     VARCHAR(10),
    address_city    VARCHAR(100),
    address_street  VARCHAR(255),
    segment         VARCHAR(50),                     -- vip, regular, occasional, new
    source          VARCHAR(50),                     -- walk-in, web, referral, advertisement
    lifetime_value  DECIMAL(15,2) DEFAULT 0,        -- CLV (automatikusan számított)
    last_interaction TIMESTAMPTZ,
    next_followup   TIMESTAMPTZ,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_contacts_segment ON crm_contacts(segment);
CREATE INDEX idx_crm_contacts_followup ON crm_contacts(next_followup) WHERE next_followup IS NOT NULL;
CREATE INDEX idx_crm_contacts_customer ON crm_contacts(customer_id) WHERE customer_id IS NOT NULL;

-- 002_crm_interactions.sql
CREATE TABLE crm_interactions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL,             -- call, email, meeting, note, offer
    direction       VARCHAR(10) DEFAULT 'outbound',   -- inbound, outbound
    subject         VARCHAR(255),
    description     TEXT,
    outcome         VARCHAR(50),                      -- positive, neutral, negative, no_answer
    duration_min    INTEGER,                           -- percben (telefonhívás hossza)
    performed_by    UUID NOT NULL REFERENCES core_users(id),
    performed_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_interactions_contact ON crm_interactions(contact_id);
CREATE INDEX idx_crm_interactions_date ON crm_interactions(performed_at);

-- 003_crm_pipeline.sql
CREATE TABLE crm_pipeline_stages (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,            -- "Lead", "Ajánlat elküldve", "Tárgyalás", "Megnyerve", "Elveszett"
    position        INTEGER NOT NULL,                 -- sorrend a Kanban boardon
    color           VARCHAR(7),                       -- #hex szín
    is_won          BOOLEAN DEFAULT false,            -- ez a "megnyerve" szakasz?
    is_lost         BOOLEAN DEFAULT false,            -- ez az "elveszett" szakasz?
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 004_crm_deals.sql
CREATE TABLE crm_deals (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,            -- "Festék rendelés - XY Kft."
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id),
    stage_id        UUID NOT NULL REFERENCES crm_pipeline_stages(id),
    value           DECIMAL(15,2),                    -- becsült üzleti érték
    currency        VARCHAR(3) DEFAULT 'HUF',
    probability     INTEGER DEFAULT 50,               -- nyerési esély (%)
    expected_close  DATE,                             -- várható lezárás
    actual_close    DATE,                             -- tényleges lezárás
    won             BOOLEAN,
    lost_reason     TEXT,
    assigned_to     UUID REFERENCES core_users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX idx_crm_deals_assigned ON crm_deals(assigned_to);

CREATE TABLE crm_deal_items (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id         UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES inventory_items(id),
    description     VARCHAR(255),
    quantity        DECIMAL(15,3) DEFAULT 1,
    unit_price      DECIMAL(15,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 005_crm_tags.sql
CREATE TABLE crm_tags (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    color           VARCHAR(7) DEFAULT '#3B82F6',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crm_contact_tags (
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);
```

### 3.3 Pipeline alapértelmezett szakaszok

```
1. "Lead"             → #94A3B8 (szürke)      → automatikusan létrejön
2. "Kapcsolatfelvétel" → #3B82F6 (kék)
3. "Ajánlat elküldve"  → #F59E0B (sárga)
4. "Tárgyalás"         → #8B5CF6 (lila)
5. "Megnyerve"         → #10B981 (zöld)       → is_won = true
6. "Elveszett"          → #EF4444 (piros)      → is_lost = true
```

---

## 4. ÚJ MODUL: `worksheets` (Munkalapok)

### 4.1 Fájlstruktúra

```
modules/worksheets/
├── manifest.ts
├── migrations/
│   ├── 001_worksheets_entries.sql
│   ├── 002_worksheets_parts.sql
│   ├── 003_worksheets_labor.sql
│   └── 004_worksheets_templates.sql
├── i18n/
│   ├── hu.json
│   ├── en.json
│   └── de.json
├── api/
│   ├── entries.ts
│   ├── parts.ts
│   ├── labor.ts
│   ├── templates.ts
│   └── close.ts                # Munkalap lezárás → számla generálás
└── components/
    ├── WorksheetDashboard.tsx
    ├── WorksheetList.tsx
    ├── WorksheetEditor.tsx
    ├── PartSelector.tsx          # Alkatrész kiválasztó (inventory-ből)
    ├── LaborEntry.tsx            # Munkaidő rögzítés
    ├── WorksheetTemplate.tsx     # Sablon szerkesztő
    └── WorksheetPrint.tsx        # Nyomtatási nézet
```

### 4.2 Adatbázis

```sql
-- 001_worksheets_entries.sql
CREATE TABLE worksheets_entries (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worksheet_number VARCHAR(30) NOT NULL UNIQUE,     -- "WS-2026-00001"
    customer_id     UUID REFERENCES invoicing_customers(id),
    customer_name   VARCHAR(255),                      -- denormalizálva (ha nincs ügyfél rekord)
    title           VARCHAR(255) NOT NULL,             -- "Fúrógép javítás"
    description     TEXT,                              -- probléma leírás
    resolution      TEXT,                              -- megoldás leírás
    status          VARCHAR(20) DEFAULT 'open',        -- open, in_progress, completed, invoiced, cancelled
    priority        VARCHAR(10) DEFAULT 'normal',      -- low, normal, high, urgent
    assigned_to     UUID REFERENCES core_users(id),    -- technikus
    estimated_hours DECIMAL(5,2),                      -- becsült munkaidő
    actual_hours    DECIMAL(5,2),                      -- tényleges munkaidő (labor-ból számított)
    parts_total     DECIMAL(15,2) DEFAULT 0,           -- alkatrész költség összesen
    labor_total     DECIMAL(15,2) DEFAULT 0,           -- munkadíj összesen
    grand_total     DECIMAL(15,2) DEFAULT 0,           -- összes költség
    invoice_id      UUID REFERENCES invoicing_invoices(id), -- generált számla
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    template_id     UUID,                              -- ha sablonból készült
    created_by      UUID NOT NULL REFERENCES core_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worksheets_status ON worksheets_entries(status);
CREATE INDEX idx_worksheets_customer ON worksheets_entries(customer_id);
CREATE INDEX idx_worksheets_assigned ON worksheets_entries(assigned_to);
CREATE INDEX idx_worksheets_date ON worksheets_entries(created_at);

-- 002_worksheets_parts.sql
CREATE TABLE worksheets_parts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worksheet_id    UUID NOT NULL REFERENCES worksheets_entries(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES inventory_items(id),
    product_name    VARCHAR(255) NOT NULL,
    quantity        DECIMAL(15,3) NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,
    line_total      DECIMAL(15,2) NOT NULL,
    deducted        BOOLEAN DEFAULT false,             -- raktárból levonva?
    inventory_movement_id UUID,                        -- → inventory_movements.id
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worksheets_parts_ws ON worksheets_parts(worksheet_id);

-- 003_worksheets_labor.sql
CREATE TABLE worksheets_labor (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worksheet_id    UUID NOT NULL REFERENCES worksheets_entries(id) ON DELETE CASCADE,
    technician_id   UUID NOT NULL REFERENCES core_users(id),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    hours           DECIMAL(5,2),                      -- számított VAGY kézi
    hourly_rate     DECIMAL(15,2) NOT NULL,            -- óradíj
    line_total      DECIMAL(15,2),                     -- hours × hourly_rate
    description     VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worksheets_labor_ws ON worksheets_labor(worksheet_id);

-- 004_worksheets_templates.sql
CREATE TABLE worksheets_templates (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,             -- "Fúrógép javítás"
    description     TEXT,
    default_parts   JSONB,                             -- [{product_id, quantity}]
    default_hours   DECIMAL(5,2),
    default_hourly_rate DECIMAL(15,2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Munkalap lezárás → számla flow

```
1. PATCH /api/modules/worksheets/{id}/close
   
2. worksheets_entries UPDATE SET status = 'completed', completed_at = NOW()
   
3. FOREACH parts WHERE NOT deducted:
   a. inventory_movements INSERT { type: 'out', reference: 'WS-2026-00001' }
   b. inventory_items UPDATE SET current_qty -= quantity
   c. worksheets_parts UPDATE SET deducted = true
   
4. Összeg kiszámítás:
   parts_total = SUM(worksheets_parts.line_total)
   labor_total = SUM(worksheets_labor.line_total)
   grand_total = parts_total + labor_total
   
5. HA ügyfél van ÉS számlázás kell:
   a. invoicing_invoices INSERT:
      - customer_id = worksheet.customer_id
      - items = parts + labor tételek
   b. invoicing_invoice_items INSERT (alkatrészek + munkadíj sorok)
   c. worksheets_entries UPDATE SET invoice_id = ..., status = 'invoiced'
```

---

## 5. MEGLÉVŐ MODUL BŐVÍTÉS: `inventory` — Részletes spec

### 5.1 Új táblák / tábla módosítások

```sql
-- inventory_items BŐVÍTÉS (ALTER TABLE)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku VARCHAR(50);               -- vonalkód/cikkszám
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);           -- EAN-13 vonalkód
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category_id UUID;              -- kategória FK
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);        -- termékkép URL
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(15,2);  -- beszerzési ár
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS selling_price DECIMAL(15,2);   -- eladási ár
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS margin_pct DECIMAL(5,2);       -- haszonkulcs %
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(50);-- raktári hely
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(15,3) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS max_stock_level DECIMAL(15,3);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 27.00;

CREATE INDEX idx_inventory_items_sku ON inventory_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id) WHERE category_id IS NOT NULL;

-- Új tábla: inventory_categories (kategóriák, fa szerkezet)
CREATE TABLE inventory_categories (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    parent_id       UUID REFERENCES inventory_categories(id),  -- NULL = gyökér kategória
    position        INTEGER DEFAULT 0,
    icon            VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_categories_parent ON inventory_categories(parent_id);

-- Új tábla: inventory_stocktaking (leltár)
CREATE TABLE inventory_stocktaking (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stocktaking_date DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'in_progress',  -- in_progress, completed
    notes           TEXT,
    performed_by    UUID NOT NULL REFERENCES core_users(id),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Leltár tételek
CREATE TABLE inventory_stocktaking_items (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stocktaking_id  UUID NOT NULL REFERENCES inventory_stocktaking(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES inventory_items(id),
    system_qty      DECIMAL(15,3) NOT NULL,             -- rendszerbeli mennyiség
    counted_qty     DECIMAL(15,3),                      -- leszámolt mennyiség
    difference      DECIMAL(15,3),                      -- eltérés
    adjustment_movement_id UUID,                        -- korrekciós mozgás
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stocktaking_items_st ON inventory_stocktaking_items(stocktaking_id);

-- Új tábla: inventory_price_history (árváltozás napló)
CREATE TABLE inventory_price_history (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id      UUID NOT NULL REFERENCES inventory_items(id),
    price_type      VARCHAR(10) NOT NULL,               -- purchase, selling
    old_price       DECIMAL(15,2),
    new_price       DECIMAL(15,2) NOT NULL,
    changed_by      UUID NOT NULL REFERENCES core_users(id),
    changed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON inventory_price_history(product_id);
```

### 5.2 Vonalkód rendszer spec

**Támogatott vonalkód típusok:**
| Típus | Formátum | Használat |
|-------|----------|-----------|
| EAN-13 | 13 számjegy | Szupermarket szabvány, meglévő termékek |
| EAN-8 | 8 számjegy | Kis termékek |
| Code 128 | Alfanumerikus | Belső cikkszámok, raktári helyek |
| QR Code | 2D mátrix | Mobilos letapogatás, URL-es azonosítás |

**Vonalkód beolvasás módjai:**
1. **USB szkenner** → `keydown` event listener (a szkenner billentyűzet-módban működik, gyorsan "begépeli" a kódot + Enter)
2. **Kamera** → `navigator.mediaDevices.getUserMedia()` + `@niclasmattsson/barcode-reader` vagy `@niclasmattsson/quagga2`
3. **Kézi bevitel** → Cikkszám/vonalkód mező, Enter-re keresés

**Implementáció:** Egy `useBarcodeScanner()` React hook:
```typescript
// hooks/useBarcodeScanner.ts
// Figyeli a gyors billentyű input-ot (< 50ms/karakter) → szkenner felismerés
// Callback: onScan(barcode: string) → termék keresés inventory_items.barcode VAGY .sku
```

---

## 6. `invoicing` BŐVÍTÉS — RÉSZLETES SPEC

### 6.1 PDF generálás (rendszeres)

**Jelenlegi:** `lib/export/pdf.ts` → `generatePdfHtml()` → HTML string
**Cél:** Valódi PDF Response (`Content-Type: application/pdf`)

**Adapter minta:**
```typescript
// lib/export/pdf-engine.ts
interface PdfEngine {
  htmlToPdf(html: string, options: PdfOptions): Promise<Buffer>;
}

class JsPdfEngine implements PdfEngine {
  // Kliens-oldali: jsPDF + html2canvas
}

class PuppeteerEngine implements PdfEngine {  
  // Szerver-oldali: puppeteer.launch() → page.setContent(html) → page.pdf()
}

// Konfiguráció: PDF_ENGINE env variable
const engine = process.env.PDF_ENGINE === 'puppeteer'
  ? new PuppeteerEngine()
  : new JsPdfEngine();
```

### 6.2 Számla típusok bővítés

```sql
ALTER TABLE invoicing_invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'normal';
-- Értékek: normal, proforma, advance, recurring, credit_note
```

| Típus | Kód | NAV köteles | Leírás |
|-------|-----|------------|--------|
| Normál számla | `normal` | ✅ | Szokásos számla |
| Díjbekérő | `proforma` | ❌ | Proforma — nem számla, nincs sorszám NAV-ban |
| Előlegszámla | `advance` | ✅ | Előleg számla — végszámlánál levonandó |
| Ismétlődő | `recurring` | ✅ | Havi automatikus generálás |
| Jóváíró számla | `credit_note` | ✅ | Negatív összegű (részleges korrekcióhoz) |

### 6.3 Ismétlődő számlázás

```sql
CREATE TABLE invoicing_recurring (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id     UUID NOT NULL REFERENCES invoicing_customers(id),
    frequency       VARCHAR(20) NOT NULL,              -- monthly, quarterly, yearly
    day_of_month    INTEGER DEFAULT 1,                 -- melyik napon generáljon
    template_items  JSONB NOT NULL,                    -- [{description, quantity, unit_price, vat_rate}]
    next_generate   DATE NOT NULL,
    last_generated  DATE,
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES core_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Cron logika:**
```
// Napi ellenőrzés (API route vagy cron job)
// GET /api/modules/invoicing/recurring/process
// 1. SELECT * FROM invoicing_recurring WHERE is_active = true AND next_generate <= CURRENT_DATE
// 2. FOREACH:
//    a. Számla generálás (invoicing_invoices INSERT)
//    b. next_generate = következő dátum (frequency alapján)
//    c. last_generated = CURRENT_DATE
//    d. Email küldés (ha be van állítva)
```

### 6.4 NAV Online Számla 3.0 — Fejlesztési tervezet

**Jelenlegi:** `modules/invoicing/api/nav-adapter.ts` — STUB (üres implementáció)

**Szükséges lépések:**
```
1. NAV API regisztráció (technikai felhasználó igénylés)
2. ManageInvoice XML generálás → XSD validáció
3. SHA3-512 hash számítás
4. HTTPS request (teszt: api-test.onlineszamla.nav.gov.hu)
5. TOKEN kérés → queryInvoiceStatus → response feldolgozás
6. Hibakezelés (technical annulment, error codes)
```

**Fájlok:**
```
modules/invoicing/
├── api/
│   ├── nav-adapter.ts         # MEGLÉVŐ stub → kiélesítendő
│   ├── nav-xml-builder.ts     # XML generálás (invoiceData, invoiceSummary)
│   ├── nav-crypto.ts          # requestSignature (SHA3-512 + SHA-256)
│   └── nav-client.ts          # HTTP kliens (token exchange, manage, query)
```

---

## 7. CORE BŐVÍTÉSEK SPECIFIKÁCIÓ

### 7.1 Szektor preset rendszer

```
lib/sectors/
├── presets.ts          # Szektor definíciók
├── setup-wizard.ts     # Setup flow bővítés
└── demo-seeds/
    ├── retail.ts       # Kiskereskedelmi demo adatok
    ├── service.ts      # Szolgáltatási demo adatok
    ├── food.ts         # Vendéglátási demo adatok
    └── manufacturing.ts# Gyártási demo adatok (jelenlegi)
```

**Preset típus:**
```typescript
interface SectorPreset {
  id: string;                    // 'retail', 'service', 'manufacturing', ...
  name: Record<string, string>;  // { hu: 'Kiskereskedelem', en: 'Retail', de: 'Einzelhandel' }
  icon: string;                  // Lucide icon neve
  modules: string[];             // aktiválandó modulok
  dashboardWidgets: string[];    // dashboard widget-ek sorrendje
  sampleProducts?: Product[];    // opcionális demo termékek
  sampleCustomers?: Customer[];  // opcionális demo vevők
  settings: Record<string, any>; // alapértelmezett beállítások
}
```

### 7.2 Starter tier implementáció

**Módosítandó fájlok részletesen:**

| Fájl | Módosítás |
|------|-----------|
| `lib/license/tiers.ts` | `TIER_MODULES.starter = [...]`, `TIER_MAX_USERS.starter = 3`, `TIER_LABELS`, `TIER_COLORS` |
| `lib/license/index.ts` | `LicenseTier` type bővítés: `'starter' \| 'basic' \| 'professional' \| 'enterprise'` |
| `lib/license/tiers.ts` TIER_MODULES | `invoicing` → professional-ba, `digital-twin` → enterprise-ba (hiánypótlás) |
| `components/admin/modules/` | ModuleToggle tier badge → starter szín |
| `app/(marketing)/page.tsx` | Pricing szekció → 4 oszlopos (Starter bekerül) |
| `app/setup/page.tsx` | Szektor választó bővítés |
| `database/core/` | Seed script → starter demo user |

### 7.3 Ár update — HUF központú árazás

| Tier | EUR | HUF | USD | Max user |
|------|-----|-----|-----|----------|
| Starter | €25 | 9.900 Ft | $27 | 3 |
| Basic | €50 | 19.900 Ft | $55 | 10 |
| Professional | €130 | 49.900 Ft | $140 | 50 |
| Enterprise | €260 | 99.900 Ft | $280 | ∞ |

---

## 8. i18n BŐVÍTÉS — Várható kulcsmennyiség

| Modul | hu.json kulcsok | en.json | de.json |
|-------|----------------|---------|---------|
| purchasing | ~80 | ~80 | ~80 |
| pos | ~60 | ~60 | ~60 |
| crm | ~90 | ~90 | ~90 |
| worksheets | ~50 | ~50 | ~50 |
| inventory bővítés | ~40 | ~40 | ~40 |
| invoicing bővítés | ~30 | ~30 | ~30 |
| core (sectors, starter) | ~20 | ~20 | ~20 |
| **Összesen** | **~370** | **~370** | **~370** |

**Jelenlegi kulcsszám:** 1.143 (hu/en/de)
**Bővítés utáni kulcsszám:** ~1.513

---

## 9. ÖSSZEFOGLALÓ — FÁJLOK INVENTÁRA

### Új fájlok (létrehozandó)

| # | Fájl | Típus | Sor (becsült) |
|---|------|-------|---------------|
| 1 | `modules/purchasing/manifest.ts` | Modul regisztráció | 60 |
| 2 | `modules/purchasing/migrations/001-005.sql` | SQL | 120 |
| 3 | `modules/purchasing/api/suppliers.ts` | API | 150 |
| 4 | `modules/purchasing/api/orders.ts` | API | 250 |
| 5 | `modules/purchasing/api/receiving.ts` | API | 200 |
| 6 | `modules/purchasing/api/price-lists.ts` | API | 120 |
| 7 | `modules/purchasing/api/suggestions.ts` | API | 80 |
| 8 | `modules/purchasing/components/*.tsx` (8 db) | UI | 800 |
| 9 | `modules/purchasing/i18n/*.json` (3 db) | i18n | 240 |
| 10 | `modules/pos/manifest.ts` | Modul regisztráció | 50 |
| 11 | `modules/pos/migrations/001-004.sql` | SQL | 100 |
| 12 | `modules/pos/api/*.ts` (5 db) | API | 400 |
| 13 | `modules/pos/components/*.tsx` (10 db) | UI | 1200 |
| 14 | `modules/pos/i18n/*.json` (3 db) | i18n | 180 |
| 15 | `modules/crm/manifest.ts` | Modul regisztráció | 60 |
| 16 | `modules/crm/migrations/001-005.sql` | SQL | 150 |
| 17 | `modules/crm/api/*.ts` (5 db) | API | 400 |
| 18 | `modules/crm/components/*.tsx` (10 db) | UI | 1000 |
| 19 | `modules/crm/i18n/*.json` (3 db) | i18n | 270 |
| 20 | `modules/worksheets/manifest.ts` | Modul regisztráció | 50 |
| 21 | `modules/worksheets/migrations/001-004.sql` | SQL | 100 |
| 22 | `modules/worksheets/api/*.ts` (5 db) | API | 300 |
| 23 | `modules/worksheets/components/*.tsx` (7 db) | UI | 700 |
| 24 | `modules/worksheets/i18n/*.json` (3 db) | i18n | 150 |
| 25 | `lib/sectors/presets.ts` | Core | 100 |
| 26 | `lib/export/pdf-engine.ts` | Core | 80 |
| 27 | `hooks/useBarcodeScanner.ts` | Hook | 60 |
| **Összesen** | | | **~7.070 sor** |

### Módosítandó fájlok (meglévő)

| # | Fájl | Módosítás |
|---|------|-----------|
| 1 | `lib/license/tiers.ts` | Starter tier + hiánypótlás |
| 2 | `lib/license/index.ts` | LicenseTier type bővítés |
| 3 | `modules/_loader.ts` | 4 új modul import |
| 4 | `modules/inventory/migrations/` | ALTER TABLE-ek |
| 5 | `modules/inventory/manifest.ts` | Új adminSettings (SKU, barcode, category) |
| 6 | `modules/inventory/components/*.tsx` | Bővítés (SKU mező, kategória, ár mezők) |
| 7 | `modules/inventory/api/*.ts` | Bővítés (keresés vonalkóddal, kategória szűrés) |
| 8 | `modules/invoicing/manifest.ts` | invoice_type, recurring támogatás |
| 9 | `modules/invoicing/api/*.ts` | Bővítés (proforma, advance, recurring) |
| 10 | `modules/invoicing/components/*.tsx` | Típus választó, ismétlődő beállítás |
| 11 | `lib/export/pdf.ts` | PDF engine adapter hívás |
| 12 | `app/(marketing)/page.tsx` | Starter tier + szektor kiválasztó |
| 13 | `app/setup/page.tsx` | Szektor preset wizard |
| 14 | `app/dashboard/page.tsx` | Szektor-alapú widget layout |
| **Összesen** | | **~14 fájl** |

---

## 10. TESZTELÉSI TERV

| # | Teszt | Típus | Leírás |
|---|-------|-------|--------|
| 1 | Purchasing CRUD | Unit | Szállító + rendelés létrehozás/módosítás/törlés |
| 2 | Purchasing → Inventory | Integration | Átvétel → inventory_movements + qty növelés |
| 3 | POS eladás | Integration | Eladás → inventory csökkenés + számla generálás |
| 4 | POS kassza zárás | Integration | Nyitás → eladások → zárás → összesítő |
| 5 | POS visszáru | Integration | Visszáru → inventory visszaírás + stornó számla |
| 6 | CRM deal pipeline | Unit | Deal létrehozás + stage váltás + lezárás |
| 7 | Worksheet → Invoice | Integration | Munkalap lezárás → alkatrész levonás + számla |
| 8 | PDF generálás | Unit | HTML → PDF buffer (`jsPDF` / `puppeteer`) |
| 9 | Vonalkód keresés | Unit | SKU/barcode keresés → termék találat |
| 10 | Starter tier | Integration | 3 user limit + modul korlátozás |
| 11 | Szektor preset | Integration | Szektor választás → modul aktiválás |
| 12 | Purchasing javaslat | Unit | Alacsony készlet → helyes javaslat lista |
| 13 | Ismétlődő számla | Integration | next_generate check → számla generálás |
| 14 | Leltár korrekció | Integration | counted_qty ≠ system_qty → adjustment movement |

---

*Ez a dokumentum az EXPANSION_MASTER_PLAN.md technikai társdokumentuma. A fenti specifikációk a fejlesztés alapját képezik.*
