# 01 — ÁRKÉPZÉSI STRATÉGIA & ÜZLETI MODELL

> **Verzió:** 2.0 | **Dátum:** 2026-03-14 | **Státusz:** AKTÍV
> **Kapcsolódó dokumentumok:**
> - [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — Ismert hibák és javítási terv
> - [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) — Piacbővítési mesterterv
> - [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) — Új modulok technikai specifikációja
> - [05-ROADMAP.md](./05-ROADMAP.md) — Fejlesztési ütemterv és függőségek

---

## 0. ÁRKÉPZÉSI AUDIT — JELENLEGI KAOTIKUS ÁLLAPOT

### ✅ MEGOLDVA: Korábban 4 egymásnak ellentmondó árjegyzék volt — 2026.03.15-re MIND FRISSÍTVE

| Forrás | Fájl | Starter | Basic | Prof. | Enterprise | Státusz |
|--------|------|---------|-------|-------|------------|---------|
| **Landing page (ÉLŐ KÓD)** | `app/(marketing)/page.tsx` | — | **€299/hó** | **€599/hó** | **€1.199/hó** | ✅ Igazság |
| Bryan Overview | `docs/BRYAN_ACI_OVERVIEW.md` | €99/hó | €299/hó | €599/hó | €1.199/hó | ✅ Frissítve |
| Bryan Marketing | `docs/AINOVA_OVERVIEW_FOR_BRYAN.md` | €99/hó | €299/hó | €599/hó | €1.199/hó | ✅ Frissítve |
| Korábbi Market Analysis | `docs/archive/MARKET_ANALYSIS_v1_OBSOLETE.md` | — | 29.900 Ft | 59.900 Ft | 119.900 Ft | 📂 Archív |

**A landing page az igazság** — az a kód ami megy élesben. Tehát az aktuális meghirdetett árak:
- **Starter: €99/hó** (~39.000 Ft) — Hiányzik a landing page-ről (TODO)
- **Basic: €299/hó** (~117.000 Ft)
- **Professional: €599/hó** (~235.000 Ft)
- **Enterprise: €1.199/hó** (~470.000 Ft)

### Hátralévő teendő:
- Landing page: Starter kártya hozzáadása (jelenleg csak 3 tier jelenik meg)
- **LN-01** feladat (lásd [05-ROADMAP.md](./05-ROADMAP.md)): Minden ár-referenciát egyetlen helyre centralizálni

---

## 1. AZ ÜZLETI MODELL FELÉPÍTÉSE

### 1.1 Két bevételi forrás

| Bevétel típusa | Angol név | Leírás |
|----------------|-----------|--------|
| **Egyszeri telepítési díj** | **Implementation Fee** | Helyszíni felmérés → fejlesztés → telepítés → élesítés |
| **Havi szolgáltatási díj** | **Subscription Fee** | Szoftver licenc + hosting + karbantartás + támogatás |

> **Megjegyzés:** A "kiszállási díj" nem professzionális kifejezés. Az iparági standard:
> - 🇬🇧 **Implementation Fee** / **Deployment Fee** / **Onboarding Fee**
> - 🇭🇺 **Bevezetési díj** / **Telepítési díj** / **Implementációs díj**
> - 🇩🇪 **Implementierungsgebühr** / **Einrichtungsgebühr**

### 1.2 Implementáció folyamata (ami az egyszeri díjat indokolja)

```
1. 📋 IGÉNYFELMÉRÉS (helyszíni vagy remote)
   - Üzleti folyamatok feltérképezése
   - Mely modulok szükségesek
   - Integrációs igények (SAP, PLC, webshop, stb.)
   - Felhasználói szerepek definiálása
   
2. 🛠️ KONFIGURÁCIÓ & TESTRESZABÁS (~1 hét)
   - Modulok aktiválása/konfigurálása
   - Jogosultsági mátrix beállítása
   - Adatimport előkészítése (Excel sablonok)
   - Egyedi beállítások (nyelvek, mértékegységek, ÁFA kulcsok)
   - Szektorspecifikus preset alkalmazása
   
3. 🚀 TELEPÍTÉS & ÉLESÍTÉS
   - Cloud: Supabase/Vercel konfiguráció, domain beállítás
   - On-premise: Docker image deploy, szerver konfiguráció
   - Oktatás (1-2 óra, a felhasználók képzése)
   
4. 🤝 ÁTADÁS
   - Admin fiók átadás
   - Dokumentáció
   - 30 napos garancia hibajavításra
```

---

## 2. ÁRKÉPZÉSI DILEMMA — Moduláris vs. Fix árazás

### 2.1 A probléma

**Jelenlegi állapot:** 3 fix csomag (Basic/Professional/Enterprise), egyenkénti ÁR MEZK fix.

**Dilemma:** Egy pékségnek kell `inventory` + `invoicing`, de NEM kell `OEE` vagy `PLC-connector`. Miért fizessen €1.199-et?

**Kockázat:** Ha túlságosan moduláris az árazás ("válassz modulokat"), a vevő azt érzi "kínai menü" — nem tudja mit válasszon, és az olcsóbbat választja mindig.

### 2.2 Megoldás: "Csomagok + Kiegészítők" modell

**Stratégia:** Megtartjuk a 3+1 csomagot mint KIINDULÁSI ALAPOT, de hozzáadunk:
1. **Starter csomag** — mikroban vállalkozásoknak (ÚJ)
2. **Kiegészítő modulok** — csomagon felül vásárolható egyedi funkciók
3. **Iparági preset** — az onboarding során az ügyfél szektora alapján automatikus modulkonfiguráció

### 2.3 Javasolt új árstruktúra

#### Havi előfizetési díjak (szoftver + hosting + support)

| Csomag | Havi díj | Célcsoport | Max user | Alap modulok |
|--------|----------|------------|----------|-------------|
| **Starter** | **€99/hó** (~39.000 Ft) | Mikrovállalkozás, 1-3 fő (csavarbolt, szerviz, pékség) | 5 | inventory, invoicing, reports, file-import |
| **Basic** | **€299/hó** (~117.000 Ft) | Kis cég 3-15 fő (műhely, kisüzem, kereskedő) | 15 | + workforce, tracking, fleet, purchasing, pos |
| **Professional** | **€599/hó** (~235.000 Ft) | Közepes cég 15-50 fő (gyár, multi-shop) | 50 | + performance, scheduling, delivery, crm, worksheets |
| **Enterprise** | **€1.199/hó** (~470.000 Ft) | Nagyvállalat 50+ fő (több telephely, gyártósor) | ∞ | + oee, plc-connector, shift-mgmt, quality, maintenance, digital-twin |

#### Miért €99 a Starter (nem €25)?

| Költségtétel | Havi szinten |
|-------------|-------------|
| Supabase Pro (8GB, point-in-time recovery) | ~€25/hó |
| Vercel Pro (serverless functions, bandwidth) | ~€20/hó |
| Domain + SSL + monitoring | ~€5/hó |
| Backup & disaster recovery | ~€5/hó |
| Email szolgáltatás (számla küldés) | ~€5/hó |
| Fejlesztő idő amortizáció | ~€15/hó |
| Ügyfélszolgálat (email/chat) | ~€10/hó |
| **Összes költség** | **~€85/hó** |
| **Profit margin** | **~€14/hó (14%)** |

Tehát €99/hó a legalsó tartható ár, ami még profitot termel. A €25/hó (9.900 Ft) veszteséget termelne.

A €99/hó **kifejezetten versenyképes**: a Billingo Premium (korlátlan számla) €12/hó, DE abban nincs raktár, nincs POS, nincs beszerzés. Az összehasonlítás: 4 szoftvert (számlázó + raktár + POS + riport) **egy helyen, egy ára** €99.

#### Egyszeri implementációs díjak

| Csomag | Implementációs díj | Tartalom |
|--------|-------------------|----------|
| **Starter** | **€299** (~117.000 Ft) | Remote felmérés + konfiguráció + 1 óra oktatás |
| **Basic** | **€599** (~235.000 Ft) | Helyszíni/remote felmérés + konfiguráció + adatimport + 2 óra oktatás |
| **Professional** | **€1.499** (~590.000 Ft) | Teljes felmérés + testreszabás + integráció + adatmigráció + 4 óra oktatás |
| **Enterprise** | **€2.999+** (~1.180.000+ Ft) | Komplex felmérés + egyedi fejlesztések + multi-site + PLC integráció + teljes képzés |

> **Megjegyzés:** Az Enterprise implementáció ára egyedi árajánlat alapján is meghatározható.

#### Kiegészítő modulok (add-on-ok)

| Modul | Ár/hó | Melyik csomag felett érhető el |
|-------|-------|-------------------------------|
| `sap-import` (SAP integráció) | +€99/hó | Professional+ |
| `e-commerce` (Webshop szinkron) | +€49/hó | Basic+ |
| `appointments` (Időpontfoglalás) | +€29/hó | Starter+ |
| `recipes` (Receptúrák) | +€29/hó | Starter+ |
| `projects` (Projektkezelés) | +€49/hó | Basic+ |
| `api-gateway` (API integráció) | +€99/hó | Professional+ |
| `multi-site` (Több telephely) | +€199/hó | Enterprise only |

---

## 3. ÁRAZÁS A LANDING PAGE-EN — MIT MUTATUNK?

### 3.1 Jelenlegi probléma
A landing page 3 fix kártyát mutat fix árakkal. Ez **nem rossz**, de:
- Hiányzik a Starter
- Nem jelzi, hogy tájékoztató árak
- Nem mutatja, hogy moduláris/testreszabható
- Nem különíti el az implementációs díjat

### 3.2 Javasolt landing page pricing szekció

**Fő üzenet:** *"Válassza ki az iparágának megfelelő csomagot. Minden ár tájékoztató jellegű — a végleges ajánlatot egyedi igényfelmérés után kapja."*

**4 kártya** (Starter + 3 meglévő):
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   STARTER   │ │    BASIC    │ │ PROFESSIONAL│ │  ENTERPRISE │
│   €99/hó    │ │   €299/hó   │ │   €599/hó   │ │  €1.199/hó  │
│             │ │             │ │             │ │             │
│ Raktár      │ │ + Munkaerő  │ │ + Teljesítm.│ │ + OEE       │
│ Számlázás   │ │ + Követés   │ │ + Ütemezés  │ │ + PLC       │
│ Riportok    │ │ + Flotta    │ │ + Szállítás │ │ + Műszakok  │
│ Import      │ │ + Beszerzés │ │ + CRM       │ │ + Minőség   │
│             │ │ + POS       │ │ + Munkalapok│ │ + Karb.tart.│
│ 5 felh.     │ │ 15 felh.    │ │ 50 felh.    │ │ Korlátlan   │
│             │ │             │ │             │ │             │
│ [Érdeklődés]│ │[Érdeklődés] │ │[Érdeklődés] │ │ [Ajánlat]   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                                                  
  "Az árak tájékoztató jellegűek. Egyedi igényfelmérés alapján 
   végleges ajánlatot készítünk."
```

A "Get Started" / "Kezdés" gomb helyett **"Érdeklődöm" / "Ajánlatot kérek"** — mert nem self-service SaaS. Az ügyfél nem regisztrál egyedül — Tibor megy ki és implementálja.

---

## 4. SZEKTORSPECIFIKUS POZICIONÁLÁS

### A "minden benne van" dilemma megoldása

**Probléma:** Ha a landing page azt kommunikálja hogy "18 modul, minden benne van" → a vevő azt gondolja: *"Ez biztosan egyik területen sem jó igazán."*

**Megoldás:** Szektorspecifikus kommunikáció. A landing page-en NEM az összes modult mutatjuk, hanem **iparágra szűrt csomagot**.

#### Szektorok és a hozzájuk tartozó modulok

| Szektor | Módszeres szűrő | Modulok |
|---------|-----------------|---------|
| 🏭 **Gyártás** | Alapértelmezett (jelenlegi) | workforce, tracking, fleet, performance, scheduling, oee, plc, shift, quality, maintenance |
| 🛒 **Kiskereskedelem** | Csavarbolt, festékbolt, üzlet | inventory, invoicing, purchasing, pos, reports, file-import |
| 🔧 **Szolgáltatás** | Szerviz, IT, javító | worksheets, inventory, invoicing, crm, scheduling, tracking |
| 🍞 **Vendéglátás/Élelmiszer** | Pékség, kávézó, étterem | inventory, invoicing, recipes, workforce, reports |
| 🏗️ **Építőipar** | Építő, felújító | projects, inventory, tracking, invoicing, fleet |
| 🚚 **Logisztika** | Szállító, raktározó | fleet, delivery, tracking, inventory, workforce |

**Implementáció a landing page-en:**
```
[Gyártás 🏭] [Kereskedelem 🛒] [Szolgáltatás 🔧] [Vendéglátás 🍞] [Építőipar 🏗️]
```
Tab-ok, amelyekre kattintva a pricing kártyákon a modullisták a szektornak megfelelően változnak. A **CSOMAGOK ÁRAI NEM VÁLTOZNAK** (€99/€299/€599/€1.199), de a benne foglalt modulok igen.

---

## 5. VERSENYPOZÍCIÓ AZ ÚJ ÁRAZÁSSAL

| Szoftver           | Típus    | Havi ár | Raktár | Számla | POS | NAV | Magyar | Flat fee |
|----------|---------|----------|---------|--------|--------|-----|----------|----------|
| **ACI Starter**    | SaaS     | **€99** | ✅     | ✅    | ✅ | ✅ | ✅ | ✅ |
| Billingo (Premium) | SaaS     | ~€12    | ❌     | ✅    | ❌ | ✅ | ✅ | ✅ |
| Számlázz.hu | SaaS | ~€8      | ❌      | ✅     | ❌    | ✅ | ✅ | ✅ |
| MiniCRM (Starter)  | SaaS     | ~€55    | ❌     | ❌    | ❌ | ❌ | ✅ | ❌ (per user) |
| Odoo Community     | Op.sour. | €0      | ✅     | ✅     | ✅ | ❌| ❌ | ✅ |
| Odoo Enterprise    | SaaS     | €24/user | ✅    | ✅    | ✅ | ❌ | ❌ | ❌ (per user) |
| Katana MRP | SaaS  | saas     |  99+      /  ✅  | ✅    | ❌ | ❌ | ❌ | ❌ (per user) |
| SAP Business One   | License  | €100+/user | ✅  | ✅    | ❌ | ✅ | ✅ | ❌ (per user) |

**ACI versenyelőny:**
1. **Fix havi díj** — nem per-user, 5-15 user ugyanannyiért
2. **Magyar natív** — i18n (HU/EN/DE), NAV Online Számla integráció
3. **Moduláris** — csak amit használ, azt fizeti (add-on rendszer)
4. **Helyszíni telepítés** VAGY Cloud — az ügyfél választ
5. **Személyes implementáció** — nem "regisztrálj és boldogulj egyedül"

---

## 6. BEVÉTEL BECSLÉS (REÁLIS)

### Feltételezés
- 1 implementáció ~ 1-2 hét munka
- Havi ~2-3 új ügyfél reális egyedül
- Churn (lemorzsolódás): ~5%/hó az első évben, utána ~2%/hó

### Első éves becslés (12 hónap, egyedül dolgozva)

| Hónap | Új ügyfél   | Összesen   | Havi recurring | Havi impl. díj  | Össz. bevétel (havi) |
|-------|-------------|------------|----------------|-----------------|---------------------|
| 1     | 1 Starter   | 1          | €99            | €299            | €398   |
| 3     | 2 (1 Basic) | 4          | €596           | €599            | €1.195 |
| 6     | 2           | 9          | €1.593         | €599            | €2.192 |
| 12    | 2           | 20         | €3.980         | €299            | €4.279 |

**Éves összesítő (reális, pesszimista):**
- Recurring: **~€28.000** (~11M Ft)
- Implementation: **~€8.000** (~3.1M Ft)
- **Összesen: ~€36.000** (~14.1M Ft)

**Ha 2xelés sikerül (2. év):**
- 40+ ügyfél → recurring: **~€8.000/hó** (€96.000/év → ~37.7M Ft)
- Implementation: **~€15.000/év**
- **Összesen: ~€111.000** (~43.6M Ft)

---

## 7. TEENDŐK — AZONNAL (a kód szintjén)

| # | Feladat | Fájl(ok) | Prioritás | Cross-ref |
|---|---------|----------|-----------|-----------|
| **P-01** | Landing page: Starter kártya hozzáadása | `app/(marketing)/page.tsx` | 🔴 | [05-ROADMAP.md](./05-ROADMAP.md) §A1 |
| **P-02** | Landing page: "€" dupla szimbólum bug javítás (L196) | `app/(marketing)/page.tsx` | 🔴 | [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) §BUG-01 |
| **P-03** | Landing page: "Get Started" → "Érdeklődöm" / "Ajánlatot kérek" | `app/(marketing)/page.tsx`, i18n | 🟡 | — |
| **P-04** | Landing page: "Az árak tájékoztató jellegűek" footer | `app/(marketing)/page.tsx`, i18n | 🟡 | — |
| **P-05** | ~~`tiers.ts`: Starter tier hozzáadása~~ | `lib/license/tiers.ts` | ✅ KÉSZ | Phase 1 |
| **P-06** | ~~`tiers.ts`: `invoicing` hozzáadás starter-hez~~ | `lib/license/tiers.ts` | ✅ KÉSZ | Phase 1 |
| **P-07** | ~~`tiers.ts`: `digital-twin` hozzáadás enterprise-hoz~~ | `lib/license/tiers.ts` | ✅ KÉSZ | Phase 1 |
| **P-08** | ~~Bryan dokumentumok archiválása VAGY ár-frissítés~~ | `docs/BRYAN_*.md` | ✅ KÉSZ | — |
| **P-09** | Szektor-tab a landing page pricing szekción | `app/(marketing)/page.tsx` | 🟢 | [05-ROADMAP.md](./05-ROADMAP.md) §C1 |
| **P-10** | Implementációs díj szekció a landing page-en | `app/(marketing)/page.tsx`, i18n | 🟢 | [05-ROADMAP.md](./05-ROADMAP.md) §C1 |

---

*Következő dokumentum: [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — Ismert hibák teljes listája*
