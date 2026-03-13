# Changelog

Minden jelentős változás dokumentálva van ebben a fájlban.

## [1.3.0] - 2026-03-13

### SAP Integráció előkészítés
- **sap-import modul** — Enterprise tier, aktiválva a _loader.ts-ben
- **mod_sap_connections** — SAP rendszer kapcsolatok táblája
- **mod_sap_objects** — 50+ SAP objektum katalógus (MM/SD/PP/PM/HR/QM/FI-CO/BASIS)
- **mod_sap_field_mappings** — Mező leképezés konfigurációk
- **mod_sap_sync_log** — Szinkronizáció napló
- **mod_sap_data_cache** — Adat cache réteg
- **API route-ok** — connections (CRUD + test), objects (katalógus keresés), mappings (CRUD), sync (trigger)
- **DashboardPage** — 4 fül admin UI (Kapcsolatok, SAP Katalógus, Mező Mappingek, Szinkron Napló)
- **lib/connectors/sap/interface.ts** — RFC + OData connector stub interfészek (SapRfcConnector, SapODataConnector, createSapConnector factory)

### PLC Driver Interfészek
- **lib/connectors/plc/interface.ts** — IPlcDriver absztrakt interfész + createPlcDriver factory
- **drivers/s7.ts** — Siemens S7 stub (node-snap7 integrációhoz)
- **drivers/modbus.ts** — Modbus TCP/RTU stub (modbus-serial integrációhoz)
- **drivers/mqtt.ts** — MQTT stub (mqtt csomag integrációhoz)
- **drivers/opcua.ts** — OPC-UA stub (node-opcua integrációhoz)
- **002_plc_enhancements.sql** — mod_plc_alerts, mod_plc_driver_config, mod_plc_poll_status, mod_plc_alert_events táblák
- **plc-connector manifest** — OPC-UA hozzáadva protokoll opcióhoz, 002 migráció regisztrálva

### AI Asszisztens fejlesztés
- **SYSTEM_PROMPT teljes újraírás** — mind a 18 modul + SAP táblák (mod_sap_*) + PLC táblák (mod_plc_*) + Digital Twin táblák ismeret
- **BI fókusz** — OEE benchmark (World Class = 85%), minőségi arány formula, karbantartási minták
- **Többnyelvű** — HU/DE/EN válasz a kérdés nyelvének megfelelően
- **SQL szabályok** — MSSQL alapértelmezett + PostgreSQL opció kezelve

---

## [1.2.0] - 2026-03-12

### Stabilitás & PostgreSQL Go-Live (P0)
- **Supabase felhő integráció** — PgBouncer SSL, Vercel deployment
- **pg.types parser** — DECIMAL/NUMERIC számként, DATE ISO stringként
- **Auth javítás** — bcrypt boolean konverzió, session timeout fix
- **Security headers** — CSP, HSTS, Permissions-Policy, SameSite=strict

### UX & i18n (P0–P1)
- **Workforce UX teljes újraírás** — shift gombok, overwrite detection, overtime rögzítés
- **i18n: 14 modul DashboardPage konvertálva** — 260+ kulcs HU/EN/DE
- **i18n: Admin panel** — UserTable, UserForm, UserFilters, AuditLogTable, SyncStatusWidget
- **Nyelvváltó javítás** — SW cache kizárás, I18nProvider module-level store
- **Mobile Header** — logo+avatar+lang+logout responsive layout
- **Dátum input mezők** — dark theme CSS (color-scheme: dark)
- **Landing page i18n** — 50+ kulcs HU/EN/DE, marketing layout
- **Password change oldal i18n** — 27 kulcs HU/EN/DE

### Teljesítmény optimalizálás (P1)
- **useMemo** — 6 modulban memorizált számítások
- **staleTime 5min** — React Query cache optimalizálás
- **CommandPalette lazy load** — dead Inter import törölve
- **refetchOnWindowFocus kikapcsolva** — felesleges API hívások csökkentve

### Modul funkciók (P3)
- **Reports riport motor** — query API, viewer, editor, delete (commit 92f6da0)
- **Maintenance "kész" jelölés** — complete API, log API, tab UI (commit 10cfac1)
- **Quality 8D riport** — CRUD API + D1-D8 wizard + viewer modal (commit 5433b6d)
- **Performance célérték UI** — targets CRUD API + modal (commit e13b520)
- **Excel/PDF export** — SQL injection fix, ExportButton 9 modulba, i18n

### Demo & Digital Twin (P4)
- **Digital Twin valós API** — CRUD, 7 gép seed, layout DB
- **Demo auto-reset** — Vercel Cron 03:00 UTC, CRON_SECRET
- **Demo seed bővítés** — reports 8 mentett def., PLC 4 eszköz, quality 8D 4 riport
- **Mobile responsive** — 5 loading grid + audit oldal

---

## [1.0.0] - 2026-03-08

### Core rendszer
- **Auth** — Session-alapú autentikáció, bcrypt jelszó hash
- **RBAC** — Szerepkör és jogosultság rendszer, `checkAuth` middleware
- **Licenc** — Tier-alapú licencelés (Basic/Professional/Enterprise)
- **Unit System** — Egyedi mértékegységek definiálása
- **i18n** — Többnyelvű támogatás (HU/EN/DE), fallback JSON-ok
- **Module System** — Dinamikus modul betöltés, permission auto-regisztráció
- **Import Pipeline** — Generikus Excel/CSV import, oszlop mapping

### Admin Panel
- Felhasználók kezelése
- Szerepkörök & Jogok mátrix
- Modulok be/kikapcsolása
- Branding & Beállítások
- Mértékegységek
- Nyelv & Formátumok
- Import konfigurációk
- Diagnosztika
- Audit napló
- Licenc információ

### Basic csomag modulok
- **Workforce** — Létszám & Jelenlét rögzítés
- **Tracking** — Feladat/rendelés felkövetés
- **Fleet** — Gépjármű nyilvántartás, futások
- **File-import** — Generikus fájl import UI
- **Reports** — Riport generátor alap

### Professional csomag modulok
- **Performance** — Egyéni és csapat KPI, hatékonyság
- **Scheduling** — Heti kapacitás tervezés
- **Delivery** — Kiszállítási riport
- **Inventory** — Készletnyilvántartás

### Technikai
- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript 5.9
- Tailwind CSS 4
- MSSQL adapter
- Docker támogatás

## [1.1.0] - 2026-03-09

### Multi-DB & Multi-Auth
- **PostgreSQL adapter** — Auto SQL konverzió (@param → $N, SYSDATETIME → NOW())
- **SQLite adapter** — Sync→async wrapper, SQL szintaxis átalakítás
- **SQL Dialect absztrakció** — MSSQL, PostgreSQL, SQLite dialektusok
- **JWT adapter** — HMAC-SHA256 access token (15 perc) + refresh token

### Enterprise modulok
- **OEE** — Géphatékonyság (Availability × Performance × Quality)
- **Shift Management** — Műszakbeosztás kezelés, ütközés detekció
- **Quality** — Minőségellenőrzés, inspekciók, 8D riportok
- **Maintenance** — Karbantartás ütemezés, asset management

### Innovációs Feature-ök
- **PLC Connector** — Siemens S7, Modbus TCP, MQTT adatgyűjtés
- **Digital Twin** — 2D gyártósor vizualizáció, valós idejű gép állapotok
- **AI Asszisztens** — OpenAI GPT-4o-mini, természetes nyelvű lekérdezések
- **Workflow Engine** — No-code szabály motor (trigger → condition → action)
- **API Gateway** — API key alapú külső hozzáférés, rate limiting
- **Multi-site** — Több telephelyes cégek támogatása

### UX & Produktivitás
- **Globális keresés** — Ctrl+K Command Palette (oldalak, modulok)
- **Nyelvváltó** — HU 🇭🇺 / EN 🇬🇧 / DE 🇩🇪 azonnali váltás a Headerben
- **PDF/Excel Export** — Modulonkénti adatexport (styled, auto-filter)
- **Landing Page** — Marketing oldal (Hero, Features, Pricing, CTA)
- **Dashboard Builder** — Felhasználónkénti layout mentés (widget rendszer)
- **Real-time SSE** — Server-Sent Events, in-memory Event Bus
- **PWA** — Installable web app, Service Worker, offline cache

### Infrastruktúra
- **Email értesítések** — nodemailer SMTP (admin konfigurálható)
- **Fordítás szerkesztő** — Admin API DB override fordítások
- **Setup Wizard** — 5-lépéses első beállítás (admin, branding, modulok, licenc)
- **Demo seed script** — Realisztikus tesztadatok generálása
- **Tesztek + CI** — vitest unit tesztek, GitHub Actions pipeline
- **Migration 015** — workflow_rules, api_keys, sites, dashboard_layouts táblák

### Dokumentáció
- **ARCHITECTURE.md** — Teljes rendszer architektúra (11+ szekció)
- **OWNER_GUIDE.md** — Fejlesztői/tulajdonosi útmutató (32 fejezet)
- **MARKET_ANALYSIS.md** — Piackutatás, versenytársak, árképzés, GTM stratégia
- **FUTURE_ROADMAP.md** — Feature roadmap (17/21 implementálva)
- Mappa rendezés: docs/todo/, docs/archive/

---

## [Tervezett]

### 2.0.0
- Marketplace (harmadik fél modulok piactere)
- Mobile App (React Native / Expo)
- Multi-tenant SaaS architektúra
- Embedded BI (drag-and-drop riport builder)
