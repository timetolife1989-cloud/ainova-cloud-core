# Számlázás modul (Invoicing)

> ACI Számlázás modul — Magyar NAV-kompatibilis számlázó rendszer.  
> Tier: **Professional** | Függőség: `inventory`

## Áttekintés

A számlázás modul teljes magyar szabványú számlakezelést biztosít:
- Normál számla, sztornó, előlegszámla, díjbekérő
- 5 magyar ÁFA-kulcs (27%, 18%, 5%, TAM, AAM)
- Vevőkezelés (adószám, cím, kapcsolattartó)
- Készlet-integráció (automatikus készletmozgás kiállításkor/sztornókor)
- NAV Online Számla 3.0 integráció (stub, bővíthető)
- A4 nyomtatható számla (HTML → Print/PDF)
- Atomi sorszámozás (UPDLOCK/HOLDLOCK)

---

## Mappastruktúra

```
modules/invoicing/
├── manifest.ts                    # Modul regisztráció, jogosultságok, admin beállítások
├── migrations/
│   └── 001_invoicing.sql          # 5 MSSQL tábla (idempotens)
├── lib/
│   ├── vat-calculator.ts          # ÁFA motor (5 kulcs, HUF kerekítés)
│   ├── invoice-number.ts          # Atomi sorszámgenerátor
│   ├── pdf-generator.ts           # A4 HTML számla generátor
│   └── nav-adapter.ts             # NAV Online Számla 3.0 adapter (stub)
├── api/
│   ├── route.ts                   # GET: számlalista, POST: piszkozat létrehozás
│   ├── customers/
│   │   └── route.ts               # GET: vevőlista, POST: új vevő
│   └── [id]/
│       ├── route.ts               # GET: számla részletek, POST: akciók (issue/paid/storno)
│       └── pdf/
│           └── route.ts           # GET: nyomtatható HTML számla
└── components/
    ├── DashboardPage.tsx           # Fő nézet (lista, szűrők, összesítők)
    ├── InvoiceEditor.tsx           # Számla szerkesztő (vevőválasztó, tételek, ÁFA)
    └── CustomerManager.tsx         # Vevőkezelő (lista, új vevő modal)
```

---

## Adatbázis séma

### invoicing_customers
| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | INT IDENTITY PK | Azonosító |
| customer_name | NVARCHAR(200) | Vevő neve |
| tax_number | NVARCHAR(20) | Magyar adószám (12345678-1-12) |
| eu_tax_number | NVARCHAR(20) | EU adószám |
| address_zip | NVARCHAR(10) | Irányítószám |
| address_city | NVARCHAR(100) | Város |
| address_street | NVARCHAR(200) | Utca, házszám |
| address_country | NVARCHAR(2) DEFAULT 'HU' | Országkód |
| email | NVARCHAR(200) | E-mail cím |
| phone | NVARCHAR(50) | Telefonszám |
| contact_person | NVARCHAR(200) | Kapcsolattartó |
| notes | NVARCHAR(MAX) | Megjegyzés |
| is_active | BIT DEFAULT 1 | Aktív-e |
| created_at | DATETIME2 | Létrehozva |

### invoicing_number_sequence
| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | INT IDENTITY PK | Azonosító |
| prefix | NVARCHAR(10) | Számlaszám prefix (pl. ACI) |
| seq_year | INT | Év |
| last_number | INT | Utolsó sorszám |

UNIQUE(prefix, seq_year) constraint.

### invoicing_invoices
| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | INT IDENTITY PK | Azonosító |
| invoice_number | NVARCHAR(30) UNIQUE | Számlaszám (ACI-2026-00001) |
| invoice_type | NVARCHAR(20) | Típus: normal/storno/advance/proforma |
| storno_of_id | INT FK (self) | Sztornózott számla ID |
| customer_id | INT FK | Vevő ID |
| customer_name | NVARCHAR(200) | Vevő neve (snapshot) |
| customer_tax_number | NVARCHAR(20) | Adószám (snapshot) |
| customer_address | NVARCHAR(500) | Cím (snapshot) |
| issue_date | DATE | Számla kelte |
| fulfillment_date | DATE | Teljesítés dátuma |
| due_date | DATE | Fizetési határidő |
| payment_method | NVARCHAR(20) | Fizetési mód: cash/card/transfer |
| currency | NVARCHAR(3) DEFAULT 'HUF' | Pénznem |
| net_total | DECIMAL(18,2) | Nettó összesen |
| vat_total | DECIMAL(18,2) | ÁFA összesen |
| gross_total | DECIMAL(18,2) | Bruttó összesen |
| status | NVARCHAR(20) DEFAULT 'draft' | Státusz: draft/issued/paid/storno |
| nav_status | NVARCHAR(20) DEFAULT 'pending' | NAV státusz |
| nav_transaction_id | NVARCHAR(50) | NAV tranzakció ID |
| notes | NVARCHAR(MAX) | Megjegyzés |
| created_by | NVARCHAR(100) | Létrehozó |
| created_at / updated_at | DATETIME2 | Időbélyegek |

### invoicing_line_items
| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | INT IDENTITY PK | Azonosító |
| invoice_id | INT FK CASCADE | Számla ID |
| item_id | INT FK NULL | Készlet tétel ID (opcionális) |
| item_name | NVARCHAR(200) | Megnevezés |
| item_sku | NVARCHAR(50) | SKU kód |
| quantity | DECIMAL(18,4) | Mennyiség |
| unit_name | NVARCHAR(20) | Mértékegység |
| unit_price_net | DECIMAL(18,4) | Nettó egységár |
| vat_rate | DECIMAL(5,2) | ÁFA % |
| vat_rate_code | NVARCHAR(10) | ÁFA kód (27%, 18%, 5%, TAM, AAM) |
| line_net | DECIMAL(18,2) | Nettó sor összeg |
| line_vat | DECIMAL(18,2) | ÁFA sor összeg |
| line_gross | DECIMAL(18,2) | Bruttó sor összeg |
| sort_order | INT | Sorrend |

### invoicing_vat_summary
| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | INT IDENTITY PK | Azonosító |
| invoice_id | INT FK CASCADE | Számla ID |
| vat_rate_code | NVARCHAR(10) | ÁFA kulcs kód |
| vat_rate | DECIMAL(5,2) | ÁFA % |
| net_amount | DECIMAL(18,2) | Nettó |
| vat_amount | DECIMAL(18,2) | ÁFA |
| gross_amount | DECIMAL(18,2) | Bruttó |

---

## API végpontok

### Számla lista
```
GET /api/modules/invoicing/data
Query params: ?status=draft&customerId=1&dateFrom=2026-01-01&dateTo=2026-12-31&search=ACI
```

### Számla létrehozás (piszkozat)
```
POST /api/modules/invoicing/data
Headers: X-CSRF-Token
Body: {
  invoiceType: "normal",
  customerId: 1,
  fulfillmentDate: "2026-03-14",
  dueDate: "2026-03-22",       // opcionális, default: +8 nap
  paymentMethod: "cash",       // opcionális, default: admin beállítás
  notes: "Megjegyzés",
  lineItems: [
    { itemName: "M6 csavar", itemSku: "CSV-M6", quantity: 100,
      unitName: "db", unitPriceNet: 25, vatRateCode: "27%", vatRate: 27 }
  ]
}
```

### Számla részletek
```
GET /api/modules/invoicing/data/{id}
Response: { invoice: {...}, lineItems: [...], vatSummary: [...] }
```

### Számla akciók
```
POST /api/modules/invoicing/data/{id}
Headers: X-CSRF-Token
Body: { action: "issue" }       // issue | mark_paid | storno
```

- **issue**: piszkozat → kiállított (végleges sorszám, ÁFA összesítő, készletmozgás)
- **mark_paid**: kiállított → fizetve
- **storno**: kiállított/fizetve → sztornó (negatív tükörszámla, készlet visszatöltés)

### Nyomtatható számla
```
GET /api/modules/invoicing/data/{id}/pdf
Response: HTML (A4, print-ready, böngészőből Print → PDF)
```

### Vevők
```
GET /api/modules/invoicing/data/customers?search=Kovács
POST /api/modules/invoicing/data/customers
Body: { customerName: "Kovács Kft.", taxNumber: "12345678-1-12", ... }
```

---

## ÁFA kezelés

| Kód | Kulcs | Leírás |
|-----|-------|--------|
| 27% | 27% | Általános |
| 18% | 18% | Élelmiszer, vendéglátás |
| 5% | 5% | Alapvető élelmiszer, gyógyszer |
| TAM | 0% | Tárgyi adómentes |
| AAM | 0% | Alanyi adómentes |

HUF kerekítés: egész forintra (`Math.round`). Egyéb pénznem: 2 tizedes.

---

## Admin beállítások

Az Admin panel → Modulok → Számlázás menüben konfigurálható:

| Beállítás | Kulcs | Típus | Alapérték |
|-----------|-------|-------|-----------|
| Cégnév | company_name | string | — |
| Adószám | company_tax_number | string | — |
| Cím | company_address | string | — |
| Bankszámlaszám | company_bank_account | string | — |
| Számla prefix | invoicing_invoice_prefix | string | ACI |
| Fizetési határidő (nap) | invoicing_default_due_days | number | 8 |
| Fizetési mód | invoicing_default_payment_method | select | cash |
| Alapértelmezett ÁFA | invoicing_default_vat_rate | select | 27% - 27 |
| NAV engedélyezve | nav_enabled | boolean | false |
| NAV felhasználó | nav_user | string | — |
| NAV aláírás kulcs | nav_signature_key | string | — |
| NAV csere kulcs | nav_exchange_key | string | — |

---

## Jogosultságok

| Jogosultság | Leírás |
|-------------|--------|
| invoicing.view | Számlák megtekintése |
| invoicing.create | Számla létrehozás |
| invoicing.edit | Számla módosítás, akciók (kiállítás, fizetve) |
| invoicing.void | Számla sztornózás |
| invoicing.export | Számla export |

---

## Készlet integráció

- **Kiállításkor (issue)**: a készlethez kötött tételek automatikusan `out` mozgást kapnak (`inventory_movements`), az `inventory_items.current_qty` csökken.
- **Sztornókor (storno)**: az eredeti tételek `in` mozgást kapnak, a készlet visszatöltődik.
- A hivatkozás mező tartalmazza a számlaszámot (pl. `ACI-2026-00001` vagy `STORNO:ACI-2026-00002`).

---

## NAV Online Számla 3.0

Jelenleg **stub implementáció** — az adapter tud:
- Hitelesítő adatokat olvasni az admin beállításokból
- `nav_status` frissíteni (`pending`, `error`)
- Tranzakció ID-t generálni (placeholder)

Teljes implementációhoz szükséges:
- SHA3-512 kérés aláírás
- NAV XSD v3.0 szerinti XML generálás
- `manageInvoice` / `queryTransactionStatus` / `queryInvoiceData` hívások
- HTTPS POST a NAV szerverre (teszt: `https://api-test.onlineszamla.nav.gov.hu`)

---

## Számla életciklus

```
[Új számla] → draft (piszkozat)
    ↓ issue
[Kiállított] → issued (végleges sorszám, ÁFA összesítő, készletmozgás)
    ↓ mark_paid          ↓ storno
[Fizetve] → paid       [Sztornó] → storno (negatív tükörszámla)
    ↓ storno
[Sztornó] → storno
```

---

## UI használat

### Számla lista nézet
- Összesítő kártyák: Mai forgalom, Nyitott számlák, Összforgalom
- Szűrők: keresés (számlaszám/vevő), státusz
- Akció gombok soronként: Kiállítás (✓), PDF (🖨), Fizetve ($), Sztornó (⊘)

### Új számla
1. Válassz típust (normál/előleg/díjbekérő)
2. Válassz fizetési módot és dátumot
3. Válassz vevőt (keresés név/adószám alapján)
4. Adj hozzá tételeket (készletből vagy kézzel)
5. Ellenőrizd az ÁFA bontást
6. Mentsd piszkozatként → Később kiállíthatod

### Vevőkezelés
- Vevőlista kereséssel
- Új vevő: név (kötelező), adószám (8-1-2 formátum), cím, email, telefon
