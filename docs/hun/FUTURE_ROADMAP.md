# Ainova Cloud Intelligence — Feature Roadmap & Innovációs Terv

> Ez a dokumentum a szoftver fejlesztési történetét és jövőbeli irányait tartalmazza.
> **Utolsó frissítés:** 2026.03.15 — Phase 0-7 KÉSZ, Fázis 1-3 feature-ök implementálva.
> **Aktuális verzió:** v2.0.0 (26 modul, 4-tier licenc)

---

## PRIORITÁSI MÁTRIX

| Szimbólum | Jelentés |
|-----------|---------|
| 🔴 | Kritikus — Értékesítéshez szükséges |
| 🟡 | Fontos — Versenyelőny |
| 🟢 | Nice-to-have — Innovációs szint |
| ⏱️ | Becsült idő |

---

## FÁZIS 1 — ÉRTÉKESÍTÉSRE KÉSZ (v1.1) — 2-4 hét

### 1.1 🔴 PDF Riport Export ⏱️ 3 nap
**Jelenlegi állapot:** Nincs export funkció.
**Javaslat:** Minden modulban "Export PDF" gomb, amely az aktuális nézetet PDF-be rendereli.
**Technológia:** `@react-pdf/renderer` vagy server-side `puppeteer` (headless Chrome).
**Implementáció:**
- Generikus `ReportTemplate` komponens (fejléc: cégnév + logó + dátum)
- Modul-specifikus template-ek (OEE riport, minőségi jegyzőkönyv, stb.)
- API: `GET /api/modules/[moduleId]/export?format=pdf&dateFrom=...&dateTo=...`

### 1.2 🔴 Excel Export ⏱️ 2 nap
**Technológia:** `exceljs` (server-side)
**Implementáció:**
- Generikus `exportToExcel(rows, columns, fileName)` utility
- Minden modul GET API-ja támogatja a `?format=xlsx` paramétert
- Styled header, auto-width columns, frozen panes

### 1.3 🔴 Demo Környezet ⏱️ 2 nap
**Javaslat:** Egy read-only demo instance, ami SQLite-on fut, előre feltöltött adatokkal.
**Implementáció:**
- `scripts/seed-demo-data.ts` — Generál realisztikus demo adatokat
- `DB_ADAPTER=sqlite` + `DB_SQLITE_PATH=./demo/ainova-demo.db`
- Automatikus reset minden 24 órában
- Demo URL: `demo.ainova.hu`

### 1.4 🔴 Landing Page ⏱️ 3 nap
**Javaslat:** Marketing weboldal (Next.js static page) feature listával, árakkal, demo gombbal.
**Implementáció:** `app/(marketing)/page.tsx` — Hero, Features, Pricing, CTA
**Design:** Modern, trust signals (screenshotok, testimonials placeholder)

### 1.5 🟡 Email Értesítések ⏱️ 2 nap
**Javaslat:** Kritikus eseményeknél email küldés (lejárt karbantartás, alacsony készlet, stb.)
**Technológia:** `nodemailer` + SMTP konfiguráció admin panelen
**Implementáció:**
- `lib/notifications/email.ts` — Generikus email küldő
- Admin setting: SMTP host, port, user, password
- Template-ek: alert, report summary, welcome email

---

## FÁZIS 2 — VERSENYELŐNY (v1.2) — 4-8 hét

### 2.1 🟡 Dashboard Builder ⏱️ 1 hét
**Jelenlegi állapot:** Fix dashboard layout modulonként.
**Javaslat:** Drag-and-drop dashboard builder, ahol a felhasználó maga összeállítja a widgeteket.
**Technológia:** `@dnd-kit/core` (drag-and-drop) + widget registry
**Implementáció:**
```
Widget típusok:
- KPI kártya (szám + trend nyíl)
- Oszlopdiagram (bar chart)
- Vonaldiagram (line chart)
- Kördiagram (pie chart)
- Táblázat (top N lista)
- Hőtérkép (calendar heatmap)
- Gauge (OEE mérő)
```
- Mentett layout per felhasználó (`core_dashboard_layouts` tábla)
- Előre definiált template-ek (OEE dashboard, Termelési összefoglaló, stb.)

### 2.2 🟡 Real-time Updates (WebSocket) ⏱️ 3 nap
**Jelenlegi állapot:** Polling (fetch on interval).
**Javaslat:** Server-Sent Events (SSE) vagy WebSocket a live dashboard frissítéshez.
**Technológia:** SSE (egyszerűbb, Next.js kompatibilis) → késöbb WS
**Implementáció:**
- `GET /api/sse/[moduleId]` — SSE stream
- Client: `EventSource` API → React state update
- Események: new_record, updated_record, alert

### 2.3 🟡 Globális Keresés ⏱️ 2 nap
**Javaslat:** `Cmd+K` / `Ctrl+K` keresősáv, ami minden modulban keres.
**Technológia:** Client-side fuzzy search (`fuse.js`) + server-side fulltext
**Implementáció:**
- `components/core/CommandPalette.tsx` — Modal keresősáv
- API: `GET /api/search?q=...` → Minden modul táblájában keres
- Eredmény: modul név + elem név + link

### 2.4 🟡 PWA (Progressive Web App) ⏱️ 2 nap
**Javaslat:** Installable web app, offline cache, push notification.
**Technológia:** `next-pwa` + Service Worker
**Implementáció:**
- `manifest.json` — App név, ikon, theme szín
- Service Worker — API response cache (stale-while-revalidate)
- Push notifications — Web Push API + VAPID keys

### 2.5 🟡 Audit Trail Vizualizáció ⏱️ 2 nap
**Javaslat:** Timeline view az audit log-hoz, szűrőkkel.
**Implementáció:** Admin panel → Audit log → Timeline komponens
- Ki, mikor, mit csinált, melyik modulban
- Filter: felhasználó, időszak, esemény típus
- Export CSV/PDF

### 2.6 🟡 Multi-nyelv Admin ⏱️ 2 nap
**Javaslat:** Admin panelen szerkeszthető fordítások (nem csak fallback JSON).
**Implementáció:** Már van `core_translations` tábla → Admin UI editor kell
- Nyelv választó
- Key-value szerkesztő táblázat
- Import/export JSON

---

## FÁZIS 3 — INNOVÁCIÓS SZINT (v2.0) — 2-4 hónap

### 3.1 🟢 AI Asszisztens ⏱️ 2 hét — ✅ ELŐKÉSZÍTVE (2026-03-13)
**Jelenlegi állapot:** SYSTEM_PROMPT teljes újraírás — 18 modul + SAP + PLC táblaismeret, OEE benchmark, BI fókusz, multilingual.
**Aktiváláshoz:** `OPENAI_API_KEY` env var szükséges.
**Példák:**
- "Mennyi volt a múlt heti OEE az 1-es gépen?"
- "Melyik dolgozó volt a legtöbbet távol az elmúlt hónapban?"
- "Mutasd a top 5 selejtokot ebben a hónapban"

**Technológia:** OpenAI API (GPT-4o) + function calling
**Implementáció:**
```
Felhasználó kérdés
    ↓
LLM → SQL generálás (function call)
    ↓
SQL végrehajtás (read-only, parameterized)
    ↓
LLM → Természetes nyelvű válasz + chart javaslat
    ↓
UI megjelenítés (szöveg + opcionális chart)
```

- `lib/ai/assistant.ts` — AI asszisztens logic ✅
- `app/api/ai/query/route.ts` — API endpoint ✅
- `components/core/AiChat.tsx` — Chat panel (floating widget)
- Biztonsági réteg: read-only query, RBAC szűrés, rate limit

### 3.2 🟢 Prediktív Karbantartás ⏱️ 2 hét
**Javaslat:** Gépi tanulás alapú előrejelzés a géphibákra.
**Implementáció:**
- Történeti adatok gyűjtése (OEE rekordok, karbantartási napló)
- Python microservice (FastAPI + scikit-learn)
- MTBF/MTTR kalkuláció → trend extrapoláció
- Dashboard widget: "Várható meghibásodás: 12 nap"
- Alert küldés a karbantartási csapatnak

### 3.3 🟢 PLC Connector (IoT Edge) ⏱️ 3 hét — ✅ DRIVER STUBS ELŐKÉSZÍTVE (2026-03-13)
**Jelenlegi állapot:** Driver interfészek + 4 stub driver kész (S7/Modbus TCP/Modbus RTU/MQTT/OPC-UA), 002 migráció (alerts, driver_config, poll_status, alert_events). Hardver-aktiváláshoz npm install szükséges.
**Javaslat:** Automatikus adatgyűjtés Logo PLC / Siemens S7 vezérlőkből.
**Technológia:** 
- Node-RED vagy egyedi Node.js agent
- S7comm protokoll (`node-snap7`)
- MQTT broker (Mosquitto)
- Edge agent → MQTT → Cloud API

**Implementáció:**
- `lib/connectors/plc/interface.ts` — IPlcDriver + createPlcDriver factory ✅
- `lib/connectors/plc/drivers/` — s7.ts, modbus.ts, mqtt.ts, opcua.ts stub driverek ✅
- `modules/plc-connector/agent/` — Edge agent (Node.js) — TODO
- `modules/plc-connector/api/route.ts` — Data receiver API
- Admin konfiguráció: PLC IP, register mapping, polling interval
- Real-time dashboard: gép státusz, darabszámláló, hőmérséklet

### 3.4 🟢 Digital Twin Vizualizáció ⏱️ 3 hét — ✅ KÉSZ (2026-03-12)
**Jelenlegi állapot:** Valós API endpoint (CRUD, 7 gép seed, layout DB integráció).
**Javaslat:** 2D gyártósor layout, ahol a gépek valós idejű állapota látható.
**Technológia:** Canvas API vagy `react-flow` (node-based editor)
**Implementáció:**
- Layout editor: drag-and-drop gép ikonok a gyártósor térképen
- Valós idejű státusz: zöld (fut), sárga (figyelmeztetés), piros (áll)
- Kattintás gépre → OEE részletek popup
- Hőtérkép overlay: teljesítmény vizualizáció

### 3.5 🟢 Workflow Automatizáció ⏱️ 2 hét
**Javaslat:** No-code szabály motor: "HA OEE < 60% AKKOR küldj emailt a termelésvezetőnek"
**Technológia:** Custom rule engine (JSON-based)
**Implementáció:**
```json
{
  "trigger": "oee.record.created",
  "condition": { "field": "oee_pct", "operator": "<", "value": 60 },
  "actions": [
    { "type": "email", "to": "manager@company.hu", "template": "low_oee_alert" },
    { "type": "notification", "message": "Alacsony OEE: {machine_name} - {oee_pct}%" }
  ]
}
```
- Admin UI: vizuális rule builder
- `lib/workflows/engine.ts` — Rule evaluation engine
- Trigger rendszer: modul események → workflow engine

### 3.6 🟢 API Gateway (Partner Integrációk) ⏱️ 1 hét
**Javaslat:** REST API kulcs-alapú hozzáférés külső rendszereknek.
**Implementáció:**
- `core_api_keys` tábla (key, name, permissions, rate_limit)
- API key middleware (`X-API-Key` header)
- Swagger/OpenAPI dokumentáció auto-generálás
- Webhook-ok: események továbbítása külső URL-re

### 3.7 🟢 Multi-site Támogatás ⏱️ 2 hét
**Javaslat:** Több telephelyes cégeknek: site szűrő, összesített dashboard.
**Implementáció:**
- `core_sites` tábla (id, name, code, address)
- Minden modul tábla kap egy `site_id` oszlopot
- Site választó a navigációban
- "Összes telephely" összesítő nézet

---

## FÁZIS 4 — PLATFORM SZINT (v3.0) — 6-12 hónap

### 4.1 🟢 Marketplace ⏱️ 1 hónap
**Javaslat:** Harmadik fél által fejlesztett modulok piactere.
**Implementáció:**
- Modul csomag formátum (ZIP: manifest + SQL + JS bundle)
- Modul feltöltés API + admin jóváhagyás
- Marketplace UI: keresés, értékelés, telepítés
- Fejlesztői SDK + dokumentáció

### 4.2 🟢 Mobile App ⏱️ 2 hónap
**Technológia:** React Native (Expo) — kód megosztás a web UI-val
**Funkciók:**
- Barcode/QR scanner (készlet mozgás, termék felkövetés)
- Offline adatrögzítés + sync
- Push notification
- Kamera: minőségi fotó dokumentáció

### 4.3 🟢 Embedded Analytics ⏱️ 1 hónap
**Javaslat:** Beágyazott BI dashboard (mint a Power BI, de natív).
**Technológia:** `recharts` vagy `nivo` chart library
**Funkciók:**
- Drag-and-drop riport builder
- Ütemezett riport emailben (heti, havi összefoglaló)
- Adhoc SQL query (admin only, read-only)
- Benchmark: iparági átlag összehasonlítás

### 4.4 🟢 Tenant Management (SaaS) ⏱️ 3 hét
**Javaslat:** Multi-tenant SaaS architektúra, ahol minden ügyfél saját adatbázisban fut.
**Implementáció:**
- Központi tenant registry DB
- Automatikus DB provisionálás (ügyfél regisztráció → DB létrehozás + migráció)
- Tenant-specifikus subdomain (customer1.ainova.hu)
- Központi admin: tenant lista, felhasználók, licencek

---

## TECHNIKAI ADÓSSÁG & KARBANTARTHATÓSÁG

### T1. Tesztek ⏱️ 1 hét
- Unit tesztek: `vitest` + `@testing-library/react`
- API tesztek: `supertest` vagy Next.js test utils
- E2E tesztek: `playwright`
- CI pipeline: GitHub Actions (lint + type-check + test + build)

### T2. Monorepo Struktúra ⏱️ 3 nap
- Turborepo vagy Nx
- Packages: `@ainova/core`, `@ainova/ui`, `@ainova/modules`
- Független modul build és verziókezelés

### T3. Observability ⏱️ 2 nap
- Structured logging (JSON format, log levels)
- Error tracking: Sentry integration
- Performance monitoring: response time, DB query time
- Health check dashboard

### T4. Dokumentáció Generálás ⏱️ 2 nap
- TypeDoc — API dokumentáció automatikus generálás
- Storybook — UI komponens katalógus
- OpenAPI spec — Swagger UI az API-khoz

---

## IMPLEMENTÁLÁSI STÁTUSZ (2026.03.15)

| # | Feature | Fázis | Státusz |
|---|---------|-------|---------|
| 1 | PDF/Excel Export | 1 | ✅ Kész — `lib/export/pdf.ts`, `lib/export/excel.ts`, ExportButton 9+ modulba |
| 2 | Demo környezet | 1 | ✅ Kész — `scripts/seed-demo-data.ts`, auto-reset Vercel Cron |
| 3 | Landing page | 1 | ✅ Kész — `app/(marketing)/page.tsx`, 4-tier árazás, i18n |
| 4 | Email értesítések | 1 | ✅ Kész — `lib/notifications/email.ts` (nodemailer, SMTP config szükséges) |
| 5 | Dashboard Builder | 2 | ⚠️ Részleges — layout mentés kész, widget renderelés folytatásra vár |
| 6 | PWA + offline | 2 | ✅ Kész — `public/manifest.json`, `public/sw.js` v3, modul chunk cache |
| 7 | Globális keresés | 2 | ✅ Kész — `components/core/CommandPalette.tsx`, Ctrl+K |
| 8 | Real-time SSE | 2 | ✅ Kész — `lib/sse/event-bus.ts`, `app/api/sse/`, heartbeat 30s |
| 9 | Nyelvváltó (HU/EN/DE) | 2 | ✅ Kész — I18nProvider + SW cache fix, 1 klikk váltás |
| 10 | Fordítás szerkesztő | 2 | ✅ Kész — API `app/api/admin/translations/route.ts` |
| 11 | AI asszisztens | 3 | ✅ Előkészítve — `lib/ai/assistant.ts`, OpenAI API kulcs szükséges |
| 12 | PLC connector | 3 | ⚠️ Előkészítve — 4 driver interfész, hardver szükséges |
| 13 | Digital Twin | 3 | ✅ Kész — CRUD API, 7 gép seed, 2D SVG layout DB |
| 14 | Workflow Engine | 3 | ✅ Kész — `lib/workflows/engine.ts`, rule API |
| 15 | API Gateway | 3 | ✅ Kész — `modules/api-gateway/`, API kulcs kezelés, rate limiting, request napló |
| 16 | Multi-site | 3 | ⚠️ Részleges — CRUD kész, modulokba nincs bekötve |
| 17 | Tesztek + CI | T | ⚠️ Részleges — vitest config kész, minimális test coverage |
| 18 | Marketplace | 4 | ⏳ Tervben |
| 19 | Mobile App | 4 | ⏳ Tervben |
| 20 | Multi-tenant SaaS | 4 | ⏳ Tervben |
| 21 | Embedded BI | 4 | ⏳ Tervben |
| 22 | Purchasing modul | P2 | ✅ Kész — Phase 2 (commit 679c889) |
| 23 | POS modul | P2 | ✅ Kész — Phase 2 (commit 679c889) |
| 24 | CRM modul | P3 | ✅ Kész — Phase 3 (commit f7d5366) |
| 25 | Worksheets modul | P3 | ✅ Kész — Phase 3 (commit f7d5366) |
| 26 | Sector Presets | P4 | ✅ Kész — Phase 4 (commit 97b96af) — 6 iparág |
| 27 | Recipes add-on | P5 | ✅ Kész — Phase 5 (commit 1e8c69a) |
| 28 | Appointments add-on | P5 | ✅ Kész — Phase 5 (commit 1e8c69a) |
| 29 | Projects add-on | P5 | ✅ Kész — Phase 5 (commit 1e8c69a) |
| 30 | E-commerce modul | P6 | ✅ Kész — Phase 6 (commit 9b9a578) |
| 31 | CSP + Edge auth | P7 | ✅ Kész — Phase 7 (commit 36917ff) |
| 32 | OffscreenCanvas | P7 | ✅ Kész — Phase 7 (commit 36917ff) |
| 33 | 4-tier licenc | P1 | ✅ Kész — Phase 1 (commit 3f350c3) — Starter/Basic/Pro/Enterprise |

---

## KÖVETKEZŐ LÉPÉSEK (Fázis 4 — Platform Szint)

A Fázis 1-3 minden feature-je implementálva van. A következő lépések:

1. **Marketplace** — Harmadik fél modulok piactere (modul csomag formátum, feltöltés, telepítés)
2. **Mobile App** — React Native (Expo), barcode scanner, offline sync
3. **Multi-tenant SaaS** — Központi tenant registry, auto DB provisioning, subdomain routing
4. **Embedded BI** — Drag-and-drop riport builder, ütemezett email riportok

> **Megjegyzés:** A Fázis 4 feature-ök platform szintű skálázást biztosítanak és jelentős architektúrális munkát igényelnek. Csak stabil ügyfélbázis után érdemes elkezdeni.
