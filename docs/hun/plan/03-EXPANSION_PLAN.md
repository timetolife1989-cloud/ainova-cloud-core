# 03 — PIACBŐVÍTÉSI MESTERTERV

> **Verzió:** 2.0 | **Dátum:** 2026-03-14 | **Státusz:** AKTÍV
> **Cél:** Az ACI-t kiterjeszteni a gyártási szektoron túl → univerzális magyar KKV platform
> **Kapcsolódó dokumentumok:**
> - [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) — Árképzés (itt definiált árak az irányadók)
> - [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — Javítandó hibák a bővítés ELŐTT
> - [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) — Új modulok technikai specifikációja
> - [05-ROADMAP.md](./05-ROADMAP.md) — Fejlesztési ütemterv

---

## 1. PIACI KONTEXTUS

### 1.1 Célpiac mérete (KSH 2024 adatok alapján)

| Méretkategória | Vállalkozásszám (Magyarország) | ACI célcsoport? |
|---------------|-------------------------------|-----------------|
| 0 fős (egyéni) | ~1.100.000 | ❌ Nem (nincs szüksége teljes ERP-re) |
| 1-4 fős | ~500.000 | ✅ **Starter** — számlázó + raktár |
| 5-9 fős | ~70.000 | ✅ **Basic** — több modul, flotta, POS |
| 10-49 fős | ~35.000 | ✅ **Professional** — CRM, ütemezés, teljesítmény |
| 50-249 fős | ~6.000 | ✅ **Enterprise** — OEE, PLC, minőség |
| 250+ fős | ~1.500 | ⚠️ Enterprise — de SAP/Oracle versenytárs |

**Elérhető piac (TAM):** ~611.000 vállalkozás (1-249 fős)
**Reális célpiac (SAM):** ~10.000-20.000 (technológia-nyitott, digitalizált)
**Megcélozható (SOM, első 2 év):** 50-100 ügyfél

### 1.2 Miért kell bővülni?

**Jelenlegi állapot:** Az ACI 18 modulja **kizárólag gyártásra épül**:
- OEE, PLC-connector, shift-management, quality → csak gyárnak kell
- A 35.000 db 10-49 fős cégből a **gyártók ~15%** → ~5.250 cég
- A 500.000 db 1-4 fős cégből → 0 célpont a jelenlegi modulkészlettel

**Bővítés után:**
- Kiskereskedelem (~80.000 bolt), szolgáltatás (~120.000 szerviz), vendéglátás (~40.000 étterem), építőipar (~30.000 cég) → **mind célcsoport**
- Starter tier (€99/hó) → mikroszintű belépő

---

## 2. SZEKTORDEFINÍCIÓK

### 2.1 Hat fő szektor

| # | Szektor | Ikon | Jellemző vevő | Fő igény |
|---|---------|------|---------------|----------|
| **S1** | 🏭 Gyártás | `Factory` | Gépgyártó, fémipari üzem, élelmiszergyár | Termelésirányítás, OEE, műszakbeosztás |
| **S2** | 🛒 Kiskereskedelem | `ShoppingCart` | Csavarbolt, festékbolt, varroda, virágbolt | Raktár, POS, beszerzés, számlázás |
| **S3** | 🔧 Szolgáltatás | `Wrench` | Autószerviz, IT szerviz, villanyszerelő | Munkalapok, időpont, CRM, követés |
| **S4** | 🍞 Vendéglátás/Élelmiszer | `ChefHat` | Pékség, kávézó, étterem, cukrászda | Receptúrák, raktár, beszerzés, HACCP |
| **S5** | 🏗️ Építőipar | `HardHat` | Burkoló, festő, generálkivitelező | Projektek, raktár, flotta, számlázás |
| **S6** | 🚚 Logisztika | `Truck` | Futárszolgálat, raktárlogisztika | Flotta, szállítás, követés, raktár |

### 2.2 Szektoronkénti modulmátrix

Az alábbi táblázat mutatja, melyik szektor melyik modult igényli. **Kék = alap**, **Zöld = opcionális/add-on**.

| Modul | S1 Gyártás | S2 Keresk. | S3 Szolg. | S4 Vendégl. | S5 Építő | S6 Logiszt. |
|-------|-----------|-----------|----------|-----------|---------|-----------|
| **MEGLÉVŐ MODULOK** | | | | | | |
| `inventory` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `invoicing` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reports` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `file-import` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `workforce` | ✅ | 🟢 | ✅ | ✅ | ✅ | ✅ |
| `tracking` | ✅ | 🟢 | ✅ | — | ✅ | ✅ |
| `fleet` | ✅ | — | 🟢 | — | ✅ | ✅ |
| `performance` | ✅ | — | 🟢 | — | — | 🟢 |
| `scheduling` | ✅ | 🟢 | ✅ | ✅ | ✅ | ✅ |
| `delivery` | ✅ | — | — | 🟢 | — | ✅ |
| `oee` | ✅ | — | — | — | — | — |
| `plc-connector` | ✅ | — | — | — | — | — |
| `shift-management` | ✅ | — | — | 🟢 | — | ✅ |
| `quality` | ✅ | — | — | ✅ | — | — |
| `maintenance` | ✅ | — | — | — | — | 🟢 |
| `digital-twin` | ✅ | — | — | — | — | — |
| `sap-import` | ✅ | — | — | — | — | — |
| **ÚJ MODULOK** | | | | | | |
| `purchasing` | ✅ | ✅ | 🟢 | ✅ | ✅ | 🟢 |
| `pos` | — | ✅ | 🟢 | ✅ | — | — |
| `crm` | 🟢 | ✅ | ✅ | 🟢 | ✅ | ✅ |
| `worksheets` | — | — | ✅ | — | ✅ | — |
| `recipes` | — | — | — | ✅ | — | — |
| `appointments` | — | 🟢 | ✅ | 🟢 | 🟢 | — |
| `projects` | 🟢 | — | 🟢 | — | ✅ | 🟢 |
| `e-commerce` | 🟢 | ✅ | — | 🟢 | — | — |

**Megjegyzés:** ✅ = szinte mindig kell, 🟢 = opcionális/add-on, — = nem releváns

---

## 3. ÚJ MODULOK ÖSSZEFOGLALÁSA

> Teljes technikai specifikáció: [04-MODULE_SPECS.md](./04-MODULE_SPECS.md)

### 3.1 Prioritás szerinti lista

| Prioritás | Modul ID | Név | Cél tier | Fő szektor | Új bevételi potenciál |
|-----------|----------|-----|----------|------------|----------------------|
| **P1** | `purchasing` | Beszerzés | Basic | Összes | 🔴 Magas — mindenki vásárol |
| **P2** | `pos` | POS / Pénztár | Basic | S2, S4 | 🔴 Magas — bolt nélkülözhetetlen |
| **P3** | `crm` | Ügyfélkezelés | Professional | S2, S3, S5, S6 | 🟠 Közepes — nem mindenki használ CRM-et |
| **P4** | `worksheets` | Munkalapok | Professional | S3, S5 | 🟠 Közepes — szerviz/építőipar core |
| **P5** | `recipes` | Receptúrák | Starter (add-on) | S4 | 🟡 Niche — de pékségek számára nélkülözhetetlen |
| **P6** | `appointments` | Időpontfoglalás | Starter (add-on) | S3, S4 | 🟡 Niche — szervizek, fodrászok |
| **P7** | `projects` | Projektkezelés | Basic (add-on) | S5, S6 | 🟠 Közepes — építőipar/logisztika |
| **P8** | `e-commerce` | Webshop szinkron | Basic (add-on) | S2, S4 | 🟢 Későbbi — integráció, nem core |

### 3.2 Modul leírások (rövid)

#### `purchasing` — Beszerzés
**Lényeg:** Beszállítók kezelése, rendelések, árajánlat kérés, automatikus rendelés alacsony készletnél.
**Integráció:** `inventory` (készlet trigger) → `purchasing` (rendelés) → `invoicing` (szállítói számla rögzítés)
**Dependency:** `inventory` (kötelező)

#### `pos` — Pénztárgép / POS
**Lényeg:** Pénztári felület (touchscreen), vonalkód olvasás, fizetési mód, napi zárás, nyugta nyomtatás.
**Integráció:** `inventory` (eladás → készletcsökkentés) → `invoicing` (számla generálás) → `reports` (napi forgalom)
**Dependency:** `inventory`, `invoicing`

#### `crm` — Ügyfélkezelés
**Lényeg:** Ügyfél-adatbázis, kapcsolattartási előzmények, emlékeztetők, pipeline kezelés.
**Integráció:** `invoicing` (ügyfél → számla) → `worksheets` (ügyfél → munkalap)
**Dependency:** nincs (standalone)

#### `worksheets` — Munkalapok
**Lényeg:** Szerviz/javítási munkalapok, munkaóra nyilvántartás, anyagfelhasználás, ügyfél aláírás.
**Integráció:** `inventory` (felhasznált anyag → készletcsökkentés) → `invoicing` (munkalap → számla) → `crm` (ügyfél)
**Dependency:** `inventory`

#### `recipes` — Receptúrák
**Lényeg:** Receptúra/BOM kezelés, kalkuláció (mennyi alapanyag = mennyi termék), HACCP nyilvántartás.
**Integráció:** `inventory` (alapanyag-szükséglet) → `purchasing` (hiányzó alapanyag rendelés)
**Dependency:** `inventory`

#### `appointments` — Időpontfoglalás
**Lényeg:** Naptár, foglalási időablak, ügyfél emlékeztető (email/SMS), kapacitás kezelés.
**Integráció:** `crm` (ügyfél) → `worksheets` (időpont → munkalap) → `invoicing` (munkalap → számla)
**Dependency:** nincs (standalone, de CRM-mel hasznos)

#### `projects` — Projektkezelés
**Lényeg:** Projekt → feladatok → erőforrások, Gantt, költségvetés vs. tényleges, mérföldkövek.
**Integráció:** `inventory` (anyag foglalás) → `workforce` (erőforrás kijelölés) → `invoicing` (részszámla → végszámla)
**Dependency:** nincs (standalone)

#### `e-commerce` — Webshop szinkronizáció
**Lényeg:** WooCommerce/Shopify → ACI szinkron (termékek, rendelések, készlet).
**Integráció:** `inventory` (készlet szinkron ↔ webshop) → `invoicing` (online rendelés → számla)
**Dependency:** `inventory`

---

## 4. TIER MODULBEOSZTÁS — FRISSÍTETT

> **FONTOS:** Az alábbi tábla a VÉGLEGES modulbeosztás. Ez felülírja a `lib/license/tiers.ts` jelenlegi tartalmát.
> Lásd: [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §2.3 az árakért.

### 4.1 Tier → Modul kiosztás

```
STARTER (€99/hó, max 5 user):
├── inventory         ← raktárkezelés (alap)
├── invoicing         ← számlázás + NAV (alap)
├── reports           ← riportok (alap)
└── file-import       ← Excel/CSV import (alap)

BASIC (€299/hó, max 15 user):
├── [Starter moduljai]
├── workforce         ← munkaerő kezelés
├── tracking          ← rendelés/feladat követés
├── fleet             ← flottakezelés
├── purchasing        ← beszerzés [ÚJ]
└── pos               ← pénztár [ÚJ]

PROFESSIONAL (€599/hó, max 50 user):
├── [Basic moduljai]
├── performance       ← teljesítmény KPI
├── scheduling        ← kapacitástervezés
├── delivery          ← kiszállítás
├── crm               ← ügyfélkezelés [ÚJ]
└── worksheets        ← munkalapok [ÚJ]

ENTERPRISE (€1.199/hó, korlátlan user):
├── [Professional moduljai]
├── oee               ← OEE mutatók
├── plc-connector     ← PLC adatgyűjtés
├── shift-management  ← műszakkezelés
├── quality           ← minőségirányítás
├── maintenance       ← karbantartás
└── digital-twin      ← digitális iker

ADD-ON modulok (bármely csomag felett):
├── sap-import        ← +€99/hó, Professional+
├── recipes           ← +€29/hó, Starter+
├── appointments      ← +€29/hó, Starter+
├── projects          ← +€49/hó, Basic+
├── e-commerce        ← +€49/hó, Basic+
├── api-gateway       ← +€99/hó, Professional+ [JÖV]
└── multi-site        ← +€199/hó, Enterprise only [JÖV]
```

### 4.2 Változások a jelenlegi `tiers.ts`-hez képest

| Változás | Régi | Új |
|----------|------|-----|
| Starter tier | ❌ nem létezik | ✅ `inventory`, `invoicing`, `reports`, `file-import` |
| `invoicing` | ❌ nincs semelyik tierben | ✅ Starter (minden tiernél) |
| `digital-twin` | ❌ nincs a tiers.ts-ben | ✅ Enterprise |
| `sap-import` | Professional (tiers.ts) / Enterprise (manifest) | Add-on (+€99/hó, Prof+) |
| `api-gateway` | Enterprise (tiers.ts, de nincs kód) | Add-on (+€99/hó, Prof+, Coming Soon) |
| `multi-site` | Enterprise (tiers.ts, de nincs kód) | Add-on (+€199/hó, Ent only, Coming Soon) |
| `inventory` | Professional | ✅ Starter (minden tiernél) |
| `purchasing` | ❌ nem létezik | ✅ Basic [ÚJ modul] |
| `pos` | ❌ nem létezik | ✅ Basic [ÚJ modul] |
| `crm` | ❌ nem létezik | ✅ Professional [ÚJ modul] |
| `worksheets` | ❌ nem létezik | ✅ Professional [ÚJ modul] |
| `recipes` | ❌ nem létezik | Add-on (+€29/hó) [ÚJ modul] |
| `appointments` | ❌ nem létezik | Add-on (+€29/hó) [ÚJ modul] |
| `projects` | ❌ nem létezik | Add-on (+€49/hó) [ÚJ modul] |
| `e-commerce` | ❌ nem létezik | Add-on (+€49/hó) [ÚJ modul] |
| Max users (basic) | 10 | **15** |

**Kódszintű utasítás (`tiers.ts` frissítés):**
```typescript
// lib/license/tiers.ts — TELJES FELÜLÍRÁS
export type LicenseTier = 'starter' | 'basic' | 'professional' | 'enterprise' | 'dev';

export const TIER_MODULES: Record<LicenseTier, string[]> = {
  starter: ['inventory', 'invoicing', 'reports', 'file-import'],
  basic: ['inventory', 'invoicing', 'reports', 'file-import', 'workforce', 'tracking', 'fleet', 'purchasing', 'pos'],
  professional: ['inventory', 'invoicing', 'reports', 'file-import', 'workforce', 'tracking', 'fleet', 'purchasing', 'pos', 'performance', 'scheduling', 'delivery', 'crm', 'worksheets'],
  enterprise: ['inventory', 'invoicing', 'reports', 'file-import', 'workforce', 'tracking', 'fleet', 'purchasing', 'pos', 'performance', 'scheduling', 'delivery', 'crm', 'worksheets', 'oee', 'plc-connector', 'shift-management', 'quality', 'maintenance', 'digital-twin'],
  dev: ['*'],
};

export const TIER_MAX_USERS: Record<LicenseTier, number> = {
  starter: 5,
  basic: 15,
  professional: 50,
  enterprise: Infinity,
  dev: 999,
};

// Add-on modulok (nem a TIER_MODULES-ban, hanem külön licenccel aktiválhatók)
export const ADDON_MODULES: Record<string, { minTier: LicenseTier; monthlyPrice: number }> = {
  'sap-import': { minTier: 'professional', monthlyPrice: 99 },
  'recipes': { minTier: 'starter', monthlyPrice: 29 },
  'appointments': { minTier: 'starter', monthlyPrice: 29 },
  'projects': { minTier: 'basic', monthlyPrice: 49 },
  'e-commerce': { minTier: 'basic', monthlyPrice: 49 },
  'api-gateway': { minTier: 'professional', monthlyPrice: 99 },
  'multi-site': { minTier: 'enterprise', monthlyPrice: 199 },
};
```

---

## 5. SZEKTORSPECIFIKUS PRESET RENDSZER

### 5.1 Koncepció

Az implementáció során az ügyfél szektorát kiválasztjuk → az ACI automatikusan konfigurálja:
1. Aktív modulok (szektor-relevánsakra szűrve)
2. Dashboard layout (szektorra jellemző widgetek)
3. Mértékegységek (kg a pékségnek, db a boltnak, óra a szerviznek)
4. Riport sablonok (szektor-specifikus KPI-k)
5. Import sablonok (szektorra jellemző Excel formátumok)

### 5.2 Preset struktúra (adatbázisban)

```sql
-- core_sector_presets tábla (új)
CREATE TABLE core_sector_presets (
  id          SERIAL PRIMARY KEY,
  sector_id   VARCHAR(30) NOT NULL UNIQUE,  -- 'manufacturing', 'retail', stb.
  name_hu     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NOT NULL,
  name_de     VARCHAR(100) NOT NULL,
  icon        VARCHAR(50) NOT NULL,         -- Lucide icon neve
  modules     JSONB NOT NULL,               -- ['inventory', 'invoicing', ...]
  settings    JSONB NOT NULL,               -- { default_currency: 'HUF', ... }
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Preset definíciók

```typescript
const SECTOR_PRESETS = {
  manufacturing: {
    name: { hu: 'Gyártás', en: 'Manufacturing', de: 'Fertigung' },
    icon: 'Factory',
    recommendedTier: 'professional',
    coreModules: ['inventory', 'invoicing', 'workforce', 'tracking', 'performance', 'scheduling', 'reports'],
    optionalModules: ['oee', 'plc-connector', 'shift-management', 'quality', 'maintenance', 'digital-twin'],
    settings: { default_unit: 'db', currency: 'EUR' }
  },
  retail: {
    name: { hu: 'Kiskereskedelem', en: 'Retail', de: 'Einzelhandel' },
    icon: 'ShoppingCart',
    recommendedTier: 'basic',
    coreModules: ['inventory', 'invoicing', 'purchasing', 'pos', 'reports', 'file-import'],
    optionalModules: ['crm', 'e-commerce', 'workforce'],
    settings: { default_unit: 'db', currency: 'HUF' }
  },
  services: {
    name: { hu: 'Szolgáltatás', en: 'Services', de: 'Dienstleistung' },
    icon: 'Wrench',
    recommendedTier: 'professional',
    coreModules: ['invoicing', 'worksheets', 'crm', 'scheduling', 'tracking', 'reports'],
    optionalModules: ['appointments', 'inventory', 'fleet'],
    settings: { default_unit: 'óra', currency: 'HUF' }
  },
  gastronomy: {
    name: { hu: 'Vendéglátás', en: 'Food & Beverage', de: 'Gastronomie' },
    icon: 'ChefHat',
    recommendedTier: 'basic',
    coreModules: ['inventory', 'invoicing', 'purchasing', 'recipes', 'reports', 'file-import'],
    optionalModules: ['workforce', 'quality', 'pos'],
    settings: { default_unit: 'kg', currency: 'HUF' }
  },
  construction: {
    name: { hu: 'Építőipar', en: 'Construction', de: 'Bauwesen' },
    icon: 'HardHat',
    recommendedTier: 'professional',
    coreModules: ['inventory', 'invoicing', 'projects', 'tracking', 'fleet', 'reports'],
    optionalModules: ['workforce', 'purchasing', 'crm'],
    settings: { default_unit: 'db', currency: 'HUF' }
  },
  logistics: {
    name: { hu: 'Logisztika', en: 'Logistics', de: 'Logistik' },
    icon: 'Truck',
    recommendedTier: 'professional',
    coreModules: ['fleet', 'delivery', 'tracking', 'inventory', 'invoicing', 'workforce', 'reports'],
    optionalModules: ['scheduling', 'crm', 'maintenance'],
    settings: { default_unit: 'db', currency: 'EUR' }
  }
};
```

---

## 6. IMPLEMENTÁCIÓ STRATÉGIA

### 6.1 Az implementáció (Bevezetési díj) folyamata — részletesen

Lásd [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §1.2 a folyamat leírásáért és §2.3 az árakért.

**Összefoglalás:**

| Lépés | Időtartam | Ki végzi | Output |
|-------|----------|----------|--------|
| **1. Igényfelmérés** | 1-2 óra | Tibor (helyszíni/remote) | Igényfelmérő jegyzőkönyv |
| **2. Szektor preset kiválasztás** | 5 perc | ACI rendszer | Automatikus modul konfiguráció |
| **3. Testreszabás** | 3-5 nap | AI fejlesztés + Tibor config | Működő rendszer |
| **4. Adatimport** | 1-2 nap | Tibor (Excel sablonok) | Feltöltött adatbázis |
| **5. Tesztelés** | 1 nap | Tibor + ügyfél | Elfogadási jegyzőkönyv |
| **6. Oktatás + élesítés** | 1-2 óra (helyszíni) | Tibor | Éles rendszer + betanított felhasználók |
| **7. Garancia** | 30 nap | Remote support | Hibajavítás ingyen |

**Teljes implementációs idő: 1-2 hét** (nem full-time, hanem interspersed)

### 6.2 Önkiszolgáló (self-service) vs. Telepített (managed)

| Szempont | Self-service | Managed (jelenlegi) |
|----------|-------------|---------------------|
| Ügyfélszerzés | Weboldal → regisztráció | Személyes kapcsolat → implementáció |
| Bevezetési díj | €0 (nincs) | €299–€2.999+ |
| Ügyfélérték (LTV) | Alacsony (churn magas) | Magas (személyes kapcsolat → ragaszkodás) |
| Skálázhatóság | Végtelen | Korlátozott (Tibor ideje) |
| Jelenlegi fókusz | ❌ NEM | ✅ IGEN |

**Döntés:** Első 1-2 évben KIZÁRÓLAG managed implementáció. Self-service csak akkor, ha az ügyfélkör meghaladja az egyéni kapacitást ÉS van alkalmazott.

---

## 7. MARKETING & ÉRTÉKESÍTÉS

### 7.1 Landing page átdolgozás

**Jelenlegi állapot:** 3 pricing kártya, generikus leírás, "Get Started" gomb.
**Szükséges:** 4 kártya (Starter+), szektor tab-ok, "Érdeklődöm" gomb, tájékoztató jellegű megjegyzés.

Részletes spec: [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §3.2

**Szektor-specifikus landing:**
```
┌──────────────────────────────────────────────────────┐
│  "Milyen iparágban dolgozik?"                        │
│  [🏭 Gyártás] [🛒 Bolt] [🔧 Szerviz] [🍞 Pékség]  │
│  [🏗️ Építő] [🚚 Logisztika]                        │
│                                                      │
│  → Kattintásra a pricing kártyákon a modullisták     │
│    az adott szektorra szűrődnek                      │
│  → Az ajánlott csomag kivilágosodik                  │
└──────────────────────────────────────────────────────┘
```

### 7.2 Értékesítési csatornák

| Csatorna | Prioritás | Költség | Hatékonyság |
|----------|----------|---------|-------------|
| **Személyes ajánlás** | 🔴 #1 | €0 | Nagyon magas |
| **Google My Business + SEO** | 🟠 #2 | €0-50/hó | Közepes-magas |
| **LinkedIn + szakmai csoportok** | 🟠 #3 | €0 | Közepes |
| **Helyi vállalkozói események** | 🟡 #4 | €50-200/alkalom | Közepes |
| **Facebook hirdetés** | 🟡 #5 | €100-500/hó | Alacsony-közepes |
| **Cold call/email** | ⚪ #6 | €0 | Alacsony |

### 7.3 Értékesítési pitch — szektoronként

| Szektor | Pitch (1 mondat) |
|---------|-----------------|
| 🛒 Kereskedelem | *"Raktárkészlet, pénztár és számlázás egy helyen — nem kell 3 külön szoftver."* |
| 🔧 Szolgáltatás | *"Munkalapok, időpontfoglalás és számlázás egyetlen rendszerben — nem kell Excel."* |
| 🍞 Vendéglátás | *"Receptúra-kalkuláció, alapanyag rendelés és NAV számlázás — automatikusan."* |
| 🏗️ Építőipar | *"Projekt költségvetés, anyagkövetés és alvállalkozói számlázás — egy felületen."* |
| 🚚 Logisztika | *"Flotta, szállítás és raktárkészlet valós időben — papír nélkül."* |
| 🏭 Gyártás | *"OEE, műszakok, minőségirányítás és karbantartás — ipari szinten."* |

---

## 8. TECHNIKAI FELTÉTELEK A BŐVÍTÉSHEZ

### 8.1 Blokkoló hibák javítása ELŐBB

A [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) dokumentum tartalmazza az összes ismert hibát. A bővítés ELŐTT az alábbiak **kötelezően** javítandók:

| Bug kód | Leírás | Miért blokkoló |
|---------|--------|----------------|
| BUG-01 | Dupla € szimbólum | Marketing hiteltelenség |
| BUG-04 | `invoicing` hiányzik tiers.ts-ből | Starter tier nem fog működni |
| BUG-12 | PDF nem valódi PDF | Számlázás nem működik professzionálisan |
| PERF-01 | `force-dynamic` | Mobil/lassú net használhatatlan |
| BUG-02 | Landing page crash | Potenciális ügyfél elvesztése |

### 8.2 Infrastruktúra igény

| Elem | Jelenlegi | Szükséges |
|------|-----------|-----------|
| DB táblák | ~50 | ~80-100 (új modulok) |
| API route-ok | ~40 | ~70-80 |
| i18n kulcsok | ~300 | ~600+ |
| Migrations | ~25 fájl | ~45 fájl |
| Frontend oldalak | ~15 dashboard page | ~25 dashboard page |

### 8.3 ModuleManifest interfész bővítés

Az új modulokhoz szükséges kiegészítések:

```typescript
interface ModuleManifest {
  // ...meglévő mezők (lásd lib/modules/types.ts)
  
  // ÚJ mezők:
  sector?: string[];                    // ['retail', 'services'] — melyik szektoroknál ajánlott
  comingSoon?: boolean;                 // true → Coming Soon badge, nem aktiválható
  isAddon?: boolean;                    // true → nem a TIER_MODULES-ban, hanem külön licenc
  addonMinTier?: LicenseTier;           // 'starter' → melyik tier felett vásárolható
  addonMonthlyPrice?: number;           // €29 → havi ár (EUR)
}
```

---

## 9. KOCKÁZATELEMZÉS

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|-------------|-------|-----------|
| **Túl sok modul, túl kevés idő** | Magas | Az implementáció elhúzódik | Fázisolt fejlesztés (P1→P4 először, P5-P8 később) |
| **Szektor-specifikus igények fedetlen** | Közepes | Nem releváns funkciók | Igényfelmérés MINDEN ügyféllel KÜLÖN |
| **Versenytárs (Billingo, MiniCRM)** | Alacsony | Ár-harc | ACI nem versenyez árban → integrált érték |
| **Technikai korlát (Vercel/Supabase)** | Alacsony | Nem fut az app | On-premise Docker alternatíva |
| **Ügyfélszerzés lassú** | Közepes | Bevétel nem jön | Referencia program (meglévő ügyfél ajánl → kedvezmény) |

---

## 10. MÉRFÖLKÖVEK

> Részletes ütemterv: [05-ROADMAP.md](./05-ROADMAP.md)

| # | Mérföldkő | Tartalom | Eredmény |
|---|-----------|----------|----------|
| **M0** | Stabilizálás | Bug-ok javítása ([02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md)) | Hibamentes alap |
| **M1** | Starter tier | tiers.ts + landing + pricing | Mikroszintű belépő elérhető |
| **M2** | `purchasing` + `pos` | 2 új modul (Basic tier bővítés) | Kiskereskedelem kiszolgálható |
| **M3** | `crm` + `worksheets` | 2 új modul (Professional tier bővítés) | Szolgáltatás/építőipar kiszolgálható |
| **M4** | Szektor preset + landing redesign | UX + marketing | Szektor-specifikus értékesítés |
| **M5** | Add-on modulok | `recipes`, `appointments`, `projects` | Niche szektorok lefedése |
| **M6** | `e-commerce` + API gateway | Integrációk | Digitális kereskedelem |

---

## 11. TEENDŐK ÖSSZEFOGLALÁSA

| # | Feladat | Cross-ref | Blokkolja |
|---|---------|-----------|-----------|
| **E-01** | Bug-ok javítása (17 tétel) | [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) teljes lista | M1, M2, M3 |
| **E-02** | Starter tier implementáció (tiers.ts + landing) | [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §2.3 | M1 |
| **E-03** | `purchasing` modul fejlesztés | [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §purchasing | M2 |
| **E-04** | `pos` modul fejlesztés | [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §pos | M2 |
| **E-05** | `crm` modul fejlesztés | [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §crm | M3 |
| **E-06** | `worksheets` modul fejlesztés | [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §worksheets | M3 |
| **E-07** | Landing page szektor tab-ok | [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §3.2 | M4 |
| **E-08** | Szektor preset rendszer (DB + API + UI) | Jelen doc §5 | M4 |
| **E-09** | @react-pdf/renderer bevezetés | [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) §BUG-12 | M1 |
| **E-10** | Add-on modul rendszer (`ADDON_MODULES`, licenc frissítés) | Jelen doc §4.1 | M5 |
| **E-11** | `ModuleManifest` interfész bővítés | Jelen doc §8.3 | M2-M6 |

---

*Következő dokumentum: [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) — Új modulok részletes technikai specifikációja*
