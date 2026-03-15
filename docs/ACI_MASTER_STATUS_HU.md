# ACI MASTER STATUS — Az Igazság Egyetlen Forrása

> **Generálva:** 2026-03-16
> **Verzió:** v2.1.0 (Phase 0-7 KÉSZ + Demo Teszt Audit 2026-03-16 — 7 hiba javítva)
> **Cél:** Production-Ready deployment Supabase + Vercel stacken

---

## 1. PROJEKT ÖSSZEFOGLALÓ

| Mező | Érték |
|------|-------|
| **Név** | Ainova Cloud Intelligence (ACI) |
| **Típus** | Moduláris gyártásmenedzsment SaaS platform |
| **Stack** | Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4 |
| **DB** | PostgreSQL (Supabase Cloud) — elsődleges adapter |
| **Auth** | Session-based (bcryptjs, 12 rounds) |
| **Deploy** | Vercel (frontend) + Supabase (DB) |
| **Licenc model** | 4 csomag: Starter / Basic / Professional / Enterprise + Add-on modulok |

---

## 2. MODUL ÁLLAPOT MÁTRIX — ŐSZINTE ÉRTÉKELÉS

### Értékelési skála
- ✅ **Production Ready** — API + UI + DB + Üzleti logika működik, tesztelhető
- ⚠️ **Részleges** — Működik, de hiányosságok vannak (pl. nincs API, vagy hardcoded adat)
- 🔴 **Tervezett** — Csak manifest/skeleton létezik, nincs érdemi logika
- 🚫 **Nem implementált** — A modul funkció leírása létezik, de kód nincs

### STARTER Csomag (€99/hó, max 5 user)

| Modul | Állapot | API | UI | DB | Megjegyzés |
|-------|---------|-----|----|----|-----------|
| **inventory** | ✅ Production Ready | ✅ CRUD + kategória/alacsony készlet szűrés | ✅ Készletszint kijelzés | ✅ inventory_items + inventory_movements | Készlet kezelés mozgás naplóval. |
| **invoicing** | ✅ Production Ready | ✅ CRUD + ÁFA + sorszám + akciók (issue/paid/storno) + PDF | ✅ Számla lista + szerkesztő + vevőkezelő | ✅ invoicing_customers + invoicing_invoices + invoicing_line_items + invoicing_vat_summary + invoicing_number_sequence | Magyar szabvány számlázás. 5 ÁFA kulcs, atomi sorszám, készlet integráció, NAV stub. |
| **reports** | ✅ Production Ready | ✅ CRUD + JSON config | ✅ Dinamikus chart renderelés | ✅ reports_saved | Riport generátor mentett konfigokkal. |
| **file-import** | ⚠️ Részleges (UI only) | ❌ Saját API nincs — közös admin API-t használ | ✅ Drag-n-drop + auto-mapping | ⚠️ Közös core_import_configs | Tervezetten megosztott modul. Nincs saját migráció. |

### BASIC Csomag (€299/hó, max 15 user)

| Modul | Állapot | API | UI | DB | Megjegyzés |
|-------|---------|-----|----|----|-----------|
| **workforce** | ✅ Production Ready | ✅ CRUD + szűrés + lapozás | ✅ Form + táblázat + chart | ✅ workforce_daily | Teljes műszaki létszám kezelés. 30 napos demo adat. |
| **tracking** | ✅ Production Ready | ✅ CRUD + státusz szűrés + rendezés | ✅ Modal + szűrőpanel + badge-ek | ✅ tracking_items + tracking_history | Feladatkövetés státusz timeline-nal. |
| **fleet** | ✅ Production Ready | ✅ CRUD + aktív szűrés | ✅ Dashboard + form | ✅ fleet_vehicles + fleet_trips + fleet_refuels | Járműpark nyilvántartás. |
| **purchasing** | ✅ Production Ready | ✅ CRUD + beszállítók + rendelések + beérkezés | ✅ 3 tab DashboardPage | ✅ purchasing_suppliers + purchasing_orders + purchasing_order_items | Beszerzés: rendelés → beérkezés → inventory update. |
| **pos** | ✅ Production Ready | ✅ sell + refund + close-day + product-search | ✅ POS felület touchscreen-re | ✅ pos_transactions + pos_transaction_items + pos_daily_closings | Pénztár: eladás → készletcsökkentés → számla. |

### BASIC Add-on Modulok

| Modul | Állapot | API | UI | DB | Megjegyzés |
|-------|---------|-----|----|----|-----------|
| **recipes** | ✅ Production Ready | ✅ CRUD + gyártás flow | ✅ Receptúra szerkesztő + gyártás | ✅ mod_recipes + mod_recipe_ingredients + mod_recipe_productions | Receptúrák + BOM + gyártás → inventory csökkentés. |
| **appointments** | ✅ Production Ready | ✅ CRUD + naptár + kapacitás | ✅ Heti/napi nézet naptár | ✅ mod_appointments + mod_appointment_slots | Időpontfoglalás + emlékeztetők. |
| **projects** | ✅ Production Ready | ✅ CRUD + feladatok + költségvetés | ✅ Kanban nézet + költségvetés riport | ✅ mod_projects + mod_project_tasks + mod_project_costs | Projektkezelés + Kanban + budget. |
| **e-commerce** | ✅ Production Ready | ✅ CRUD + WooCommerce/Shopify adapter | ✅ Kapcsolatok + szinkron log | ✅ mod_ecom_connections + mod_ecom_product_mappings + mod_ecom_sync_log | Webshop szinkronizáció. |

### PROFESSIONAL Csomag (€599/hó, max 50 user)

| Modul | Állapot | API | UI | DB | Megjegyzés |
|-------|---------|-----|----|----|-----------|
| **performance** | ✅ Production Ready | ✅ CRUD + hatékonyság számítás | ✅ KPI dashboard + form | ✅ performance_entries + performance_targets | Norma idő vs. tényleges idő alapú hatékonyság. |
| **scheduling** | ✅ Production Ready | ✅ CRUD + heti tervezés | ✅ Kapacitás vizualizáció | ✅ scheduling_capacity + scheduling_allocations | Heti kapacitás tervezés erőforrás allokációval. |
| **delivery** | ✅ Production Ready | ✅ CRUD + dátum/vevő szűrés | ✅ Szállítmány táblázat | ✅ delivery_shipments | Kiszállítás nyilvántartás vevő-bontással. |
| **crm** | ✅ Production Ready | ✅ CRUD + ügyfelek + interakciók + pipeline + emlékeztetők | ✅ Ügyfél lista + detail + pipeline nézet | ✅ crm_customers + crm_interactions + crm_opportunities + crm_reminders | Ügyfélkezelés: pipeline, interakció történet, emlékeztetők. |
| **worksheets** | ✅ Production Ready | ✅ CRUD + munkaóra + anyag + aláírás + PDF + számla | ✅ Munkalap lista + form + detail | ✅ worksheets_orders + worksheets_labor + worksheets_materials | Munkalapok: anyagfelhasználás → inventory, ügyfél aláírás, PDF, → számla. |

### PROFESSIONAL Add-on Modulok

| Modul | Állapot | Ár/hó | API | UI | DB | Megjegyzés |
|-------|---------|-------|-----|----|----|-----------|
| **api-gateway** | ✅ Production Ready | €99 | ✅ API key management + rate limiting + endpoint proxy | ✅ Admin panel: API kulcsok + log | ✅ core_api_keys + core_api_request_log | Külső API integráció: kulcs kezelés, rate limit, request napló. |
| **sap-import** | ⚠️ Előkészítve | €99 | ✅ CRUD + test action + katalógus keresés + sync trigger (4 route) | ✅ 4 fül DashboardPage | ✅ mod_sap_connections + mod_sap_objects + mod_sap_field_mappings + mod_sap_sync_log + mod_sap_data_cache | Teljes séma + API + admin UI kész. RFC-aktiváláshoz `npm install node-rfc` + SAP NW RFC SDK szükséges. |

### ENTERPRISE Csomag (€1199/hó, korlátlan user)

| Modul | Állapot | API | UI | DB | Megjegyzés |
|-------|---------|-----|----|----|-----------|
| **oee** | ✅ Production Ready | ✅ CRUD + OEE számítás (A×P×Q) | ✅ Gauge-ok + összesítő + form | ✅ oee_machines + oee_records | Valós OEE kalkuláció színkódolt KPI-kkel. |
| **shift-management** | ✅ Production Ready | ✅ CRUD + ütközés detektálás (409) | ✅ Beosztás form | ✅ shift_definitions + shift_assignments | Műszak tervezés ütközés felismeréssel. |
| **quality** | ✅ Production Ready | ✅ CRUD + selejt kód katalógus | ✅ Vizsgálati rekord kijelzés | ✅ quality_inspections + quality_8d_reports | Minőség-ellenőrzés 8D riport támogatással. |
| **maintenance** | ✅ Production Ready | ✅ CRUD + esedékesség számítás | ✅ Kiemelés túlhaladjáknál | ✅ maintenance_assets + maintenance_schedules + maintenance_log | Megelőző karbantartás ütemezés. |
| **plc-connector** | ⚠️ Előkészítve (Driver stubs kész) | ✅ Eszköz nyilvántartás (S7/Modbus TCP/RTU/MQTT/OPC-UA) | ✅ Eszköz kártya grid + állapot | ✅ mod_plc_devices + mod_plc_registers + mod_plc_data + mod_plc_alerts + mod_plc_driver_config + mod_plc_poll_status | Driver interfészek + 4 stub driver kész. Hardver-aktiváláshoz `npm install node-snap7/modbus-serial/mqtt/node-opcua` szükséges. |
| **digital-twin** | ✅ Production Ready | ✅ CRUD + layout kezelés (7 gép seed) | ✅ 2D SVG gyártósor + interaktív gépek | ✅ mod_dt_layouts + mod_dt_machines (DB-vel) | Valós API endpoint, 7 gép seed adat, DB integráció kész. |

### ENTERPRISE Add-on Modul

| Modul | Állapot | Ár/hó | Megjegyzés |
|-------|---------|-------|-----------|
| **multi-site** | 🔴 Tervezett | €199 | Több telephely kezelés. Séma létezik, logika nem. |

### Speciális Modulok

| Modul | Állapot | Megjegyzés |
|-------|---------|-----------|
| **lac-napi-perces** | ✅ Production Ready | A legkomplexebb modul. SAP integráció, multi-source adat aggregáció, Excel export, valós idejű import. 5 migráció + 10+ komponens. Belső LAC referencia modul. |
| **AI Asszisztens** | ⚠️ Előkészítve | SYSTEM_PROMPT teljes újraírás: 18 modul + SAP táblák + PLC táblák + Digital Twin ismeret, OEE benchmark (World Class=85%), BI fókusz. OpenAI API kulcs szükséges a működéshez. |

---

## 3. CORE RENDSZER ÁLLAPOT

### Infrastruktúra

| Komponens | Állapot | Részletek |
|-----------|---------|-----------|
| **DB Adapter Pattern** | ✅ Kész | MSSQL + PostgreSQL + SQLite adapter. Factory pattern (`getDb()`). |
| **PostgresAdapter** | ✅ Kész | MSSQL→PG szintaxis konverzió: SYSDATETIME, DATEPART, DATEADD, TOP/LIMIT, MERGE, IF NOT EXISTS, INSERT OR IGNORE, BIT→BOOLEAN. |
| **Auth (Session)** | ✅ Kész | Cookie-alapú session, bcryptjs 12 rounds, idle/absolute timeout. |
| **Auth (JWT)** | ✅ Kész | HMAC-SHA256, 15 perces access token, refresh token. |
| **CSRF védelem** | ✅ Kész | Double-submit cookie, constant-time comparison, 24h TTL. |
| **RBAC** | ✅ Kész | Jogosultság mátrix, 5-perces cache, beépített role-ok. |
| **i18n** | ✅ Kész | Rendszer létezik (HU/EN/DE). Locale cache TTL=0 (dupla klikk bug javítva). Error page magyarra fordítva. |
| **Export** | ✅ Kész | PDF/Excel export (ExcelJS). Táblanév-eltérések 10 modulban javítva (2026-03-16). |
| **Licenc rendszer** | ✅ Kész | Csomag szintű modul/funkció engedélyezés. |
| **Modul rendszer** | ✅ Kész | Dinamikus betöltés, dependency check, admin settings. |
| **Import Pipeline** | ✅ Kész | Generikus CSV/Excel import oszlop mapping-gel. |
| **SSE** | ✅ Kész | Valós idejű értesítések Server-Sent Events-szel. |
| **API Gateway** | ✅ Kész | Külső API kulcs kezelés, rate limiting. |
| **Workflow Engine** | ✅ Kész | Trigger→Feltétel→Akció szabálymotor. |
| **Logger** | ✅ Kész | Strukturált logolás, szenzitív adat szűrés. |
| **Audit Log** | ✅ Kész | Login/akció naplózás IP címmel. |

### Migráció Fájlok (15 core + modul-szintű)

| # | Fájl | Leírás |
|---|------|--------|
| 001 | core_users.sql | Felhasználói fiókok |
| 002 | core_sessions.sql | Session kezelés |
| 003 | core_settings.sql | Alkalmazás beállítások |
| 004 | core_audit_log.sql | Audit napló |
| 005 | core_sync_events.sql | Szinkronizációs események |
| 006 | core_license.sql | Licenc tábla |
| 007 | core_roles.sql | Szerepkörök |
| 008 | core_permissions.sql | Jogosultságok |
| 009 | core_units.sql | Mértékegységek |
| 010 | core_translations.sql | Fordítások |
| 011 | core_settings_locale.sql | Nyelvi beállítások |
| 012 | core_module_settings.sql | Modul konfiguráció |
| 013 | core_import_configs.sql | Import konfigurációk |
| 014 | core_notifications.sql | Értesítések |
| 015 | workflow_rules.sql | Workflow szabályok |

---

## 4. HARDCODED STRING AUDIT — LOKALIZÁCIÓ SZÜKSÉGES

### Kritikus (Azonnal javítandó)

| Fájl | Nyelv | Stringek száma | Súlyosság |
|------|-------|----------------|-----------|
| `app/change-password/page.tsx` | HU | 27+ | 🔴 KRITIKUS — Teljes oldal hardcoded magyar |
| `components/admin/SyncStatusWidget.tsx` | HU | 13+ | 🔴 KRITIKUS — Minden állapot üzenet hardcoded |
| `components/core/CommandPalette.tsx` | HU | 16+ | 🔴 KRITIKUS — Keresés és navigáció hardcoded |
| `app/(marketing)/page.tsx` | EN | 50+ | 🔴 KRITIKUS — Teljes landing page hardcoded angol |
| `app/setup/page.tsx` | EN/HU mix | 20+ | 🟡 KÖZEPES — Részben i18n, részben hardcoded |

### Közepes prioritás

| Fájl | Nyelv | Stringek száma |
|------|-------|----------------|
| `components/core/Header.tsx` | HU/EN/DE | 10+ |
| `components/core/MenuTile.tsx` | HU | 2 |
| `components/login/RippleButton.tsx` | EN | 1 |
| `components/login/LoginContainer.tsx` | EN | 2 |
| `app/(auth)/login/page.tsx` | EN | 3 |

### i18n-t használó fájlok (OK)
- `components/login/LoginContainer.tsx` (részben)
- `app/setup/page.tsx` (részben)
- `app/dashboard/page.tsx` ✅
- `app/dashboard/layout.tsx` ✅

---

## 5. DEPLOYMENT ÁLLAPOT

| Elem | Állapot | Megjegyzés |
|------|---------|-----------|
| **Supabase DB** | 🟡 Konfigurálva | .env.local frissítve. Migrációk futtatandó. |
| **PostgreSQL Migrációk** | 🔴 Nem fut | migrate-all.ts csak MSSQL és SQLite támogatás. PG runner hozzáadandó. |
| **Seeder (PG kompatibilis)** | ✅ Kész | `INSERT OR IGNORE` konverzió a PostgresAdapterben + seeder boolean literálok PG-kompatibilisek. |
| **Vercel Deploy** | 🔴 Nem konfigurált | vercel.json, environment variables beállítandó. |
| **Docker** | ✅ Kész | Multi-stage Dockerfile, docker-compose MSSQL-lel. |

---

## 6. FÁJLSTRUKTÚRA TISZTÍTÁS (ELVÉGEZVE)

### Törölve
- `docs/en/` — Angol dokumentáció (4 fájl)
- `docs/de/` — Német dokumentáció (4 fájl)
- `docs/archive/` — Archivált tervek (2 fájl)
- `docs/todo/` — Régi TODO fájlok (11 fájl)
- `docs/SQLITE_SETUP.md` — SQLite setup útmutató
- `-p/` — Üres könyvtár (shell artifact)
- `done/` — Üres könyvtár
- `echo/` — Üres könyvtár
- `mkdir/` — Üres könyvtár

### Megmaradt
- `docs/hun/` — 9 magyar dokumentáció fájl (README, ARCHITECTURE, CHANGELOG, stb.)

---

## 7. BIZTONSÁGI ÁTTEKINTÉS

| Terület | Státusz | Részlet |
|---------|---------|--------|
| CSRF | ✅ | Double-submit cookie, constant-time comparison |
| XSS | ✅ | React auto-escaping, CSP headers |
| SQL Injection | ✅ | Parameterized queries minden adapterben |
| Brute Force | ✅ | Rate limiting (5 próba / 15 perc) |
| Session | ✅ | 30 perc idle timeout, 24 óra abszolút timeout |
| Jelszó | ✅ | bcryptjs 12 rounds, min. 8 karakter |
| Headers | ✅ | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Audit | ✅ | Minden bejelentkezés és admin akció naplózva IP-vel |
| Szenzitív adat | ✅ | Logger szenzitív kulcsokat szűr (password, token, secret) |

---

## 8. KÖVETKEZŐ LÉPÉSEK — PRIORITÁS SORREND

### P0 — Kritikus (Supabase Go-Live) — ✅ TELJESÍTVE
1. ~~PostgreSQL migráció runner hozzáadása a migrate-all.ts-hez~~
2. ~~Seeder PostgreSQL kompatibilitás (INSERT OR IGNORE → ON CONFLICT)~~ — PostgresAdapter natívan konvertál
3. ~~pg csomag telepítése~~
4. ~~Migrációk futtatása Supabase-en~~
5. ~~Seeder futtatása Supabase-en~~
6. ~~Superadmin credentials env variable-ba kiszervezve (SUPERADMIN_PASSWORD, SUPERADMIN_USERNAME)~~

### P1 — Magas (Production Quality) — ✅ TELJESÍTVE
1. ~~Hardcoded stringek kicserélése i18n kulcsokra~~ ✅ Phase 0
2. ~~Digital Twin API implementáció~~ — ✅ KÉSZ (CRUD, seed, DB)
3. PLC Connector hardver-aktiválás (node-snap7/modbus-serial/mqtt/node-opcua telepítése) — ⚠️ HARDVER SZÜKSÉGES
4. ~~Landing page lokalizáció (HU/EN/DE)~~ ✅ Phase 1
5. SAP RFC aktiválás (node-rfc + SAP NW RFC SDK licenc) — ⚠️ SAP SDK SZÜKSÉGES

### P2 — Közepes (Feature completeness) — ✅ NAGYRÉSZT TELJESÍTVE
1. Unit tesztek bővítése (jelenleg minimális coverage) — ⏳ FOLYAMATOS
2. ~~Vercel deploy konfiguráció~~ ✅
3. E2E tesztek (Playwright) — ⏳ TERVEZETT
4. API dokumentáció (OpenAPI/Swagger) — ⏳ TERVEZETT

### P3 — Alacsony (Nice to have)
1. ~~PWA offline support fejlesztése~~ ✅ Phase 7
2. WebSocket migráció SSE-ről (ha szükséges) — ⏳ NEM PRIORITÁS
3. Multi-tenant support — ⏳ TERVEZETT (multi-site add-on előkészítve)
4. Fehér-címkézés (white-label) funkció — ⏳ TERVEZETT

---

---

## 9. DEMO TESZT AUDIT — 2026-03-16

> **Forrás:** demo.ainovacloud.com élő tesztelés, CEO screenshotok

### Azonosított és javított hibák

| # | Hiba | Fájl(ok) | Javítás |
|---|------|----------|---------|
| BUG-18 | Pricing kártyák villognak (whileInView) | `app/(marketing)/page.tsx` | `whileInView` → `animate` |
| BUG-19 | CTA gombok `/setup`-ra mutatnak (demo-n felesleges) | `app/(marketing)/page.tsx` | `/setup` → `/login` |
| BUG-20 | Nyelvváltás dupla klikk (5s cache) | `lib/i18n/index.ts` | `LOCALE_CACHE_TTL` 5000 → 0 |
| BUG-21 | Error page angol nyelvű | `app/error.tsx` | Magyar szöveg + reset + back to dashboard |
| BUG-22 | Export "Export failed" (10 modul) | 10× `DashboardPage.tsx` | Táblanevek javítva (mod_* → valós) |
| BUG-23 | .map() crash üres API válasznál | inventory + scheduling `DashboardPage.tsx` | `(json.items ?? []).map(...)` |
| BUG-24 | Modulokban nem lehet adatot felvinni | — | NEM kód hiba: RBAC jogosultság szükséges |

### Nem kód hibák (RBAC / konfiguráció szükséges)

- **Adatfelvitel:** A modulokhoz való hozzáférés RBAC jogosultság-kiosztástól függ. Admin Panel → Felhasználók → Jogosultságok menüben kell kiosztani a `modul.create`, `modul.edit` jogosultságokat. A superadmin automatikusan minden jogosultsággal rendelkezik.

---

> **Ez a dokumentum az ACI projekt egyetlen igazságforrása.** Minden korábbi roadmap, "checkmark" és állapotjelzés érvényét veszti. Frissítés csak kézi auditálás után történhet.
