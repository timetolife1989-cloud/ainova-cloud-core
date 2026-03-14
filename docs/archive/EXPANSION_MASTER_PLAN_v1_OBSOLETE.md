# ACI EXPANSION MASTER PLAN — Piacbővítés Kis- és Középvállalkozások Felé

> **Verzió:** 2.0 | **Dátum:** 2026-03-14
> **Cél:** Az Ainova Cloud Intelligence átalakítása gyártás-központúból univerzális KKV-platformmá
> **Elv:** NEM refaktor — additív bővítés. Minden meglévő gyártási funkció marad, de új szektorokat és célpiacokat is lefedünk.

---

## 0. A PROBLÉMA

### 0.1 Jelenlegi állapot

Az ACI jelenleg **18 modulból** áll, ebből **17 aktív**, és szinte **mindegyik gyártási célú**:
- OEE (Overall Equipment Effectiveness) → gyári gépek
- PLC Connector → ipari vezérlők
- Digital Twin → gyári layout
- Quality Control (8D) → autóipari minőségbiztosítás
- Shift Management → üzemi műszakok
- Performance → gyártási KPI
- Scheduling → gyártási kapacitás

Ez egy **~15.000 fős célpiacot** jelent Magyarországon (gyártó KKV-k).

### 0.2 A kimaradó piac

**Magyarországon ~1.808.000 regisztrált vállalkozás van** (KSH, 2024):
- **~645.000** egyéni vállalkozó
- **~400.000** Kft.
- **~72.000** Bt.
- **~9.000** Rt.

Ebből a **kereskedelmi, szolgáltatási, vendéglátási és kisipari szektor** (csavarboltok, festékboltok, szervizek, autóalkatrész-kereskedők, virágboltok, fodrászok, autómosók, kávézók, pékségek, stb.) **több százezres piac**, akik:
- Excel-ben vagy papíron vezetik a raktárt
- Kézzel írják a számlákat (vagy Billingo/Számlázz.hu de a raktárral nincs összekötve)
- Nincs egységes rendszerük (5 különálló szoftver)
- Nem tudják, melyik termék fogy leggyorsabban
- Nem látják a pénzügyi összesítőt valós időben
- Nem kapnak figyelmeztetést alacsony készletről

### 0.3 A piaci rés

| Szegmens | Méret (HU) | Jelenlegi megoldás | ACI potenciál |
|----------|-----------|-------------------|---------------|
| Csavarbolt, vasedénybolt, szerszámbolt | ~5.000 | Excel + kézi számla | Raktár + Beszerzés + POS + Számla |
| Festékbolt, barkácsbolt | ~3.000 | Papír vagy régi DOS program | Raktár + Vétel + Eladás + Számla |
| Autóalkatrész kereskedés | ~2.000 | Drága szaksoftver | Raktár + Katalógus + Számla |
| Szerviz, műhely (autó, gép, IT) | ~15.000 | Papír munkalap | Munkalap + Alkatrész + Számla |
| Webshop kiegészítés (WooCommerce, Shopify) | ~10.000 | Külön rendszer | Raktár szinkron + Többcsatornás |
| Vendéglátás, kávézó, pékség | ~25.000 | Kézi bevételezés | Alapanyag raktár + Recept + Eladás |
| Fodrász, kozmetikus, szolgáltató | ~30.000 | Naptár app | Időpontfoglalás + Ügyfél + Számla |
| Mezőgazdasági kistermelő | ~8.000 | Semmi | Készlet + Vevők + Számla |
| Építőipari kiscég | ~12.000 | Excel | Projektköltség + Anyag + Számla |
| **ÖSSZESEN** | **~110.000+** | | |

**A jelenlegi ~15.000-es célpiac helyett ~125.000 potenciális vevő** — ez **8x-os piacbővülés**.

---

## 1. STRATÉGIA — "UNIVERZÁLIS KKV PLATFORM"

### 1.1 Kulcsüzenet

> **ACI = Minden ami kell egy kis cégnek, egyetlen helyen.**
> Raktár. Vevők. Beszerzés. Számlázás. Riportok. — Minden modulárisan, annyiért amennyire szükséged van.

### 1.2 Szektorok definíciója

Az ACI-t **szektorok** (industry presets) szerint kell pozícionálni:

| Szektor kód | Név | Modulok | Tier |
|-------------|-----|---------|------|
| `manufacturing` | Gyártás (jelenlegi) | OEE, PLC, Quality, Shift, Performance, Scheduling | Enterprise |
| `retail` | Kiskereskedelem | Inventory+, POS, Purchasing, Invoicing, Customer CRM | Professional |
| `wholesale` | Nagykereskedelem | Inventory+, Purchasing, Invoicing, Delivery, B2B Portal | Professional |
| `service` | Szolgáltatás | Worksheets, Scheduling+, Customer CRM, Invoicing | Professional |
| `food` | Vendéglátás/Élelmiszer | Recipe, Inventory+, Cost Calculator, HACCP log | Professional |
| `construction` | Építőipar | Projects, Material Tracking, Invoicing, Subcontractors | Professional |
| `agriculture` | Mezőgazdaság | Crop/Herd tracking, Inventory, Seasonal reports | Basic+ |

### 1.3 Tier-módosítás — "Starter" csomag bevezetése

**Probléma:** A jelenlegi Basic csomag €80/hó — ez egy csavarboltnak **drága**.

**Megoldás:** Új, legolcsóbb **Starter** csomag:

| Csomag | Ár (HUF/hó) | Ár (EUR/hó) | User | Célja |
|--------|-------------|-------------|------|-------|
| **Starter** ÚJ! | 9.900 Ft | ~€25 | 3 | 1-3 fős mikrovállalkozás |
| **Basic** | 19.900 Ft | ~€50 | 10 | Kisvállalkozás 3-10 fő |
| **Professional** | 49.900 Ft | ~€130 | 50 | Közepes cég 10-50 fő |
| **Enterprise** | 99.900 Ft | ~€260 | ∞ | Gyártó üzem, multi-site |

**Starter csomag tartalma:**
- `inventory` (raktárkezelés)
- `invoicing` (számlázás)
- `reports` (alap riportok)
- `file-import` (Excel import)
- Max 3 felhasználó

Ez a **legfontosabb üzleti döntés**: 9.900 Ft/hó-ért egy komplett raktár+számla rendszer — a Billingo előfizetés önmagában ennyi, és ott nincs raktár.

---

## 2. MI VAN, MI HIÁNYZIK — MODUL RÉTERKÉP

### 2.1 Meglévő modulok szektoronkénti relevanciája

| Modul | Gyártás | Kiskeresk. | Nagykeresk. | Szolgáltatás | Vendéglátás |
|-------|---------|-----------|------------|-------------|-------------|
| workforce | ✅ | ✅ | ✅ | ✅ | ✅ |
| tracking | ✅ (rendelés) | ✅ (rendelés) | ✅ | ✅ (munkalap) | — |
| fleet | ✅ | — | ✅ | ✅ (szerviz) | — |
| reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| file-import | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory | ✅ (alapanyag) | ✅ (áru) | ✅ (áru) | ✅ (alkatrész) | ✅ (alapanyag) |
| invoicing | ✅ | ✅ | ✅ | ✅ | ✅ |
| delivery | ✅ | — | ✅ | — | — |
| performance | ✅ | — | — | ✅ (kpi) | — |
| scheduling | ✅ | — | — | ✅ (időpont?) | — |
| oee | ✅ | — | — | — | — |
| plc-connector | ✅ | — | — | — | — |
| shift-management | ✅ | ✅ (bolt) | ✅ | — | ✅ |
| quality | ✅ | — | — | — | ✅ (HACCP?) |
| maintenance | ✅ | — | — | ✅ (gépek) | ✅ (berendezés) |
| digital-twin | ✅ | — | — | — | — |
| sap-import | ✅ | — | — | — | — |

### 2.2 Hiányzó modulok — piacbővítéshez KELL

| # | Modul ID | Modul név | Szektor | Leírás | Prioritás |
|---|----------|-----------|---------|--------|-----------|
| 1 | `purchasing` | Beszerzés | MIND | Beszerzési rendelések, szállító nyilvántartás, árajánlatok, automatikus rendelés alacsony készletnél | 🔴 KRITIKUS |
| 2 | `pos` | POS / Pénztár | Kiskeresk. | Gyorsértékesítés (kasszás mód), vonalkód/QR olvasó, napi zárás, fiókpénz | 🔴 KRITIKUS |
| 3 | `crm` | Ügyfélkezelés (CRM) | MIND | Ügyfél életciklus, értékesítési csővezeték, ajánlatok, emlékeztetők, hűségprogram | 🟡 FONTOS |
| 4 | `worksheets` | Munkalapok | Szolgáltatás | Szerviz/munkalap kezelés, alkatrész felhasználás, munkaidő, ügyfélhez kötés | 🟡 FONTOS |
| 5 | `e-commerce` | Webshop Szinkron | Kiskeresk./Nagykeresk. | WooCommerce/Shopify raktárkészlet szinkron, rendelés importálás | 🟢 KÉSŐBB |
| 6 | `recipes` | Receptúrák | Vendéglátás | Recept → alapanyag szükséglet kalkuláció, adag-alapú költségszámítás | 🟢 KÉSŐBB |
| 7 | `projects` | Projektkezelés | Építőipar/Szolgáltatás | Projekt → feladatok → költségek → anyagfelhasználás → számla | 🟢 KÉSŐBB |
| 8 | `appointments` | Időpontfoglalás | Szolgáltatás | Online foglalási felület, naptár, emlékeztető SMS/email | 🟢 KÉSŐBB |

---

## 3. RÉSZLETES ÚJ MODUL SPECIFIKÁCIÓK

### 3.1 🔴 `purchasing` — Beszerzés modul

**Miért kritikus:** Raktár van, számla van, de NINCS BESZERZÉS. A bolt/gyár beszerez árut (csavar, festék, alapanyag), de jelenleg nincs hová rögzíteni a vételt. Az inventory_movements-be "in" mozgást kell rögzíteni, de nincs hozzá szállító, ár, rendelés.

**Táblák:**
```
purchasing_suppliers        — szállítók (név, adószám, cím, bankszámla, kontakt)
purchasing_orders           — megrendelések (szállító, státusz, összeg, dátum)
purchasing_order_items      — megrendelés tételei (termék, mennyiség, egységár)
purchasing_price_lists      — szállítói árlisták (termék × szállító × ár)
purchasing_receiving        — átvétel (megrendelés → raktár mozgás)
```

**Funkcionalitás:**
1. Szállítók nyilvántartása (CRUD, adószám validáció, kontaktok)
2. Beszerzési megrendelés létrehozása (szállítóválasztás → termékek → mennyiség → ár)
3. Automatikus rendelési javaslat alacsony készlet alapján (`inventory.low_stock_alert`)
4. Átvétel → automatikus `inventory_movements` "in" bejegyzés + készletnövelés
5. Szállítói ártörténet (melyik szállítónál mennyiért vettük korábban)
6. Beszerzési összesítő riport (havi/éves vásárlás szállítónként, termékenként)

**API végpontok:**
- `GET/POST /api/modules/purchasing/suppliers` — szállítók
- `GET/POST /api/modules/purchasing/orders` — megrendelések
- `POST /api/modules/purchasing/orders/{id}/receive` — átvétel + raktárba könyvelés
- `GET /api/modules/purchasing/suggestions` — automatikus rendelési javaslatok

**Adminbeállítások:**
- `default_payment_terms` (fizetési feltétel, alapértelmezett)
- `auto_suggest_threshold` (készletszint %, ami alatt javasol)
- `require_approval` (igényel-e jóváhagyást a megrendelés)
- `currency` (valuta)

**Jogosultságok:** `purchasing.view`, `purchasing.create`, `purchasing.edit`, `purchasing.approve`, `purchasing.export`

**Függőségek:** `inventory` (követelmény)

**Tier:** Starter+

---

### 3.2 🔴 `pos` — Pénztár / Gyorsértékesítés modul

**Miért kritikus:** Egy csavarbolt kasszásnál NEM akar számla-szerkesztőt megnyitni minden eladásnál. Kell egy gyors, kattintásos értékesítési felület.

**Táblák:**
```
pos_sessions          — kassza nyitás/zárás (nyitó pénz, záró pénz, felhasználó)
pos_transactions      — eladások (tételek, összeg, fizetési mód, időpont)
pos_transaction_items — eladás tételek (termék, mennyiség, ár, áfa)
pos_cash_movements    — pénzmozgások (betét, kivét, váltópénz)
```

**Funkcionalitás:**
1. **Kassza nyitás** → nyitó összeg megadása
2. **Termék keresés** → név/cikkszám/vonalkód alapján (billentyűzet vagy kézi szkenner)
3. **Kosár** → tételek hozzáadása, mennyiség módosítás, törlés
4. **Fizetés** → készpénz (visszajáró számítás) / bankkártya / átutalás
5. **Nyugta/Számla** → automatikus számla generálás + nyomtatás
6. **Raktárlevonás** → automatikus `inventory_movements` "out" + `inventory_items.current_qty` csökkentés
7. **Napi zárás** → kassza záró összeg, eltérés riport, napi összesítő nyomtatás
8. **Visszáru** → termék visszavétel, készlet visszaírás, stornó számla

**UI:** Teljes képernyős POS felület (NEM a szokásos dashboard, hanem kassza-optimalizált):
- Bal oldal: termék kereső + gyakori termékek rács
- Jobb oldal: kosár + összesítő + fizetés gombok
- Alsó sor: státuszsor (kassza állapot, bejelentkezett felhasználó)

**API végpontok:**
- `POST /api/modules/pos/sessions/open` — kassza nyitás
- `POST /api/modules/pos/sessions/close` — kassza zárás + napi összesítő
- `POST /api/modules/pos/transactions` — eladás rögzítése
- `POST /api/modules/pos/transactions/{id}/refund` — visszáru
- `GET /api/modules/pos/daily-summary` — napi összesítő

**Integráció:**
- `inventory` → raktárlevonás
- `invoicing` → számla generálás
- vonalkód/QR olvasó (browser `navigator.mediaDevices` vagy USB szkenner input)

**Jogosultságok:** `pos.view`, `pos.sell`, `pos.refund`, `pos.close_register`, `pos.export`

**Függőségek:** `inventory`, `invoicing`

**Tier:** Starter+

---

### 3.3 🟡 `crm` — Ügyfélkezelés modul

**Miért fontos:** A `invoicing_customers` tábla jelenleg minimális. Egy igazi CRM:
- Ügyfélhez rendelt korábbi vásárlások/számlák történet
- Értékesítési csővezeték (lead → ajánlat → megrendelés → számla)
- Automatikus emlékeztetők (lejárt számla, régóta nem vásárolt)
- Ügyfél szegmentáció (VIP, rendszeres, alkalmi)

**Táblák:**
```
crm_contacts            — kibővített ügyfélprofil (megjegyzések, kategória, utolsó kapcsolat)
crm_interactions        — interakciók naplója (telefon, email, személyes, ajánlat)
crm_pipeline_stages     — értékesítési csővezeték szakaszai (konfigurálható)
crm_deals               — üzleti lehetőségek (lead → deal → won/lost)
crm_deal_items          — deal tételek (termékek, szolgáltatások)
crm_tags                — címkék (VIP, rendszeres, stb.)
crm_contact_tags        — kapcsolat-címke M2M
```

**Funkcionalitás:**
1. Ügyfélkártya → összes korábbi számla, vásárlás, interakció egy helyen
2. Pipeline nézet (Kanban board) → deal-ek vizuális követése
3. Emlékeztetők → "Hívd fel X-et, 30 napja nem vásárolt"
4. Ügyfél életciklus érték (CLV) → automatikus számítás a korábbi számlák alapján
5. Hűségprogram → vásárlás után pontgyűjtés, kedvezmény

**Függőségek:** `invoicing` (opcionális, de a számla-történet innen jön)

**Tier:** Professional

---

### 3.4 🟡 `worksheets` — Munkalapok modul

**Miért fontos:** Szervizek, javítóműhelyek, IT karbantartók munkát végeznek, amelyhez munkalapot kell kitölteni (ügyfél, probléma, megoldás, felhasznált alkatrészek, munkaidő, számla).

**Táblák:**
```
worksheets_entries       — munkalap (ügyfél, leírás, státusz, technikus, kezdés/végzés)
worksheets_parts         — felhasznált alkatrészek (termék az inventory-ből, mennyiség)
worksheets_labor         — munkaidő bejegyzések (technikus, óra, óradíj)
worksheets_templates     — munkalap sablonok (ismétlődő munkákhoz)
```

**Funkcionalitás:**
1. Munkalap nyitása → ügyfél kiválasztás, probléma leírás
2. Alkatrész felhasználás → raktárból kikönyvelés
3. Munkaidő rögzítés → óradíj számítás
4. Munkalap lezárás → automatikus számla generálás (anyag + munkadíj)
5. Sablonok → gyakori munkákhoz előre kitöltött alkatrészlista

**Függőségek:** `inventory`, `invoicing` (mindkettő opcionális)

**Tier:** Professional

---

## 4. MEGLÉVŐ MODULOK BŐVÍTÉSE — KKV SZEKTORRA

### 4.1 `inventory` — Raktár bővítés

**Jelenlegi:** Egyszerű készletnyilvántartás (termék, mennyiség, mozgások).

**Bővítés kis cégek számára:**
| # | Funkció | Leírás | Becslés |
|---|---------|--------|---------|
| 1 | **Vonalkód/Cikkszám (SKU)** | Minden termékhez egyedi vonalkód generálás, vonalkód-címke nyomtatás | 2 nap |
| 2 | **Kategória rendszer** | Termékkategóriák (faszerkezet: Főkategória > Alkategória > Termék) | 1 nap |
| 3 | **Termékképek** | Fotó feltöltés termékekhez (max 3 kép) | 1 nap |
| 4 | **Árazás** | Beszerzési ár, eladási ár, haszonkulcs automatikus számítás | 1 nap |
| 5 | **Raktári helyek** | Polc/sor/oszlop azonosítás (pl. "A-3-7") | 1 nap |
| 6 | **Lejárati dátum kezelés** | FIFO/FEFO, lejárat figyelmeztetés | 1 nap |
| 7 | **Leltározás** | Fizikai leltár → eltérés kimutatás → korrekciós mozgás | 2 nap |
| 8 | **Többes mértékegység** | 1 karton = 12 db, átváltási arány | 1 nap |
| 9 | **Min/Max készlet** | Automatikus figyelmeztetés alacsony + túl magas készletnél | 0,5 nap |
| 10 | **Árváltozás napló** | Értékesítési ár előzmények, ki mikor módosította | 0,5 nap |

### 4.2 `invoicing` — Számlázás bővítés

**Jelenlegi:** Magyar NAV-kompatibilis számlázás, 5 ÁFA kulcs, atomi sorszám, A4 HTML.

**Bővítés:**
| # | Funkció | Leírás | Becslés |
|---|---------|--------|---------|
| 1 | **Valódi PDF generálás** | HTML → PDF konverzió (puppeteer VAGY jsPDF) — ne csak "nyomtatásra optimalizált HTML" legyen | 2 nap |
| 2 | **Díjbekérő (proforma)** | Proforma számla típus — nem NAV köteles, de nyomtatható | 1 nap |
| 3 | **Előlegszámla** | Előleg számlázás, végszámlánál az előleg levonása | 2 nap |
| 4 | **Ismétlődő számla** | Havi automatikus számla generálás (bérleti díjak, szolgáltatások) | 2 nap |
| 5 | **Számla sablon** | Eltérő számla design-ok (komolyabb fejléc, logó pozíció, stb.) | 1 nap |
| 6 | **Email számlaküldés** | Számla kiállítás → automatikus email a vevőnek PDF melléklettel | 1 nap |
| 7 | **Fizetési emlékeztető** | Lejárt határidejű számlák → automatikus emlékeztető email | 1 nap |
| 8 | **Pénzügyi összesítő** | Árbevétel, kintlévőség, ÁFA összesítő riport negyedéves bontásban | 1 nap |
| 9 | **Deviza támogatás** | EUR/USD számlázás → árfolyam, kétnyelvű számla | 2 nap |
| 10 | **NAV Online Számla 3.0** | A jelenlegi stub kiélesítése (XML generálás, SHA3-512, adatszolgáltatás) | 5 nap |

### 4.3 `tracking` — Nyomon követés bővítés

A tracking modul jelenleg "task tracking" gyártási kontextusban. **Átpozicionálás:**
- **Kiskeresk.:** Vevői megrendelés nyomon követés
- **Szolgáltatás:** Munka/projekt státusz követés
- **Szállítás:** Csomag nyomon követés

**Bővítés:** Konfiguráció-alapú státuszok (az admin settings-ben már van `statuses` string → JSON), de kellene:
- Státusz workflow (pl. "Megrendelt" → "Feldolgozás alatt" → "Kész" → "Kiadott")
- Ügyfélértesítés státuszváltáskor (email/SSE)
- Publikus nyomon követési link (vevő számára, bejelentkezés nélkül)

### 4.4 `reports` — Riportok bővítés

**Jelenlegi:** SQL-alapú riport szerkesztő, mentés, megjelenítés.

**Bővítés:**
| # | Funkció |
|---|---------|
| 1 | **Előre gyártott riport sablonok** szektoronként (napi bevétel, havi forgalom, termék TOP 10, ügyfél rangsor, készletérték) |
| 2 | **Ütemezett riport** → automatikus email küldés (hétfő reggel, hó elseje) |
| 3 | **Dashboard widget** → riport eredmény direkt a dashboardon |
| 4 | **Összehasonlító riport** → előző hónap/év vs. jelenlegi |

---

## 5. TECHNIKAI ÉPÍTŐKOCKÁK — CORE FEJLESZTÉSEK

### 5.1 PDF generálás megoldása (RENDSZERSZINTŰ)

**Probléma:** Jelenleg az "export PDF" csak HTML-t generál, amit a böngésző `window.print()` funkcióval tud PDF-be menteni. Ez NEM valódi PDF.

**Megoldások prioritás szerint:**

| # | Megoldás | Előny | Hátrány | Becslés |
|---|---------|-------|---------|---------|
| 1 | **jsPDF + html2canvas** (client-side) | Nincs server dependency, azonnal működik | Limitált stíluskezelés, lassú nagy tábláknál | 1 nap |
| 2 | **@react-pdf/renderer** (server-side) | Szép eredmény, React komponensek | JSX-ben kell definiálni a layoutot, nem HTML-ből | 2 nap |
| 3 | **Puppeteer / Playwright** (server-side) | Pixel-perfect, HTML-ből renderel | ~150MB dependency, Vercel-en nem fut (Edge limit) | 3 nap |
| 4 | **Got + html-pdf-node** (lightweight) | Kis méret, server-side | Chromium-free alternatíva, limitáltabb | 1 nap |
| 5 | **External API** (pdf.co, CloudConvert) | Nincs szerver teher | Fizetős, offline nem működik | 0,5 nap |

**Javaslat:** **#1 (jsPDF)** Vercel/Cloud esetén + **#3 (Puppeteer)** Docker/on-premise esetén. Az adapter pattern (mint a DB) itt is működhet:
```
PDF_ENGINE=jspdf     → client-side, Vercel-en
PDF_ENGINE=puppeteer → server-side, Docker-ben
```

### 5.2 `Starter` tier hozzáadása a licencrendszerhez

**Fájl:** `lib/license/tiers.ts`

```
starter: ['inventory', 'invoicing', 'reports', 'file-import']  // ÚJ
TIER_MAX_USERS.starter = 3
TIER_COLORS.starter = 'bg-amber-600'
TIER_LABELS.starter = 'Starter'
```

**Módosítandó fájlok:**
- `lib/license/tiers.ts` — új tier definíció
- `lib/license/index.ts` — LicenseInfo type bővítés
- `modules/invoicing/manifest.ts` — tier: 'starter' (lecsökkentés)
- Admin UI: module toggle panel, license panel
- Landing page: pricing táblázat

### 5.3 Szektor preset rendszer

**Koncepció:** Első beállításnál (setup wizard) a felhasználó kiválasztja a szektort, és az alapján:
1. Automatikusan aktiválódnak a releváns modulok
2. A dashboard testreszabott nézetben jelenik meg
3. A demo adatok szektorspecifikusak
4. A súgó szövegek kontextuálisak

**Fájl:** Új `lib/sectors/presets.ts`:
```typescript
export const SECTOR_PRESETS = {
  manufacturing: { modules: [...], dashboardLayout: '...', demoSeed: '...' },
  retail: { modules: [...], dashboardLayout: '...', demoSeed: '...' },
  service: { modules: [...], dashboardLayout: '...', demoSeed: '...' },
  ...
};
```

### 5.4 Vonalkód-rendszer

**Modul:** `inventory` bővítés

**Implementáció:**
1. `barcode-generator` npm package → SVG vonalkód generálás (EAN-13, Code128, QR)
2. `react-barcode-reader` → USB szkenner input kezelés
3. Vonalkód nyomtatás → címke sablon (Zebra-kompatibilis ZPL VAGY A4-es ívpapír)
4. Készlet mozgásnál vonalkód alapján termék azonosítás

### 5.5 `invoicing` vs `purchasing` összekötés

**Logika:**
```
Beszerzés (purchasing) → raktár be (inventory "in") → eladás (pos/invoicing) → raktár ki (inventory "out")
```

Ez a Beszerzés → Raktár → Eladás **háromszög** teszi az ACI-t használhatóvá a kiskereskedők számára.

### 5.6 Tier-registráció gap javítás

**Probléma azonosítva:** Az `invoicing` és `digital-twin` modulok manifest-jukban Professional/Enterprise tier-ként vannak definiálva, DE a `tiers.ts` TIER_MODULES listájában NEM szerepelnek. Csak license `modules_allowed` JSON override-dal működnek.

**Javítandó:** Mindkettőt be kell rakni a `TIER_MODULES` megfelelő szintjére.

---

## 6. FEJLESZTÉSI FÁZISOK — PRIORITÁSOS ÜTEMTERV

### 🔴 FÁZIS A — "Kiskereskedő képes" (2-3 hét)

| # | Feladat | Típus | Becslés |
|---|---------|-------|---------|
| A1 | Starter tier bevezetése (`tiers.ts`, license, admin, landing) | Tier | 1 nap |
| A2 | Tier registráció gap javítás (invoicing, digital-twin bekerül TIER_MODULES-be) | Bugfix | 0,5 nap |
| A3 | `inventory` bővítés: SKU/vonalkód, kategóriák, árazás, képek | Modul bővítés | 4 nap |
| A4 | `purchasing` modul teljes implementáció | Új modul | 5 nap |
| A5 | `pos` modul teljes implementáció | Új modul | 5 nap |
| A6 | `invoicing` PDF generálás (jsPDF client-side) | Core | 1 nap |
| A7 | `invoicing` email küldés (nodemailer, SMTP) | Modul bővítés | 1 nap |
| A8 | Szektor preset rendszer (setup wizard bővítés) | Core | 2 nap |

### 🟡 FÁZIS B — "Szolgáltató képes" (2-3 hét)

| # | Feladat | Típus | Becslés |
|---|---------|-------|---------|
| B1 | `crm` modul implementáció | Új modul | 5 nap |
| B2 | `worksheets` modul implementáció | Új modul | 4 nap |
| B3 | `invoicing` bővítés: díjbekérő, előleg, ismétlődő számla | Modul bővítés | 3 nap |
| B4 | `tracking` átpozicionálás: ügyfélértesítés, publikus link | Modul bővítés | 2 nap |
| B5 | `reports` előre gyártott sablonok (6-8 db szektoronként) | Modul bővítés | 2 nap |
| B6 | NAV Online Számla 3.0 teljes implementáció | Modul bővítés | 5 nap |

### 🟢 FÁZIS C — "Piac-kiterjesztés" (4-6 hét)

| # | Feladat | Típus | Becslés |
|---|---------|-------|---------|
| C1 | `e-commerce` modul (WooCommerce/Shopify szinkron) | Új modul | 5 nap |
| C2 | `recipes` modul (vendéglátás) | Új modul | 3 nap |
| C3 | `projects` modul (építőipar) | Új modul | 4 nap |
| C4 | `appointments` modul (időpontfoglalás) | Új modul | 4 nap |
| C5 | Többnyelvű számla (HU+EN/DE dupla oszlop) | Modul bővítés | 2 nap |
| C6 | Mobilbarát PWA (offline POS, készlet check) | Core | 5 nap |
| C7 | Publikus demo szektoronként (demo.ainova.hu/retail, /service) | Cloud | 2 nap |

---

## 7. BEVÉTEL BECSLÉS

### 7.1 Jelenlegi piac (gyártás, ~15K cég)

| Szcenárió | Ügyfélszám | Átlagár | Havi bevétel | Éves bevétel |
|-----------|-----------|---------|-------------|-------------|
| Pesszimista | 20 | 50.000 Ft | 1.000.000 Ft | 12.000.000 Ft |
| Reális | 80 | 60.000 Ft | 4.800.000 Ft | 57.600.000 Ft |
| Optimista | 200 | 70.000 Ft | 14.000.000 Ft | 168.000.000 Ft |

### 7.2 Bővített piac (kiskereskedelem + szolgáltatás, ~125K+ cég)

| Szcenárió | Ügyfélszám | Átlagár | Havi bevétel | Éves bevétel |
|-----------|-----------|---------|-------------|-------------|
| Pesszimista | 100 | 15.000 Ft | 1.500.000 Ft | 18.000.000 Ft |
| Reális | 500 | 18.000 Ft | 9.000.000 Ft | 108.000.000 Ft |
| Optimista | 2.000 | 20.000 Ft | 40.000.000 Ft | 480.000.000 Ft |

### 7.3 Kombinált bevétel (reális szcenárió)

| Szegmens | Havi | Éves |
|----------|------|------|
| Gyártás (Professional/Enterprise) | 4.800.000 Ft | 57.600.000 Ft |
| Kiskereskedelem (Starter/Basic) | 5.400.000 Ft | 64.800.000 Ft |
| Szolgáltatás (Basic/Professional) | 3.600.000 Ft | 43.200.000 Ft |
| **Összesen** | **13.800.000 Ft** | **165.600.000 Ft** |

---

## 8. VERSENYTÁRS ÖSSZEHASONLÍTÁS A BŐVÍTETT PIACON

| Vetélytárs | Ár/hó | Raktár | Számla | POS | Beszerzés | Vonalkód | NAV | Magyar | Moduláris |
|-----------|-------|--------|--------|-----|-----------|---------|-----|--------|-----------|
| **ACI (Starter)** | 9.900 Ft | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Billingo | 6.990 Ft | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Számlázz.hu | 4.990 Ft | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| KBOSS Számla Agent | 0 Ft | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| MiniCRM | 19.900 Ft | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Odoo (Community) | 0 Ft | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Odoo (Enterprise) | €24/user | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| SAP Business One | €100/user | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | részben | ❌ |

**ACI Starter versenyelőny:** Egyetlen a piacon, ami **raktár + számla + POS + beszerzés + NAV** egy csomagban, magyar natívan, 9.900 Ft/hó áron. A Billingo csak számlázik; az Odoo magyar NAV integrációja nincs. Az SAP 10x drágább.

---

## 9. MARKETING POZICIONÁLÁS

### 9.1 Szlogenek szektoronként

| Szektor | Szlogen |
|---------|---------|
| **Általános** | *"Egy rendszer. Minden helyen."* |
| **Kiskereskedő** | *"A boltod agya. Raktár, kassza, számla — egy kattintás."* |
| **Szerviz** | *"Munkalaptól a számláig. Automatikusan."* |
| **Vendéglátás** | *"Tudd, mennyibe kerül egy adag. Ne csak érezd."* |
| **Gyártás** | *"Lásd a gyáradat. Valós időben."* |

### 9.2 Landing page struktúra módosítás

Jelenlegi: Egyetlen gyár-fókuszú landing.
Javasolt: **Tab-os/szekciós landing** szektoronként:
```
[Gyártás] [Kereskedelem] [Szolgáltatás] [Vendéglátás]
```
Minden tab alatt a releváns modulok, screenshotok, use-case-ek.

---

## 10. ÖSSZEFOGLALÓ DÖNTÉSI MÁTRIX

| Kérdés | Válasz |
|--------|--------|
| Kell-e refaktor? | **NEM.** Új modulok + meglévők bővítése. |
| Mi a legfontosabb? | **Starter tier + Purchasing + POS.** Ezzel kezelhető a kiskereskedelem. |
| Mi a leggyorsabb ROI? | **Starter csomag 9.900 Ft/hó** — alacsony ár + nagy volumen. |
| Milyen sorrendben? | A → B → C fázisok. |
| Mekkora a befektetés? | ~8-12 hét fejlesztés (egy fejlesztő). |
| Mekkora a piac? | ~125.000 vállalkozás HU + EU expanzió lehetőség. |
| Kockázat? | Alacsony — a modul rendszer megvan, csak bővíteni kell. |
