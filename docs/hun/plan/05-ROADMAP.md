# 05 — FEJLESZTÉSI ÜTEMTERV & FÜGGŐSÉGEK

> **Verzió:** 2.0 | **Dátum:** 2026-03-14 | **Státusz:** AKTÍV
> **Időbecslés:** AI fejlesztő modell végrehajtási ideje (NEM emberi csapat)
> **Szabály:** NINCS technikai adósság. Minden fázis 100%-os minőségben készül el.
> **Kapcsolódó dokumentumok:**
> - [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) — Árak és tier struktúra
> - [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — Javítandó hibák (Phase 0)
> - [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) — Szektordefiníciók
> - [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) — Technikai specifikációk

---

## ÁTTEKINTÉS

```
┌─────────────────────────────────────────────────────────────┐
│                    FEJLESZTÉSI FÁZISOK                      │
│                                                             │
│ ◉ Phase 0: STABILIZÁLÁS ─────┐                              │
│   Bug-ok, performance,       │                              │
│   PDF, landing page          │                              │
│                              ▼                              │
│ ◉ Phase 1: ALAPOK ─────────────┐                            │
│   Starter tier, tiers.ts,      │                            │
│   landing redesign             │                            │
│                                ▼                            │
│ ◉ Phase 2: KERESKEDELEM ──────────┐                         │
│   purchasing + pos modulok        │                         │
│                                   ▼                         │
│ ◉ Phase 3: SZOLGÁLTATÁS ────────────┐                       │
│   crm + worksheets modulok         │                       │
│                                     ▼                       │
│ ◉ Phase 4: SZEKTOR PRESET ────────────┐                     │
│   Szektor rendszer + landing tabs     │                     │
│                                       ▼                     │
│ ◉ Phase 5: NICHE MODULOK ──────────────┐                    │
│   recipes + appointments + projects     │                    │
│                                         ▼                   │
│ ◉ Phase 6: INTEGRÁCIÓK ──────────────────┐                  │
│   e-commerce + API gateway               │                  │
│                                          ▼                  │
│ ◉ Phase 7: OPTIMALIZÁLÁS ────────────────────               │
│   Performance, caching, PWA                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 0: STABILIZÁLÁS — "Hibamentes alap"

> **Cél:** Az összes ismert hibát javítani MIELŐTT bármilyen új fejlesztés indul.
> **Hivatkozás:** [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — teljes lista
> **Becsült idő:** 7-8 AI óra

### Feladatok

| Kód | Feladat | Fájl(ok) | AI idő | Függ. |
|-----|---------|----------|--------|-------|
| **A0-01** | Dupla € javítás (BUG-01) | `app/(marketing)/page.tsx` L29-48, L196 | 5 perc | — |
| **A0-02** | `invoicing` + `digital-twin` hozzáadás TIER_MODULES-hoz (BUG-04) | `lib/license/tiers.ts` | 5 perc | — |
| **A0-03** | `sap-import` tier fix (BUG-06) | `lib/license/tiers.ts`, `modules/sap-import/manifest.ts` | 5 perc | A0-02 |
| **A0-04** | `force-dynamic` eltávolítás layout-ból (PERF-01) | `app/dashboard/layout.tsx`, `page.tsx` | 15 perc | — |
| **A0-05** | Dupla session validálás javítás (PERF-02) | `app/dashboard/page.tsx` + összes dashboard page | 20 perc | A0-04 |
| **A0-06** | Landing page error boundary (BUG-02) | `hooks/useTranslation.ts`, `app/(marketing)/page.tsx` | 30 perc | — |
| **A0-07** | Nyelvváltás cache delay javítás (BUG-03) | `lib/i18n/index.ts`, `components/core/LanguageSwitcher.tsx` | 15 perc | — |
| **A0-08** | `lac-napi-perces` route cleanup (BUG-07) | `app/api/napi-perces/`, `app/dashboard/napi-perces/` | 10 perc | — |
| **A0-09** | Szellemmodulok stub (BUG-05) | `modules/api-gateway/manifest.ts`, `modules/multi-site/manifest.ts` | 30 perc | A0-02 |
| **A0-10** | @react-pdf/renderer bevezetés (BUG-12) | `package.json`, `modules/invoicing/lib/`, `public/fonts/` | 2 óra | — |
| **A0-11** | Invoice PDF i18n (BUG-08) | `modules/invoicing/lib/pdf-generator.ts`, i18n JSONs | 1 óra | A0-10 |
| **A0-12** | Delivery `Ft` hardcoded fix (BUG-09) | `modules/delivery/components/DashboardPage.tsx` | 10 perc | — |
| **A0-13** | HudFrame + Header locale fix (BUG-11) | `components/core/HudFrame.tsx`, `Header.tsx` | 15 perc | — |
| **A0-14** | Excel import hibák (BUG-10) | `lib/import/pipeline.ts` | 1 óra | — |
| **A0-15** | NeuronBackground optimalizálás (PERF-04) | `NeuronBackground.tsx`, landing page, dashboard layout | 20 perc | — |
| **A0-16** | getSetting bulk query (PERF-05) | `lib/settings.ts` | 30 perc | — |
| **A0-17** | DB pool audit (PERF-03) | `lib/db/getPool.ts`, `MssqlAdapter.ts` | 30 perc | — |

### Phase 0 végrehajtási sorrend (dependency-aware)

```
Batch 1 (párhuzamosítható — nincs egymás közti függőség):
├── A0-01: Dupla € fix
├── A0-04: force-dynamic
├── A0-06: Landing error boundary
├── A0-07: Nyelv cache
├── A0-08: lac-napi-perces cleanup
├── A0-10: @react-pdf bevezetés
├── A0-12: Delivery Ft
├── A0-13: HudFrame locale
├── A0-14: Excel import
├── A0-15: NeuronBackground
├── A0-16: getSetting bulk
└── A0-17: DB pool audit

Batch 2 (Batch 1 eredményeire épül):
├── A0-02: TIER_MODULES fix (→ A0-03 és A0-09 blokkolja)
├── A0-05: Session validálás (A0-04-re épül)
└── A0-11: PDF i18n (A0-10-re épül)

Batch 3:
├── A0-03: sap-import tier (A0-02-re épül)
└── A0-09: Szellemmodulok (A0-02-re épül)
```

### Phase 0 BEFEJEZÉSI KRITÉRIUM

- [ ] Minden BUG (01-14) javítva és tesztelve
- [ ] Minden PERF (01-05) javítva és mérve
- [ ] Landing page renderelés 100% megbízható
- [ ] Dashboard betöltési idő < 2s (jelenlegi mérés szükséges)
- [ ] PDF export működik @react-pdf-el (magyar ékezetekkel)
- [ ] Frissíteni: [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) — minden javított tételnél ⬜ JAVÍTVA + dátum

---

## PHASE 1: ALAPOK — "Új tier + landing"

> **Cél:** Starter tier + landing page frissítés az új árstruktúrával
> **Becsült idő:** 3-4 AI óra
> **Előfeltétel:** Phase 0 KÉSZ

### Feladatok

| Kód | Feladat | Fájl(ok) | AI idő | Függ. |
|-----|---------|----------|--------|-------|
| **A1-01** | Starter tier hozzáadás `tiers.ts`-hez | `lib/license/tiers.ts` | 15 perc | Phase 0 |
| **A1-02** | `LicenseTier` típus bővítés `'starter'`-rel | `lib/license/tiers.ts`, minden hely ahol `LicenseTier` típust használják | 30 perc | A1-01 |
| **A1-03** | `TIER_LABELS`, `TIER_COLORS`, `TIER_MAX_USERS` Starter sor | `lib/license/tiers.ts` | 5 perc | A1-01 |
| **A1-04** | Landing page: 4 pricing kártya (Starter+3) | `app/(marketing)/page.tsx` | 45 perc | A1-01 |
| **A1-05** | Landing page: "Érdeklődöm" gomb (nem "Get Started") | `app/(marketing)/page.tsx`, i18n JSONs | 15 perc | A1-04 |
| **A1-06** | Landing page: "Az árak tájékoztató jellegűek" disclaimer | `app/(marketing)/page.tsx`, i18n JSONs | 10 perc | A1-04 |
| **A1-07** | Landing page: implementációs díj szekció | `app/(marketing)/page.tsx`, i18n JSONs | 30 perc | A1-04 |
| **A1-08** | ADDON_MODULES struktúra hozzáadás | `lib/license/tiers.ts` | 20 perc | A1-01 |
| **A1-09** | License check: `isModuleAllowed()` frissítés add-on támogatásra | `lib/license/`, `lib/modules/registry.ts` | 30 perc | A1-08 |
| **A1-10** | Admin panel: Starter tier kezelés, add-on modulok toggle | `components/admin/modules/` | 45 perc | A1-08 |
| **A1-11** | Tesztelés: Starter user login → csak 4 modult lát | manuális teszt | 15 perc | A1-10 |

### Phase 1 végrehajtási sorrend

```
A1-01 → A1-02 → A1-03 → A1-08 → A1-09 → A1-10 → A1-11
                    ↓
A1-04 → A1-05 → A1-06 → A1-07
```

### Phase 1 BEFEJEZÉSI KRITÉRIUM

- [ ] `LicenseTier` tartalmazza a `'starter'` értéket
- [ ] `TIER_MODULES.starter` = `['inventory', 'invoicing', 'reports', 'file-import']`
- [ ] Landing page 4 kártyát mutat (€99 / €299 / €599 / €1.199)
- [ ] "Get Started" → "Érdeklődöm" / "Request a Quote"
- [ ] Starter user csak a 4 alap modult látja a dashboard-on
- [ ] ADDON_MODULES definiálva és az admin panelben kezelhető
- [ ] Frissíteni: [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §7 — befejezett teendők jelölés

---

## PHASE 2: KERESKEDELEM — "Bolt kiszolgálása"

> **Cél:** `purchasing` + `pos` modulok → kiskereskedelem szektorra kész
> **Becsült idő:** 7-10 AI óra
> **Előfeltétel:** Phase 1 KÉSZ
> **Spec:** [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §MODUL 1-2

### Feladatok

| Kód | Feladat | AI idő | Spec hivatkozás |
|-----|---------|--------|-----------------|
| **A2-01** | `purchasing` manifest + _loader import | 5 perc | §0.2, §1.1 |
| **A2-02** | `purchasing` SQL migráció | 15 perc | §1.3 |
| **A2-03** | `purchasing` API route-ok (suppliers CRUD + orders CRUD + receive/approve) | 2 óra | §1.4-1.5 |
| **A2-04** | `purchasing` DashboardPage (3 tab: rendelések, beszállítók, javaslatok) | 1.5 óra | §1.6 |
| **A2-05** | `purchasing` → `inventory` integráció (beérkezés → stock update) | 30 perc | §1.7 |
| **A2-06** | `purchasing` i18n kulcsok (HU/EN/DE) | 20 perc | §1.8 |
| **A2-07** | `pos` manifest + _loader import | 5 perc | §2.1 |
| **A2-08** | `pos` SQL migráció | 15 perc | §2.3 |
| **A2-09** | `pos` API route-ok (sell, refund, close-day, product-search) | 1.5 óra | §2.4 |
| **A2-10** | `pos` DashboardPage (POS felület, touchscreen) | 2 óra | §2.6 |
| **A2-11** | `pos` → `inventory` integráció (eladás → stock csökkentés) | 30 perc | §2.5 |
| **A2-12** | `pos` → `invoicing` integráció (számla generálás ha kell) | 30 perc | §2.5 |
| **A2-13** | `pos` i18n kulcsok (HU/EN/DE) | 15 perc | — |
| **A2-14** | `tiers.ts` frissítés — `purchasing` + `pos` a Basic-be | 5 perc | §4.2 |
| **A2-15** | End-to-end teszt: vásárlás → készletcsökkentés → számla | 30 perc | manuális |

### Phase 2 BEFEJEZÉSI KRITÉRIUM

- [ ] `purchasing` modul: beszállító CRUD, rendelés CRUD, beérkezés → inventory update
- [ ] `pos` modul: eladás felület, fizetési mód választás, készlet csökkentés, napi zárás
- [ ] Mindkét modul: magyar/angol/német i18n
- [ ] TIER_MODULES.basic tartalmazza mindkettőt
- [ ] E2E: termék felvétel → POS eladás → készlet csökken → beszerzési javaslat megjelenik
- [ ] Frissíteni: jelen dokumentum — Phase 2 ✅

---

## PHASE 3: SZOLGÁLTATÁS — "Szerviz kiszolgálása"

> **Cél:** `crm` + `worksheets` modulok → szolgáltatás + építőipari szektorra kész
> **Becsült idő:** 7-9 AI óra
> **Előfeltétel:** Phase 2 KÉSZ (mert worksheets → inventory integráció hasonló mint purchasing)
> **Spec:** [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §MODUL 3-4

### Feladatok

| Kód | Feladat | AI idő |
|-----|---------|--------|
| **A3-01** | `crm` manifest + _loader + tiers.ts (professional) | 5 perc |
| **A3-02** | `crm` SQL migráció (customers, interactions, opportunities, reminders) | 15 perc |
| **A3-03** | `crm` API route-ok (11 endpoint) | 1.5 óra |
| **A3-04** | `crm` DashboardPage (ügyfél lista, ügyfél detail, pipeline nézet) | 2 óra |
| **A3-05** | `crm` i18n kulcsok (HU/EN/DE) | 20 perc |
| **A3-06** | `worksheets` manifest + _loader + tiers.ts (professional) | 5 perc |
| **A3-07** | `worksheets` SQL migráció (orders, labor, materials) | 15 perc |
| **A3-08** | `worksheets` API route-ok (9 endpoint + invoice generate) | 1.5 óra |
| **A3-09** | `worksheets` DashboardPage (lista, form, munkalap detail) | 2 óra |
| **A3-10** | `worksheets` → `inventory` integráció (anyag → stock csökkentés) | 30 perc |
| **A3-11** | `worksheets` → `invoicing` integráció (munkalap → számla) | 30 perc |
| **A3-12** | `worksheets` → `crm` integráció (ügyfélválasztó CRM-ből) | 20 perc |
| **A3-13** | `worksheets` ügyfél aláírás (canvas → base64) | 30 perc |
| **A3-14** | `worksheets` PDF generálás (@react-pdf) | 1 óra |
| **A3-15** | `worksheets` + `crm` i18n kulcsok | 20 perc |
| **A3-16** | End-to-end teszt: ügyfél → munkalap → anyagfelhasználás → számla | 30 perc |

### Phase 3 BEFEJEZÉSI KRITÉRIUM

- [ ] `crm`: CRUD ügyfelek, interakciók, pipeline (drag & drop stage change)
- [ ] `worksheets`: munkalap CRUD, munkaóra + anyag nyilvántartás, ügyfél aláírás, PDF, → számla
- [ ] Integráció: CRM ügyfél → worksheets ügyfélválasztó
- [ ] Integráció: worksheets anyag → inventory stock update
- [ ] Integráció: worksheets → invoicing számla generálás

---

## PHASE 4: SZEKTOR PRESET — "Iparágra szabott"

> **Cél:** Szektorspecifikus preset rendszer + landing page szektor tab-ok
> **Becsült idő:** 4-5 AI óra
> **Előfeltétel:** Phase 3 KÉSZ (mert a szektorok a Phase 2-3 modulokra hivatkoznak)
> **Spec:** [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) §5

### Feladatok

| Kód | Feladat | AI idő |
|-----|---------|--------|
| **A4-01** | `core_sector_presets` tábla migráció | 15 perc |
| **A4-02** | Preset definíciók (6 szektor) seeder | 20 perc |
| **A4-03** | Setup wizard: szektor választó lépés | 1 óra |
| **A4-04** | Setup wizard: szektor → modul auto-konfiguráció | 30 perc |
| **A4-05** | Landing page: szektor tab-ok a pricing szekció felett | 1 óra |
| **A4-06** | Landing page: tab-kattintás → modul lista frissítés a kártyákon | 45 perc |
| **A4-07** | i18n: szektor nevek (6 szektor × 3 nyelv) | 15 perc |
| **A4-08** | Admin panel: szektor preset szerkesztés | 45 perc |
| **A4-09** | `ModuleManifest` bővítés: `sector?: string[]`, `comingSoon?`, `isAddon?` | 20 perc |
| **A4-10** | Meglévő manifest.ts fájlok frissítése sector mezővel | 30 perc |

---

## PHASE 5: NICHE MODULOK — "Minden szektornak kell valami"

> **Cél:** `recipes` + `appointments` + `projects` add-on modulok
> **Becsült idő:** 8-12 AI óra
> **Előfeltétel:** Phase 2-3 KÉSZ (mert inventory integráció újra használt)
> **Spec:** [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §MODUL 5-7

### Feladatok

| Kód | Feladat | AI idő |
|-----|---------|--------|
| **A5-01** | `recipes` — teljes modul (manifest, migration, API, DashboardPage) | 3 óra |
| **A5-02** | `recipes` — gyártás flow (→ inventory csökkentés) | 30 perc |
| **A5-03** | `recipes` — i18n | 15 perc |
| **A5-04** | `appointments` — teljes modul (manifest, migration, API, DashboardPage) | 3 óra |
| **A5-05** | `appointments` — naptár UI (heti/napi nézet) | 1 óra |
| **A5-06** | `appointments` — i18n | 15 perc |
| **A5-07** | `projects` — teljes modul (manifest, migration, API, DashboardPage) | 3 óra |
| **A5-08** | `projects` — Kanban nézet (drag & drop) | 1 óra |
| **A5-09** | `projects` — költségvetés vs. tényleges riport | 30 perc |
| **A5-10** | `projects` — i18n | 15 perc |
| **A5-11** | Add-on aktiválás teszt (admin → add-on toggle → modul megjelenik) | 30 perc |

---

## PHASE 6: INTEGRÁCIÓK — "Digitális kapcsolódás"

> **Cél:** `e-commerce` + `api-gateway` — külső rendszerek szinkronizálása
> **Becsült idő:** 8-10 AI óra
> **Előfeltétel:** Phase 2 + Phase 4 KÉSZ
> **Spec:** [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) §MODUL 8

### Feladatok

| Kód | Feladat | AI idő |
|-----|---------|--------|
| **A6-01** | `e-commerce` — teljes modul (manifest, migration, API, UI) | 4 óra |
| **A6-02** | WooCommerce adapter (REST API v3 kliens) | 2 óra |
| **A6-03** | Shopify adapter (Admin API kliens) | 2 óra |
| **A6-04** | Szinkronizáció scheduler (cron → stock sync) | 1 óra |
| **A6-05** | `api-gateway` — "Coming Soon" → funkcionális modul (REST API key management) | 3-4 óra |
| **A6-06** | i18n | 30 perc |

---

## PHASE 7: OPTIMALIZÁLÁS — "Gyors és zökkenőmentes"

> **Cél:** Teljesítmény finomhangolás, PWA fejlesztés, monitoring
> **Becsült idő:** 4-6 AI óra
> **Előfeltétel:** Phase 0-5 KÉSZ

### Feladatok

| Kód | Feladat | AI idő |
|-----|---------|--------|
| **A7-01** | Service Worker frissítés (SW cache stratégia: statikus asset → cache-first) | 1 óra |
| **A7-02** | Offline fallback oldal (PWA) | 30 perc |
| **A7-03** | NeuronBackground → OffscreenCanvas + Worker | 1.5 óra |
| **A7-04** | Dashboard adatbetöltés optimalizálás (React.cache, parallel fetch) | 1 óra |
| **A7-05** | CSP szigorítás (unsafe-inline/unsafe-eval eltávolítás) | 1 óra |
| **A7-06** | Edge auth middleware (session check a middleware-ben) | 30 perc |
| **A7-07** | Lighthouse audit → 90+ score cél | mérés |

---

## FÜGGŐSÉGI GRÁF

```
Phase 0 ─────────────────────────────→ KÖTELEZŐ ELSŐ LÉPÉS
    │
    ▼
Phase 1 (Starter tier + landing)
    │
    ├──▶ Phase 2 (purchasing + pos)
    │        │
    │        ▼
    │    Phase 3 (crm + worksheets) ──▶ Phase 4 (szektor preset)
    │        │
    │        ▼
    │    Phase 5 (recipes, appointments, projects)
    │
    └──▶ Phase 6 (e-commerce, api-gateway) ←── Phase 2 szükséges
              │
              ▼
          Phase 7 (optimalizálás) ←── Minden más KÉSZ
```

**Párhuzamosítható:**
- Phase 2 + Phase 3 részben párhuzamosítható (ha az inventory integráció közös lib-be kerül Phase 2-ben)
- Phase 5 és Phase 6 PÁRHUZAMOSÍTHATÓ (nincs közös dependency)

---

## IDŐBECSLÉS ÖSSZESÍTŐ

| Phase | Cél | AI óra | Megjegyzés |
|-------|-----|--------|------------|
| Phase 0 | Stabilizálás | **7-8 óra** | 17 bug/perf javítás |
| Phase 1 | Starter + landing | **3-4 óra** | Tier rendszer + UI |
| Phase 2 | purchasing + pos | **7-10 óra** | 2 új modul |
| Phase 3 | crm + worksheets | **7-9 óra** | 2 új modul |
| Phase 4 | Szektor preset | **4-5 óra** | Rendszer + landing |
| Phase 5 | recipes + appointments + projects | **8-12 óra** | 3 add-on modul |
| Phase 6 | e-commerce + api-gateway | **8-10 óra** | 2 integrációs modul |
| Phase 7 | Optimalizálás | **4-6 óra** | Performance + PWA |
| **ÖSSZESEN** | | **~48-64 AI óra** | |

**Összehasonlítás emberi csapattal:**
- 5 fős csapat: ~6-8 hónap
- AI (Claude): ~48-64 óra effektív munkaidő → **~2-3 hét** reális időkeretben (napi 4-6 óra AI interakció)

---

## DOKUMENTÁCIÓ KARBANTARTÁS

### MINDEN Phase befejezésekor frissítendő dokumentumok

| Dokumentum | Mit kell frissíteni |
|-----------|-------------------|
| [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md) | Javított hibáknál: ⬜ JAVÍTVA + dátum |
| [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) | Mérföldkövek státusz frissítés |
| [04-MODULE_SPECS.md](./04-MODULE_SPECS.md) | Implementált moduloknál: verzió, eltérések dokumentálás |
| **Jelen dokumentum** | Phase státusz: ✅ KÉSZ + dátum |
| `lib/license/tiers.ts` | Tier modulok frissítés |
| `modules/_loader.ts` | Új modul import |
| `lib/i18n/locales/*.json` | Új i18n kulcsok |

### Utasítás a végrehajtó AI modellnek:

> **FONTOS:** Amikor egy Phase-t befejezesz, a kód commitolása UTÁN:
> 1. Frissítsd a jelen dokumentum ({this}) megfelelő Phase-ét: `✅ KÉSZ — [dátum]`
> 2. Frissítsd a [02-KNOWN_BUGS.md](./02-KNOWN_BUGS.md)-t ha bug-ot javítottál
> 3. Ha a specifikációtól eltértél (más táblanév, plusz mező, stb.) → frissítsd a [04-MODULE_SPECS.md](./04-MODULE_SPECS.md)-t is
> 4. NE hagyj frissítetlen dokumentumot — a következő Phase erre épít!

---

## FÁZIS STÁTUSZ

| Phase | Státusz | Dátum |
|-------|---------|-------|
| Phase 0 | ⏳ VÁRAKOZIK | — |
| Phase 1 | ⏳ VÁRAKOZIK | — |
| Phase 2 | ⏳ VÁRAKOZIK | — |
| Phase 3 | ⏳ VÁRAKOZIK | — |
| Phase 4 | ⏳ VÁRAKOZIK | — |
| Phase 5 | ⏳ VÁRAKOZIK | — |
| Phase 6 | ⏳ VÁRAKOZIK | — |
| Phase 7 | ⏳ VÁRAKOZIK | — |

---

*Ez az utolsó tervdokumentum. A teljes dokumentáció-készlet:*
*01 → Árak | 02 → Hibák | 03 → Bővítés | 04 → Modulok | 05 → Ütemterv*
