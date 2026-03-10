# Changelog

Minden jelentős változás dokumentálva van ebben a fájlban.

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
