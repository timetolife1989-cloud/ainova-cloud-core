# EGYSÉGES FELADATLISTA — Ainova Cloud Intelligence

> **Létrehozva:** 2026-03-15 | **Utolsó frissítés:** 2026-03-15
> **Forrás:** 65 MD fájl átvizsgálása (13 TASKS_FOR_AI.md + 15 plan/ dokumentum + MASTER_TODO + HELYZETKEP + FUTURE_ROADMAP)
> **Szabály:** Ez az EGYETLEN hiteles, összesített feladatlista. Minden korábbi TODO/feladatlista elavult.

---

## JELÖLÉSEK

| Szimbólum | Jelentés |
|-----------|---------|
| 🔴 | KRITIKUS — azonnal szükséges |
| 🟡 | KÖZEPES — fontos de nem blokkoló |
| 🟢 | ALACSONY — nice-to-have |
| ⏳ | Külső függőség (hardver, SDK, konfig) |

---

## A. I18N / LOKALIZÁCIÓ (12 feladat)

> **Forrás:** TASKS_FOR_AI.md × 13 modul + HELYZETKEP + 04-UI-UX

| # | Feladat | Modul | Fájl/Hely | Prioritás |
|---|---------|-------|-----------|-----------|
| i18n-01 | ✅ Hardcoded 'hu-HU' locale + 'Ft' → `t('common.currency')` | worksheets | `modules/worksheets/components/DashboardPage.tsx` | ✅ |
| i18n-02 | Hibakód nevek lokalizálása (részleges) | quality | `modules/quality/components/` | 🟡 |
| i18n-03 | ✅ Hardcoded 'hu-HU' locale + 'Ft' → `t('common.currency')` | crm | `modules/crm/components/DashboardPage.tsx` | ✅ |
| i18n-04 | Dashboard label-ek lokalizálása (magyar → i18n kulcsok) | lac-napi-perces | `modules/lac-napi-perces/components/` | 🟡 |
| i18n-05 | Chart axis és tooltip szövegek lokalizálása | lac-napi-perces | `modules/lac-napi-perces/components/` | 🟡 |
| i18n-06 | Import státusz üzenetek lokalizálása | lac-napi-perces | `modules/lac-napi-perces/components/` | 🟡 |
| i18n-07 | Jármű típus nevek lokalizálása (részleges) | fleet | `modules/fleet/components/` | 🟢 |
| i18n-08 | Hibaüzenetek lokalizálása (részleges) | workforce | `modules/workforce/components/` | 🟢 |
| i18n-09 | Státusz nevek lokalizálása (részleges) | tracking | `modules/tracking/components/` | 🟢 |
| i18n-10 | Form hibaüzenetek i18n kulcsokra cserélése | tracking | `modules/tracking/components/` | 🟢 |
| i18n-11 | Form hibaüzenetek i18n kulcsokra cserélése | shift-management | `modules/shift-management/components/` | 🟢 |
| i18n-12 | Összes statikus szöveg i18n konverzió | appointments | `modules/appointments/components/` | 🟢 |
| i18n-13 | Összes statikus szöveg i18n konverzió | e-commerce | `modules/e-commerce/components/` | 🟢 |
| i18n-14 | Státusz nevek lokalizálása (részleges) | delivery | `modules/delivery/components/` | 🟢 |

---

## B. MODUL FUNKCIÓ BŐVÍTÉS (51 feladat)

### B1. Workforce modul (4 feladat)
> **Forrás:** `modules/workforce/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| wf-01 | ✅ Excel export endpoint (ExcelJS, `modules/workforce/api/export/route.ts`) | ✅ |
| wf-02 | ✅ Aggregáció endpoint heti/havi (`modules/workforce/api/aggregation/route.ts`) | ✅ |
| wf-03 | Frontend: Heti összesítő nézet + Havi trend chart (Recharts AreaChart) | 🟡 |
| wf-04 | Logic: Automatikus összesítő számítás (jelenlét arány %) | 🟢 |

### B2. Quality modul (7 feladat)
> **Forrás:** `modules/quality/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| qa-01 | ✅ Hibakód katalógus CRUD (`modules/quality/api/defect-codes/route.ts` + migráció) | ✅ |
| qa-02 | ✅ Selejt arány trend + Pareto endpoint (`modules/quality/api/reject-trend/route.ts`) | ✅ |
| qa-03 | Backend: Excel export endpoint | 🟢 |
| qa-04 | ✅ Hibakód katalógus kezelő UI (`DefectCodeManager.tsx` + tab a DashboardPage-ben) | ✅ |
| qa-05 | ✅ Selejt arány trend + Pareto chart (`RejectTrendChart.tsx` + trends tab) | ✅ |
| qa-06 | Frontend: Batch szintű minőségi összesítő | 🟢 |
| qa-07 | Logic: Automatikus 8D riport indítás ha selejt arány > küszöb | 🟢 |

### B3. CRM modul (4 feladat)
> **Forrás:** `modules/crm/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| crm-01 | ✅ Email integráció — automatikus interakció naplózás (`crm/api/email-log/route.ts`) | ✅ |
| crm-02 | Ügyféltag-ek és szegmentáció | 🟢 |
| crm-03 | ✅ Pipeline riportok (konverziós ráta, átlagos deal méret) (`modules/crm/api/pipeline-report/route.ts`) | ✅ |
| crm-04 | ✅ Invoicing integráció (ügyfél FK migráció: `crm/migrations/002_invoicing_link.sql`) | ✅ |

### B4. LAC Napi Perces modul (7 feladat)
> **Forrás:** `modules/lac-napi-perces/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| lac-01 | ✅ SAP IDoc fogadás batch endpoint (`modules/lac-napi-perces/api/sap-receive/route.ts`) | ✅ |
| lac-02 | ✅ Norma frissítés API (`modules/lac-napi-perces/api/norma/route.ts`) | ✅ |
| lac-03 | ✅ Target (célérték) CRUD API — napi/heti upsert (`modules/lac-napi-perces/api/targets/route.ts`) | ✅ |
| lac-04 | ✅ Norma karbantartó UI (`NormaManager.tsx` a DashboardPage-ben) | ✅ |
| lac-05 | ✅ Target beállító UI (`TargetManager.tsx` a DashboardPage-ben) | ✅ |
| lac-06 | Frontend: Eltérés elemzés (terv vs. tény × norma) | 🟢 |
| lac-07 | Logic: Automatikus SAP import ütemezés (cron trigger) | 🟢 |

### B5. Digital Twin modul (9 feladat)
> **Forrás:** `modules/digital-twin/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| dt-01 | ✅ OEE modul integráció (`modules/digital-twin/api/oee/route.ts`) | ✅ |
| dt-02 | Backend: PLC Connector integráció (valós gép állapot ha PLC elérhető) | ⏳ |
| dt-03 | ✅ Maintenance integráció (`modules/digital-twin/api/maintenance/route.ts`) | ✅ |
| dt-04 | ✅ SSE endpoint valós idejű frissítés (30s poll, `digital-twin/api/sse/route.ts`) | ✅ |
| dt-05 | Frontend: Drag-and-drop gép elhelyezés (layout szerkesztő mód) | 🟢 |
| dt-06 | Frontend: Zoom és pan a gyártósor térképen | 🟢 |
| dt-07 | Frontend: Gép ikon testreszabás (típus alapján eltérő SVG) | 🟢 |
| dt-08 | Frontend: Mini-dashboard popup a kiválasztott géphez | 🟢 |
| dt-09 | Frontend: Teljes képernyős nézet | 🟢 |

### B6. File Import modul (8 feladat)
> **Forrás:** `modules/file-import/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| fi-01 | ✅ Saját API endpoint (`modules/file-import/api/route.ts`) + DashboardPage átírás | ✅ |
| fi-02 | ✅ Import konfiguráció CRUD (`modules/file-import/api/configs/route.ts`) | ✅ |
| fi-03 | ✅ Validációs szabály definíció CRUD + migráció (`file-import/api/validation-rules/route.ts`) | ✅ |
| fi-04 | ✅ Migráció: `mod_file_import_history` tábla (`migrations/002_import_history.sql`) | ✅ |
| fi-05 | ✅ Import előnézet (`ImportPreview.tsx` a DashboardPage-ben) | ✅ |
| fi-06 | ✅ Hibalista megjelenítés (`ErrorList.tsx` a DashboardPage-ben) | ✅ |
| fi-07 | Frontend: Korábbi importok listája (history) | 🟢 |
| fi-08 | Logic: Típus konverzió pipeline + Duplikátum felismerés | 🟢 |

### B7. Fleet modul (7 feladat)
> **Forrás:** `modules/fleet/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| fl-01 | ✅ Trip (út) CRUD API endpoint (`modules/fleet/api/trips/route.ts`) | ✅ |
| fl-02 | ✅ Tankolás CRUD API endpoint (`modules/fleet/api/refuels/route.ts`) | ✅ |
| fl-03 | Backend: Aggregáció endpoint (havi km összesítő, fogyasztás számítás) | 🟢 |
| fl-04 | ✅ Trip lista + rögzítő form (trips/refuels tab a DashboardPage-ben) | ✅ |
| fl-05 | ✅ Tankolás lista + rögzítő form + refuel modal | ✅ |
| fl-06 | Frontend: Fogyasztás chart (l/100km trend) | 🟢 |
| fl-07 | Logic: Automatikus fogyasztás kalkuláció (tankolás/távolság) | 🟢 |

### B8. Tracking modul (5 feladat)
> **Forrás:** `modules/tracking/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| tr-01 | ✅ Státusz timeline endpoint (`modules/tracking/api/timeline/route.ts`) | ✅ |
| tr-02 | Backend: Excel export endpoint | 🟢 |
| tr-03 | ✅ Timeline/history vizualizáció (`TimelinePanel.tsx` + History gomb a DashboardPage-ben) | ✅ |
| tr-04 | Frontend: Gantt chart nézet határidőkkel | 🟢 |
| tr-05 | ✅ Határidő figyelő — overdue vizual highlight (piros border + badge + ikon) | ✅ |

### B9. Shift Management modul (7 feladat)
> **Forrás:** `modules/shift-management/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| sm-01 | ✅ Heti beosztás másolás endpoint (`modules/shift-management/api/copy-week/route.ts`) | ✅ |
| sm-02 | Backend: Rotáció szabály motor (auto-beosztás rotáció pattern) | 🟢 |
| sm-03 | Backend: Hiányzás kezelés endpoint (helyettesítő javaslat) | 🟢 |
| sm-04 | ✅ Heti naptár nézet (grid: dolgozó × nap × műszak) + nézet váltó | ✅ |
| sm-05 | Frontend: Drag-and-drop beosztás módosítás | 🟢 |
| sm-06 | ✅ Havi összesítő endpoint (`modules/shift-management/api/monthly-summary/route.ts`) | ✅ |
| sm-07 | ✅ Pihenőidő validáció (min. 11 óra váltások között) — API-ban ellenőrizve | ✅ |

### B10. Worksheets modul (5 feladat)
> **Forrás:** `modules/worksheets/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| ws-01 | ✅ Mobile optimalizáció (kártyás nézet mobilon, responsive layout) | ✅ |
| ws-02 | ✅ Munkalap sablonok CRUD + migráció (`worksheets/api/templates/route.ts`) | ✅ |
| ws-03 | Fotó csatolás (before/after) | 🟢 |
| ws-04 | SMS/email értesítés ügyfélnek (állapot változás) | 🟢 |

### B11. Appointments modul (3 feladat)
> **Forrás:** `modules/appointments/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| ap-01 | ✅ Email/SMS emlékeztető endpoint (24h window, `appointments/api/reminders/route.ts`) | ✅ |
| ap-02 | Ismétlődő időpontok (recurring bookings) | 🟢 |
| ap-03 | Ügyfél self-service foglalás (publikus link) | 🟢 |

### B12. Delivery modul (5 feladat)
> **Forrás:** `modules/delivery/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| de-01 | ✅ Vevő összesítő + havi trend endpoint (`modules/delivery/api/summary/route.ts`) | ✅ |
| de-02 | Backend: Havi trend endpoint + Excel export | 🟢 |
| de-03 | ✅ Vevő breakdown chart + havi trend (`CustomerBreakdownChart.tsx`) | ✅ |
| de-04 | ✅ Szállítmány szerkesztő modal + inline státusz dropdown | ✅ |
| de-05 | Logic: Automatikus státusz frissítés (dátum alapú) | 🟢 |

### B13. E-commerce modul (5 feladat)
> **Forrás:** `modules/e-commerce/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| ec-01 | ✅ Ár szinkronizáció (price sync a meglévő sync endpointba integrálva) | ✅ |
| ec-02 | Több webshop egyidejű kezelés | 🟢 |
| ec-03 | ✅ Rendelés státusz visszaírás (`modules/e-commerce/api/order-status/route.ts`) | ✅ |
| ec-04 | ✅ Webhook endpoint (valós idejű rendelés import, HMAC verificáció) (`modules/e-commerce/api/webhook/route.ts`) | ✅ |
| ec-05 | API credential rotation + Rate limiting a sync endpointokon | 🟢 |

### B14. PLC Connector modul (16 feladat)
> **Forrás:** `modules/plc-connector/TASKS_FOR_AI.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| plc-01 | Backend: Siemens S7 driver implementáció (`nodes7`/`snap7`) | ⏳ |
| plc-02 | Backend: Modbus TCP driver implementáció (`modbus-serial`) | ⏳ |
| plc-03 | Backend: MQTT kliens implementáció (`mqtt`) | ⏳ |
| plc-04 | Backend: Polling engine — periodikus register olvasás | ⏳ |
| plc-05 | Backend: Adat írás `mod_plc_data` táblába (idősor) | ⏳ |
| plc-06 | Backend: Kapcsolat állapot frissítés | ⏳ |
| plc-07 | ✅ Register CRUD API endpoint (`modules/plc-connector/api/registers/route.ts`) | ✅ |
| plc-08 | ✅ Register konfiguráció UI (`RegisterManager.tsx`) | ✅ |
| plc-09 | ✅ Register értékek live megjelenítés (`LiveRegisterValues.tsx`, 5s poll) | ✅ |
| plc-10 | Logic: Adat típus konverzió (INT16, INT32, FLOAT32, BOOL) | ⏳ |
| plc-11 | Logic: Skálázás alkalmazás (raw × scale + offset) | ⏳ |
| plc-12 | Frontend: Valós idejű adat chart (Recharts + SSE) | 🟢 |
| plc-13 | Frontend: Eszköz részletek oldal | 🟢 |
| plc-14 | Frontend: Riasztás konfiguráció (küszöbérték) | 🟢 |
| plc-15 | Logic: Küszöbérték figyelés + notification | 🟢 |
| plc-16 | Logic: Adat aggregáció (percenkénti/órás átlag) | 🟢 |

---

## C. UI/UX FEJLESZTÉS (5 feladat)

> **Forrás:** `docs/hun/plan/04-UI-UX.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| ui-01 | Sötét/világos téma váltás (jelenleg: csak dark) | 🟢 |
| ui-02 | "Elfelejtett jelszó" flow (email alapú) — SMTP konfig szükséges | ⏳ |
| ui-03 | ✅ "Jegyezd meg" checkbox (login page) — `rememberMe` state + i18n | ✅ |
| ui-04 | Admin: jelszó erősség jelző + Bulk user import (CSV) | 🟢 |
| ui-05 | ✅ 404 oldal testreszabás (`app/not-found.tsx`) | ✅ |

---

## D. BIZTONSÁG (3 feladat)

> **Forrás:** `docs/hun/plan/05-SECURITY.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| sec-01 | ✅ Superadmin backdoor — production default OFF, `ENABLE_SUPERADMIN=true` kell | ✅ |
| sec-02 | ✅ `PASSWORD_POLICY` konstans + `validatePassword()` utility + i18n kulcsok | ✅ |
| sec-03 | Dependency audit (`npm audit`) — rendszeres futtatás | 🟡 |

---

## E. TESZTELÉS (13 feladat)

> **Forrás:** TASKS_FOR_AI.md × 13 modul + 00-PRIORITIES + FUTURE_ROADMAP

| # | Feladat | Modul | Prioritás |
|---|---------|-------|-----------|
| test-01 | Unit tesztek — API route handler (GET, POST, validáció) | workforce | 🟡 |
| test-02 | Unit tesztek — selejt arány kalkuláció + 8D validáció | quality | 🟡 |
| test-03 | Unit tesztek — API route-ok, pipeline stage transitions | crm | 🟡 |
| test-04 | Unit tesztek — SAP IDoc parsing, KPI aggregáció, norma calc | lac-napi-perces | 🟡 |
| test-05 | Unit tesztek — layout CRUD, gép állapot aggregáció | digital-twin | 🟢 |
| test-06 | Unit tesztek — CSV/Excel parsing, oszlop mapping validáció | file-import | 🟡 |
| test-07 | Unit tesztek — jármű CRUD validáció, fogyasztás számítás | fleet | 🟢 |
| test-08 | Unit tesztek — szűrés és rendezés, státusz átmenet validáció | tracking | 🟢 |
| test-09 | Unit tesztek — ütközés detektálás, rotáció pattern generálás | shift-management | 🟢 |
| test-10 | Unit tesztek — cost calculation | worksheets | 🟢 |
| test-11 | Integration tesztek — inventory deduction, invoice gen | worksheets | 🟢 |
| test-12 | Unit tesztek — adapter, sync logic | e-commerce | 🟢 |
| test-13 | E2E tesztek (Playwright) — teljes alkalmazás | core | 🟡 |

---

## F. INFRASTRUKTÚRA & PLATFORM (8 feladat)

> **Forrás:** `00-PRIORITIES.md` + `HELYZETKEP.md` + `FUTURE_ROADMAP.md`

| # | Feladat | Prioritás |
|---|---------|-----------|
| inf-01 | SMTP email konfiguráció (kód kész, konfig hiányzik) | ⏳ |
| inf-02 | SAP RFC SDK aktiválás | ⏳ |
| inf-03 | PLC driver aktiválás (hardware) | ⏳ |
| inf-04 | Pilot ügyfél telepítés (első éles teszt) | 🔴 |
| inf-05 | Dashboard Builder — widget renderelés befejezése (layout mentés kész) | 🟡 |
| inf-06 | Multi-site — modulokba bekötés (CRUD kész) | 🟢 |
| inf-07 | Monorepo struktúra (Turborepo/Nx) | 🟢 |
| inf-08 | Observability — Sentry, structured logging, health check | 🟡 |

---

## G. TÁVOLI JÖVŐ — PLATFORM SZINT (4 feladat)

> **Forrás:** `FUTURE_ROADMAP.md` Phase 4

| # | Feladat | Prioritás |
|---|---------|-----------|
| fut-01 | Marketplace (harmadik fél modulok piactere) | 🟢 |
| fut-02 | Mobile App (React Native + Expo, barcode, offline sync) | 🟢 |
| fut-03 | Multi-tenant SaaS (központi tenant registry, auto DB provisioning) | 🟢 |
| fut-04 | Embedded BI (drag-and-drop riport builder, ütemezett email) | 🟢 |

---

## ÖSSZESÍTÉS

| Kategória | Összes | 🔴 Kritikus | 🟡 Közepes | 🟢 Alacsony | ⏳ Külső |
|-----------|--------|-------------|------------|-------------|----------|
| A. i18n | 14 | 0 | 6 | 8 | 0 |
| B. Modul funkciók | 51 | 1 | 29 | 21 | 11 (PLC) |
| C. UI/UX | 5 | 0 | 0 | 4 | 1 |
| D. Biztonság | 3 | 1 | 2 | 0 | 0 |
| E. Tesztelés | 13 | 0 | 6 | 7 | 0 |
| F. Infra & Platform | 8 | 1 | 2 | 2 | 3 |
| G. Távoli jövő | 4 | 0 | 0 | 4 | 0 |
| **ÖSSZESEN** | **98** | **3** | **45** | **46** | **15** |

### TOP 10 — AZONNAL MEGVALÓSÍTHATÓ (nincs külső függőség)

| # | Kód | Feladat | Modul |
|---|-----|---------|-------|
| 1 | sec-01 | Superadmin backdoor kikapcsolás production-ben | core |
| 2 | fi-01 | File Import: saját API endpoint | file-import |
| 3 | inf-04 | Pilot ügyfél telepítés előkészítés | core |
| 4 | i18n-01 | Worksheets i18n | worksheets |
| 5 | i18n-02 | Quality hibakód lokalizálás | quality |
| 6 | i18n-03 | CRM i18n | crm |
| 7 | sm-04 | Heti naptár nézet | shift-management |
| 8 | tr-05 | Határidő figyelő (lejárt feladatok kiemelés) | tracking |
| 9 | qa-01 | Hibakód katalógus CRUD endpoint | quality |
| 10 | de-04 | Szállítmány szerkesztő modal | delivery |

---

## MD FÁJL TÉRKÉP (65 fájl átvizsgálva)

### Feladatokat tartalmazó fájlok:
- `modules/*/TASKS_FOR_AI.md` × 13 — modul szintű feladatlisták
- `docs/hun/MASTER_TODO.md` — bug fix lista (KÉSZ ✅)
- `docs/hun/plan/00-PRIORITIES.md` — prioritások (Phase 0-7 KÉSZ ✅)
- `docs/hun/plan/02-KNOWN_BUGS.md` — ismert hibák (23/23 JAVÍTVA ✅)
- `docs/hun/plan/04-UI-UX.md` — UI/UX feladatok
- `docs/hun/plan/05-SECURITY.md` — biztonsági feladatok
- `docs/hun/plan/05-ROADMAP.md` — fejlesztési ütemterv (Phase 0-7 KÉSZ ✅)
- `docs/hun/HELYZETKEP.md` — állapotjelentés
- `docs/hun/FUTURE_ROADMAP.md` — jövőbeli feature roadmap

### Referencia dokumentumok (nem feladatlista):
- `docs/hun/plan/01-PRICING_STRATEGY.md` — árképzés
- `docs/hun/plan/03-EXPANSION_PLAN.md` — piacbővítés
- `docs/hun/plan/04-MODULE_SPECS.md` — modul technikai specifikációk
- `docs/hun/plan/06-SALES.md` — értékesítési stratégia
- `docs/hun/plan/07-DEMO_MODE_STRATEGY.md` — demo mód
- `docs/hun/plan/DONE.md` — archívum
- `docs/hun/ARCHITECTURE.md` — technikai architektúra
- `docs/hun/OWNER_GUIDE.md` — fejlesztői útmutató
- `docs/hun/INVOICING_MODULE.md` — invoicing spec
- `docs/hun/module-development.md` — modul fejlesztési útmutató
- `docs/hun/SITE_REVIEW_2026_03_15.md` — demo site review
- `docs/hun/CHANGELOG.md` — változásnapló
- `docs/hun/GITHUB_CLEANUP.md` — git cleanup
- `docs/ACI_MASTER_STATUS_HU.md` — master status
- `docs/AINOVA_CLOUD_INTELLIGENCE.md` — projekt overview
- `drones/*.md` — AI drone rendszer (külön projekt)
- `docs/archive/*_OBSOLETE.md` × 7 — elavult dokumentumok
