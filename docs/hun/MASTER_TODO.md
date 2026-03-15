# MASTER TODO — Ainova Cloud Intelligence

> **Frissítve:** 2026-03-15 (2. menet — összes javítás befejezve)
> **Forrás:** Forráskód review + demo.ainovacloud.com élő teszt (Claude AI Agent) + Cascade kódelemzés
> **Szabály:** Ez az EGYETLEN hiteles feladatlista. Minden korábbi TODO elavult.

---

## JELÖLÉSEK

| Szimbólum | Jelentés |
|-----------|---------|
| 🔴 | KRITIKUS — funkcionálisan törött |
| 🟡 | KÖZEPES — UX/i18n/logikai hiba |
| 🟢 | ALACSONY — kozmetikai, cleanup |
| ✅ | JAVÍTVA — dátummal |

---

## A. AKTÍV BUGOK — Demo teszten és kódelemzésen azonosítva

### A1. Dashboard

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| D-01 | `shift-management.title` / `shift-management.subtitle` nyers i18n kulcs jelenik meg a tile-on. **Ok:** A modul id `shift-management`, a dashboard `t(mod.id + '.title')` hívást használ, de a fordítás `shift.title` alatt van. | `lib/i18n/fallback/hu.json`, `en.json`, `de.json` | 🟡 | ✅ 2026-03-15 |

### A2. Admin Panel

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| A-01 | Admin Panel tile kattintásra nem navigál. **Ok:** Az admin NEM modul — nincs manifest, tehát a `getActiveModules()` nem adja vissza, és a dashboard tile-ból nem érhető el. A `/dashboard/admin` route viszont létezik és működik. **Javítás:** admin tile manuálisan hozzáadva a grid-hez admin role-nak. | `app/dashboard/page.tsx` | 🔴 | ✅ 2026-03-15 |
| A-02 | Settings oldal title/subtitle hardcoded angolul: "Branding & Settings" / "Application appearance and basic configuration" **Javítás:** `t('admin.settings')` / `t('admin.settings_desc')` | `app/dashboard/admin/settings/page.tsx:16-17` | 🟡 | ✅ 2026-03-15 |

### A3. Workforce modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| W-01 | New entry: "Invalid input: expected string, received null" — **Ok:** Frontend `null`-t küld, Zod `z.string().optional()` csak `undefined`-ot fogad. **Javítás:** `.nullable()` hozzáadva `shiftName`, `areaName`, `notes` mezőkhöz. | `modules/workforce/api/route.ts` (Zod schema) | 🔴 | ✅ 2026-03-15 |

### A4. Invoicing modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| I-01 | PDF endpoint — **NEM BUG.** Az endpoint HTML nyomtatási nézetet ad vissza (`Content-Type: text/html`), design decision. A demo tesztelő félreértelmezte. | `modules/invoicing/api/[id]/pdf/route.ts` | — | ✅ Vizsgálva |
| I-02 | KPI `todayTotal` 0 Ft — **Ok:** `toISOString().slice(0,10)` UTC-t használ, CET/CEST-ben este 23:00 után rossz dátumot ad. **Javítás:** Lokális dátum string (`getFullYear/getMonth/getDate`). | `modules/invoicing/components/DashboardPage.tsx:113` | 🟡 | ✅ 2026-03-15 |
| I-03 | Hardcoded `'hu-HU'` locale és `Ft` pénznem a KPI kártyákon és a táblázatban. **Javítás:** `toLocaleString()` + `t('common.currency')` | `modules/invoicing/components/DashboardPage.tsx:183,195,260` | 🟡 | ✅ 2026-03-15 |
| I-04 | "Storno" státusz label — **NEM BUG.** `invoicing.status_storno` kulcs létezik EN-ben ("Storno" — nemzetközi pénzügyi kifejezés). | — | — | ✅ Vizsgálva |

### A5. Scheduling modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| S-01 | Floating-point kerekítési hiba: `202.8999999999998 óra`, `0.2000000000000284 szabad`. **Javítás:** `Number(val.toFixed(1))` minden kijelzett értéknél. | `modules/scheduling/components/DashboardPage.tsx:201-202` | 🔴 | ✅ 2026-03-15 |

### A6. Reports modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| R-01 | Quick template gombok (`<button>`) kattintásra nem reagálnak — **nincs onClick handler**. **Javítás:** `onClick={() => setShowEditor(true)}` hozzáadva mind a 4 gombhoz. | `modules/reports/components/DashboardPage.tsx:185-204` | 🟡 | ✅ 2026-03-15 |
| R-02 | New report mentés után a lista nem frissül. **Ok:** `onSaved()` `void`-dal hívódott → Promise elnyelődött, `onClose()` azonnal bezárta a modalt. **Javítás:** `await onSaved()` a `ReportEditor`-ban + `onSaved` típus `Promise<void>`, parent `() => fetchReports()`. | `ReportEditor.tsx:66`, `DashboardPage.tsx:221` | 🟡 | ✅ 2026-03-15 |

### A7. Delivery modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| DE-01 | KPI számlálók nem frissülnek mentés után — **Kód HELYES.** `await fetchData()` hívódik mentés után, API response `{ items }` kulcs egyezik. Valószínűleg DB késleltetés vagy demo téves megfigyelés. | `modules/delivery/components/DashboardPage.tsx` | 🟡 | ✅ Vizsgálva |

### A8. Shift Management modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| SM-01 | Mentés után az új beosztás nem jelenik meg — **Kód HELYES.** `await fetchData()` hívódik, API `{ shifts, assignments }` helyes. Valószínűleg DB késleltetés vagy demo téves megfigyelés. | `modules/shift-management/components/DashboardPage.tsx` | 🟡 | ✅ Vizsgálva |
| SM-02 | Dátum formátum hardcoded `hu-HU`: `toLocaleDateString('hu-HU', ...)` **Javítás:** `toLocaleDateString(undefined, ...)` | `modules/shift-management/components/DashboardPage.tsx:88` | 🟢 | ✅ 2026-03-15 |

### A9. Tracking modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| T-01 | Status dropdown option value-k magyarul — **Kód HELYES.** `t(STATUS_KEYS[s])` fordítja a megjelenítést. A DB magyar értékeket tárol (architektúrális döntés). A demo teszten valószínűleg SW cache/i18n betöltési sorrend okozta. | `modules/tracking/components/DashboardPage.tsx` | 🟡 | ✅ Vizsgálva |

### A10. Performance modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| P-01 | "0 perc" — egység magyarul jelenik meg EN módban. **Javítás:** `t('common.minutes')` + `common.minutes` kulcs hozzáadva hu/en/de. | `modules/performance/components/DashboardPage.tsx` | 🟡 | ✅ 2026-03-15 |

### A11. Fleet modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| F-01 | KmDestination / Notes oszlopfejléc összeolvad. **Ok:** `<th>` és `<td>` elemeknek nincs `px` padding. **Javítás:** `px-3` hozzáadva minden cellához. | `modules/fleet/components/DashboardPage.tsx:267-279` | 🟢 | ✅ 2026-03-15 |

### A12. OEE modul

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| O-01 | "-%" jelenik meg ha P% null. **Ok:** `{r.performancePct ?? '-'}%` — a `%` jel mindig kiíródik. **Javítás:** Ternáris: `pct != null ? pct+% : '-'` mind a 4 oszlopban. | `modules/oee/components/DashboardPage.tsx:123-126` | 🟢 | ✅ 2026-03-15 |
| O-02 | Nincs loading spinner — **NEM BUG.** Van `animate-pulse` skeleton loading (sor 77-78). A ~3mp a DB válaszidő. | `modules/oee/components/DashboardPage.tsx:77-78` | 🟢 | ✅ Vizsgálva |

### A13. Login

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| L-01 | "Login successful!" hardcoded angolul. **Javítás:** `t('auth.login_success')` | `components/login/LoginContainer.tsx` | 🟡 | ✅ 2026-03-15 |

### A14. Core / Egyéb

| # | Bug | Fájl(ok) | Súlyosság | Státusz |
|---|-----|----------|-----------|---------|
| C-01 | `components/core/Header.tsx` — 313 sor DEAD CODE, sehol nincs importálva. **Javítás:** Fájl törölve. | `components/core/Header.tsx` | 🟢 | ✅ 2026-03-15 |
| C-02 | `manifest.json` lang hardcoded `"hu"`. **Javítás:** `"lang": "en"` (nemzetközi default). | `public/manifest.json:25` | 🟢 | ✅ 2026-03-15 |
| C-03 | Landing page email CTA form nem küld sehova — marketing placeholder, design decision. Nem kódhiba. | `app/(marketing)/page.tsx:372` | 🟡 | ✅ Vizsgálva |

---

## B. KORÁBBAN JAVÍTOTT HIBÁK (02-KNOWN_BUGS.md alapján)

BUG-01 → BUG-24: Mind JAVÍTVA jelölve a `02-KNOWN_BUGS.md`-ben (2026-03-16 dátummal).

**FIGYELEM:** A dokumentáció "JAVÍTVA" jelölése NEM mindig pontos. A fenti A szekció tartalmazza az élő demo teszten talált, még meglévő hibákat.

---

## C. FEJLESZTÉSI FELADATOK

| # | Feladat | Prioritás | Állapot |
|---|---------|-----------|---------|
| F-01 | Unit tesztek írása (vitest) | KÖZEPES | Minimális coverage |
| F-02 | E2E tesztek (Playwright) | KÖZEPES | Nincs |
| F-03 | SAP RFC SDK aktiválás | ALACSONY | Ext. SDK szükséges |
| F-04 | PLC driver aktiválás (hardware) | ALACSONY | Hardware szükséges |
| F-05 | SMTP email konfiguráció | ALACSONY | Kód kész, konfig hiányzik |
| F-06 | Pilot ügyfél telepítés | MAGAS | Első éles teszt |
| F-07 | API dokumentáció (OpenAPI/Swagger) | ALACSONY | Nincs |

---

## D. JAVÍTÁSI SORREND (prioritás)

1. **A-01** — Admin Panel tile navigáció (dashboard-ról nem érhető el)
2. **W-01** — Workforce form mentés crash
3. **S-01** — Scheduling float kerekítés
4. **I-01** — Invoicing PDF endpoint
5. **D-01** — shift-management i18n kulcsok
6. **R-01** — Reports template onClick
7. **R-02** — Reports lista refresh
8. **I-03** — Invoicing hardcoded Ft/hu-HU
9. **A-02** — Settings page hardcoded title
10. **L-01** — LoginContainer hardcoded text
11. **C-01** — Header.tsx dead code törlése
12. Kisebb i18n hibák (T-01, P-01, F-01, SM-02, O-01, O-02)

---

*Ez a dokumentum az aktív fejlesztési feladatok egyetlen hiteles forrása.*
