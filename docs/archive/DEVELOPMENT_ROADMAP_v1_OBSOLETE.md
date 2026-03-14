# FEJLESZTÉSI ÜTEMTERV — Részletes táblázat és függőségi gráf

> **Verzió:** 1.0 | **Dátum:** 2026-03-14
> **Társdokumentumok:** EXPANSION_MASTER_PLAN.md, MODULE_TECHNICAL_SPEC.md, TECHNICAL_DEBT.md

---

## 1. PRE-FÁZIS: AZONNALI JAVÍTÁSOK (0. hét)

| # | Feladat | Fájl(ok) | Típus | Idő | Függőség |
|---|---------|----------|-------|-----|----------|
| P1 | `invoicing` hozzáadás TIER_MODULES.professional -hoz | `lib/license/tiers.ts` | Bugfix | 5 perc | — |
| P2 | `digital-twin` hozzáadás TIER_MODULES.enterprise -hoz | `lib/license/tiers.ts` | Bugfix | 5 perc | — |
| P3 | `sap-import` tier szinkronizálás (manifest ↔ tiers.ts) | `tiers.ts` + manifest | Bugfix | 5 perc | — |
| P4 | `lac-napi-perces` tisztázás: route törlés VAGY manifest visszakapcsolás | API routes + _loader | Cleanup | 15 perc | — |
| P5 | `api-gateway` stub manifest + "Coming Soon" | Új fájlok | Stub | 30 perc | — |
| P6 | `multi-site` stub manifest + "Coming Soon" | Új fájlok | Stub | 30 perc | — |

**Lezárási kritérium:** `tiers.ts` TIER_MODULES teljesen szinkronban a manifest-ekkel. Nincs szellemmodul, nincs árva route.

---

## 2. FÁZIS A: "KISKERESKEDŐ KÉPES" (1-3. hét)

### A1 — Starter tier bevezetés (1. hét, 1 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A1.1 | `LicenseTier` type bővítés: `starter` hozzáadás | `lib/license/index.ts` |
| A1.2 | `TIER_MODULES.starter` definíció: `['inventory', 'invoicing', 'reports', 'file-import']` | `lib/license/tiers.ts` |
| A1.3 | `TIER_MAX_USERS.starter = 3` | `lib/license/tiers.ts` |
| A1.4 | `TIER_LABELS.starter` + `TIER_COLORS.starter` | `lib/license/tiers.ts` |
| A1.5 | Admin modul lista → starter badge szín | `components/admin/modules/` |
| A1.6 | Landing page pricing → 4 oszlop | `app/(marketing)/page.tsx` |

### A2 — inventory bővítés (1. hét, 4 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A2.1 | ALTER TABLE migrációk (SKU, barcode, category_id, purchase_price, selling_price, margin, location, min/max stock, expiry, weight, vat_rate) | `modules/inventory/migrations/` |
| A2.2 | `inventory_categories` tábla (fa struktúra) | `modules/inventory/migrations/` |
| A2.3 | `inventory_stocktaking` + `_items` táblák (leltár) | `modules/inventory/migrations/` |
| A2.4 | `inventory_price_history` tábla (árváltozás napló) | `modules/inventory/migrations/` |
| A2.5 | Manifest bővítés: új adminSettings (barcode_enabled, categories_enabled) | `modules/inventory/manifest.ts` |
| A2.6 | API bővítés: keresés vonalkóddal, kategória CRUD, leltár CRUD | `modules/inventory/api/` |
| A2.7 | UI bővítés: SKU/barcode/kategória/ár mezők a termék form-ban | `modules/inventory/components/` |
| A2.8 | UI: Kategória fa nézet | `modules/inventory/components/CategoryTree.tsx` |
| A2.9 | UI: Leltár felület | `modules/inventory/components/Stocktaking.tsx` |
| A2.10 | i18n: ~40 új kulcs (hu/en/de) | `modules/inventory/i18n/` |
| A2.11 | `useBarcodeScanner` hook | `hooks/useBarcodeScanner.ts` |

### A3 — purchasing modul (2. hét, 5 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A3.1 | Manifest + _loader import | `modules/purchasing/manifest.ts`, `modules/_loader.ts` |
| A3.2 | 5 migration SQL (suppliers, orders, order_items, price_lists, receiving) | `modules/purchasing/migrations/` |
| A3.3 | API: suppliers CRUD | `modules/purchasing/api/suppliers.ts` |
| A3.4 | API: orders CRUD + megrendelés szám generátor | `modules/purchasing/api/orders.ts` |
| A3.5 | API: receiving → inventory_movements "in" + qty növelés | `modules/purchasing/api/receiving.ts` |
| A3.6 | API: price-lists CRUD | `modules/purchasing/api/price-lists.ts` |
| A3.7 | API: suggestions (alacsony készlet → javaslat) | `modules/purchasing/api/suggestions.ts` |
| A3.8 | UI: PurchasingDashboard | `modules/purchasing/components/PurchasingDashboard.tsx` |
| A3.9 | UI: SupplierManager + Form | `modules/purchasing/components/Supplier*.tsx` |
| A3.10 | UI: OrderEditor + List | `modules/purchasing/components/Order*.tsx` |
| A3.11 | UI: ReceivingForm | `modules/purchasing/components/ReceivingForm.tsx` |
| A3.12 | UI: SuggestionPanel | `modules/purchasing/components/SuggestionPanel.tsx` |
| A3.13 | i18n: ~80 kulcs (hu/en/de) | `modules/purchasing/i18n/` |
| A3.14 | Module gateway API route | `app/api/modules/purchasing/` (ha kell) |

### A4 — pos modul (2-3. hét, 5 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A4.1 | Manifest + _loader import | `modules/pos/manifest.ts`, `modules/_loader.ts` |
| A4.2 | 4 migration SQL (sessions, transactions, transaction_items, cash_movements) | `modules/pos/migrations/` |
| A4.3 | API: sessions (open/close) | `modules/pos/api/sessions.ts` |
| A4.4 | API: transactions (sale) → inventory "out" + invoicing | `modules/pos/api/transactions.ts` |
| A4.5 | API: refunds → inventory "in" + stornó | `modules/pos/api/refunds.ts` |
| A4.6 | API: cash-movements (deposit/withdrawal) | `modules/pos/api/cash-movements.ts` |
| A4.7 | API: daily-summary | `modules/pos/api/daily-summary.ts` |
| A4.8 | UI: PosTerminal (teljes képernyős kassza) | `modules/pos/components/PosTerminal.tsx` |
| A4.9 | UI: ProductGrid (gyakori termékek rács) | `modules/pos/components/ProductGrid.tsx` |
| A4.10 | UI: ProductSearch (név/vonalkód keresés) | `modules/pos/components/ProductSearch.tsx` |
| A4.11 | UI: Cart (kosár + összesítő) | `modules/pos/components/Cart.tsx` |
| A4.12 | UI: PaymentModal (fizetés mód + összeg) | `modules/pos/components/PaymentModal.tsx` |
| A4.13 | UI: DailySummary (napi zárás) | `modules/pos/components/DailySummary.tsx` |
| A4.14 | UI: RefundForm | `modules/pos/components/RefundForm.tsx` |
| A4.15 | POS keyboard shortcut rendszer (F1-F10) | `modules/pos/components/PosTerminal.tsx` |
| A4.16 | POS dashboard route | `app/dashboard/modules/pos/` |
| A4.17 | i18n: ~60 kulcs (hu/en/de) | `modules/pos/i18n/` |

### A5 — invoicing bővítés (3. hét, 2 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A5.1 | PDF engine adapter (`lib/export/pdf-engine.ts`) | `lib/export/pdf-engine.ts` |
| A5.2 | jsPDF implementáció (kliens-oldali PDF generálás) | `lib/export/pdf-engine.ts` |
| A5.3 | `pdf.ts` módosítás → adapter hívás | `lib/export/pdf.ts` |
| A5.4 | Számla email küldés (nodemailer) | `modules/invoicing/api/send-email.ts` |
| A5.5 | Számla email gomb az UI-n | `modules/invoicing/components/InvoiceActions.tsx` |

### A6 — Szektor preset (3. hét, 2 nap)

| Lépés | Feladat | Fájl |
|-------|---------|------|
| A6.1 | `SectorPreset` type definíció | `lib/sectors/presets.ts` |
| A6.2 | Preset definíciók (retail, service, manufacturing, food, construction) | `lib/sectors/presets.ts` |
| A6.3 | Setup wizard → szektor választó UI | `app/setup/page.tsx` |
| A6.4 | Szektor kiválasztás → modul aktiválás + beállítások | `app/setup/page.tsx` |
| A6.5 | Dashboard layout szektor-függő | `app/dashboard/page.tsx` |

### FÁZIS A — Lezárási kritériumok

```
✅ Starter tier aktív, 3 user limittel
✅ inventory: SKU, barcode, kategória, árazás, leltár működik
✅ purchasing: szállító CRUD, megrendelés, átvétel → raktár
✅ pos: kassza nyitás, eladás, fizetés, napi zárás, raktárlevonás
✅ invoicing: valódi PDF, email küldés
✅ szektor preset: setup-nál szektor választó
✅ 0 TypeScript hiba
✅ Alap tesztek lefedik a kritikus flow-kat
```

---

## 3. FÁZIS B: "SZOLGÁLTATÓ KÉPES" (4-6. hét)

### B1 — crm modul (4. hét, 5 nap)

| Lépés | Feladat |
|-------|---------|
| B1.1 | Manifest + _loader import |
| B1.2 | 5 migration SQL (contacts, interactions, pipeline, deals, tags) |
| B1.3 | API: contacts CRUD + keresés + szegmentáció |
| B1.4 | API: interactions CRUD |
| B1.5 | API: pipeline stages CRUD + default seed |
| B1.6 | API: deals CRUD + stage váltás |
| B1.7 | API: analytics (CLV számítás, szegmens statisztika) |
| B1.8 | UI: CrmDashboard (összesítő + pipeline preview) |
| B1.9 | UI: ContactList + ContactCard + ContactForm |
| B1.10 | UI: PipelineBoard (Kanban drag & drop) |
| B1.11 | UI: DealEditor + DealList |
| B1.12 | UI: InteractionLog (idővonal nézet) |
| B1.13 | UI: CrmAnalytics (diagramok) |
| B1.14 | i18n: ~90 kulcs (hu/en/de) |

### B2 — worksheets modul (5. hét, 4 nap)

| Lépés | Feladat |
|-------|---------|
| B2.1 | Manifest + _loader import |
| B2.2 | 4 migration SQL (entries, parts, labor, templates) |
| B2.3 | API: entries CRUD + státuszváltás |
| B2.4 | API: parts CRUD → inventory_movements (alkatrész levonás) |
| B2.5 | API: labor CRUD (munkaidő rögzítés) |
| B2.6 | API: templates CRUD |
| B2.7 | API: close → összeg számítás + számla generálás |
| B2.8 | UI: WorksheetDashboard + List + Editor |
| B2.9 | UI: PartSelector (inventory-ből keresés + kiválasztás) |
| B2.10 | UI: LaborEntry (munkaidő stopperóra) |
| B2.11 | UI: Nyomtatási nézet |
| B2.12 | i18n: ~50 kulcs (hu/en/de) |

### B3 — invoicing bővítés II (5. hét, 3 nap)

| Lépés | Feladat |
|-------|---------|
| B3.1 | `invoice_type` mező hozzáadás (normal, proforma, advance, recurring, credit_note) |
| B3.2 | Díjbekérő (proforma) logika — nem kap NAV sorszámot |
| B3.3 | Előlegszámla logika — végszámlánál levonás |
| B3.4 | `invoicing_recurring` tábla + CRUD + automatikus generálás |
| B3.5 | Fizetési emlékeztető email (lejárt boundary check) |
| B3.6 | Pénzügyi összesítő riport (árbevétel, kintlévőség, ÁFA negyedéves) |

### B4 — tracking bővítés (6. hét, 2 nap)

| Lépés | Feladat |
|-------|---------|
| B4.1 | Státusz workflow konfiguráció (admin settings → JSON) |
| B4.2 | Ügyfélértesítés státuszváltáskor (email + SSE) |
| B4.3 | Publikus nyomon követési link (nincs auth, UUID token) |

### B5 — reports sablonok (6. hét, 2 nap)

| Lépés | Feladat |
|-------|---------|
| B5.1 | 6-8 előre gyártott riport sablon szektoronként |
| B5.2 | Ütemezett riport email (havi/heti cron) |
| B5.3 | Dashboard widget riport eredmény |

### B6 — NAV Online Számla 3.0 (6. hét, 5 nap)

| Lépés | Feladat |
|-------|---------|
| B6.1 | NAV XML builder (invoiceData XML, XSD validáció) |
| B6.2 | NAV crypto (requestSignature: SHA3-512, SHA-256 chain) |
| B6.3 | NAV HTTP kliens (tokenExchange, manageInvoice, queryInvoiceStatus) |
| B6.4 | Teszt API integráció (api-test.onlineszamla.nav.gov.hu) |
| B6.5 | Hibakezelés (technicalAnnulment, error code mapping) |
| B6.6 | Admin beállítás: NAV technikai felhasználó adatok |

---

## 4. FÁZIS C: "PIAC KITERJESZTÉS" (7-12. hét)

### C1 — e-commerce szinkron modul (7-8. hét, 5 nap)
- WooCommerce REST API connector (termék + készlet szinkron)
- Shopify Admin API connector (termék + rendelés import)
- Webhooks: rendelés bevétel → inventory_movements

### C2 — recipes modul (8. hét, 3 nap)
- Recept → alapanyag szükséglet (bill of materials lite)
- Adag-alapú költségszámítás (inventory árak alapján)
- HACCP napló (opcionális)

### C3 — projects modul (9. hét, 4 nap)
- Projekt → feladatok → anyagfelhasználás → költségek → számla
- Gantt nézet (egyszerű idővonal)
- Alvállalkozó kezelés

### C4 — appointments modul (10. hét, 4 nap)
- Naptár nézet (heti/napi)
- Online foglalási felület (publikus link, nincs auth)
- Emlékeztető email/SMS (SMS provider: Twilio vagy Netpincér SMS)

### C5 — Többnyelvű számla (10. hét, 2 nap)
- Dupla oszlopos számla sablon (HU+EN / HU+DE)
- Deviza támogatás (EUR/USD árfolyam)

### C6 — PWA mobilbarát bővítés (11. hét, 5 nap)
- Service Worker bővítés (jelenleg minimal `sw.js`)
- Offline POS (LocalStorage queue → online sync)
- Készlet check mobilon (kamera vonalkód)

### C7 — Szektorspecifikus demók (12. hét, 2 nap)
- demo.ainova.hu/retail (csavarbolt demo)
- demo.ainova.hu/service (szerviz demo)
- Automatikus napi reset

---

## 5. FÜGGŐSÉGI GRÁF

```
[Pre-fázis: Tier bugfixek]
         │
         ▼
[A1: Starter tier] ────────────────────────────────┐
         │                                          │
         ▼                                          │
[A2: Inventory bővítés] ───────────┐                │
         │                         │                │
         ├──────────┐              │                │
         ▼          ▼              │                │
[A3: Purchasing] [A4: POS] ◀──────┘                │
         │          │                               │
         │          ├── függ: inventory              │
         │          ├── függ: invoicing              │
         │          │                               │
         ▼          ▼                               │
[A5: Invoicing PDF+Email] ◀────────────────────────┘
         │
         ▼
[A6: Szektor preset]
         │
         ▼
╔══════════════════════╗
║   FÁZIS A KÉSZ ✅    ║
╚══════════════════════╝
         │
    ┌────┼────┐
    ▼    ▼    ▼
[B1: CRM] [B2: Worksheets] [B3: Invoicing II]
    │       │                    │
    │       ├── függ: inventory  │
    │       ├── függ: invoicing  │
    │       │                    │
    ▼       ▼                    ▼
[B4: Tracking bővítés] [B5: Reports sablonok]
                   │
                   ▼
            [B6: NAV 3.0]
                   │
                   ▼
        ╔══════════════════════╗
        ║   FÁZIS B KÉSZ ✅    ║
        ╚══════════════════════╝
                   │
         ┌─────┬──┼──┬─────┐
         ▼     ▼  ▼  ▼     ▼
       [C1]  [C2][C3][C4] [C5]
        │                   │
        ▼                   ▼
      [C6: PWA]       [C7: Demo]
                   │
                   ▼
        ╔══════════════════════╗
        ║   FÁZIS C KÉSZ ✅    ║
        ╚══════════════════════╝
```

---

## 6. MÉRFÖLDKÖVEK ÉS GO/NO-GO DÖNTÉSI PONTOK

| Mérföldkő | Leírás | Go/No-Go kritérium |
|-----------|--------|-------------------|
| **M0** | Pre-fázis kész | Minden tier bugfix javítva, 0 szellemmodul |
| **M1** | Starter tier működik | Új regisztráció → starter license → 3 user → 4 modul |
| **M2** | Beszerzés + Raktár integrált | PO létrehozás → átvétel → raktár qty növekszik |
| **M3** | POS eladás működik | Kassza nyitás → eladás → raktár csökken → számla generálódik |
| **M4** | FÁZIS A KÉSZ | Mind a 6 alfeladat kész + tesztek zöldek |
| **M5** | CRM + Worksheets integrált | Deal → számla, Munkalap → alkatrész levonás → számla |
| **M6** | NAV Online Számla éles | Teszt API-n sikeres adatszolgáltatás |
| **M7** | FÁZIS B KÉSZ | Mind a 6 alfeladat kész + tesztek zöldek |
| **M8** | FÁZIS C KÉSZ | Webshop szinkron + PWA + demo site |

---

## 7. KOCKÁZATOK ÉS MITIGÁCIÓ

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|-------------|-------|-----------|
| PDF generálás Vercel-en nem működik (puppeteer nem fut Edge-en) | Magas | Közepes | jsPDF client-side fallback (Opció #1) |
| NAV API változás (v3.0 → v4.0) | Alacsony | Magas | Absztrakt adapter layer (nav-client.ts elkülönítve) |
| POS teljesítmény problémák (nagy termékkatalógus, lassú keresés) | Közepes | Közepes | Debounced keresés + termékcache + indexelés |
| Vonalkód szkenner kompatibilitás (nem minden USB szkenner) | Közepes | Alacsony | Kézi bevitel mindig elérhető, kamera fallback |
| Supabase limit (free tier 500MB DB) | Közepes | Magas | Fizetős Supabase plan VAGY Docker self-hosted |
| Mobil POS offline szinkron konfliktus | Magas | Közepes | "Last write wins" + conflict queue + manual resolve UI |

---

*Ez a dokumentum az EXPANSION_MASTER_PLAN.md ütemterv társdokumentuma. A fenti ütemterv a fejlesztés sorrendjét definiálja.*
