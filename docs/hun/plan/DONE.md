# BEFEJEZETT FELADATOK — Archívum

> Ide kerülnek a kész feladatok dátummal, hogy lehessen követni a haladást.

---

## 2026.03.15 — Phase 0-7 Roadmap teljes implementáció

### Phase 0: Stabilizáció (commit 3f350c3)
- ✅ Dupla € bug javítás (`formatCurrency` → `currencySymbol()` helper)
- ✅ Landing page error boundary javítás (Hero unmount fix)
- ✅ Nyelvváltás cache invalidáció (`sw.js` versioning)
- ✅ `force-dynamic` eltávolítás auth route-okból
- ✅ Dupla session validálás kiküszöbölés
- ✅ Sidebar renderelés optimalizálás (`React.memo`)
- ✅ `getSetting` bulk mód (egy query N beállításhoz)
- ✅ SSE heartbeat intervallum növelés (10s → 30s)
- ✅ TIER_MODULES javítás (invoicing, digital-twin, sap-import, plc-connector átrendezés)

### Phase 1: Starter Tier + Landing (commit 3f350c3)
- ✅ 4-tier license modell (Starter €99/Basic €299/Professional €599/Enterprise €1199)
- ✅ `lib/license/tiers.ts` teljes átírás (TIER_MODULES, ADDON_MODULES, TIER_PRICES, TIER_MAX_USERS, IMPLEMENTATION_FEES)
- ✅ Starter tier: dashboard, settings, user management (max 5 user)
- ✅ 7 add-on modul struktúra (sap-import, e-commerce, appointments, recipes, projects, api-gateway, multi-site)
- ✅ Landing page frissítés (4 tier kártya, helyes árazás)

### Phase 2: Purchasing + POS (commit 679c889)
- ✅ `purchasing` modul — beszállítók CRUD, rendelések, beérkezés → inventory
- ✅ `pos` modul — POS felület, eladás, fizetési mód, napi zárás
- ✅ 6 DB migráció (suppliers, purchase_orders, purchase_order_items, goods_receipts, pos_sessions, pos_transactions)
- ✅ Seed adatok (5 beszállító, 3 rendelés, 3 POS tranzakció)

### Phase 3: CRM + Worksheets (commit f7d5366)
- ✅ `crm` modul — ügyfelek, pipeline (lead→won/lost), interakciók, emlékeztetők
- ✅ `worksheets` modul — munkalapok, munkaóra tracking, anyaghasználat, digitális aláírás, PDF export, → számla konverzió
- ✅ 5 DB migráció (crm_contacts, crm_interactions, crm_reminders, worksheets, worksheet_items)
- ✅ Seed adatok (10 CRM kontakt, 15 interakció, 5 munkalap)
- ✅ Modul regisztráció `_loader.ts`-ben (Professional tier)

### Phase 4: Sector Presets (commit 97b96af)
- ✅ 6 iparági preset (manufacturing, food_production, automotive, logistics, retail, services)
- ✅ Setup wizard UI (`/setup` oldal) — preset kiválasztó kártyák, auto-aktiválás
- ✅ API endpoint (`/api/setup/sector-preset`)
- ✅ Preset → modul mapping (sector_presets tábla + admin UI)
- ✅ Landing page integrált szektor szekció

### Phase 5: Niche Modules (commit 1e8c69a)
- ✅ `recipes` modul — receptúra kezelés, hozzávalók, gyártás → inventory csökkentés
- ✅ `appointments` modul — időpontfoglalás, naptár nézet, kapacitás kezelés, emlékeztetők
- ✅ `projects` modul — projekt CRUD, feladatok, Kanban tábla, költségvetés tracking
- ✅ 7 DB migráció (recipes, recipe_ingredients, recipe_productions, appointments, appointment_slots, projects, project_tasks)
- ✅ Seed adatok (5 recept, 20 foglalás, 3 projekt + 12 feladat)
- ✅ Add-on pricing: recipes €29, appointments €29, projects €49

### Phase 6: Integrations (commit 9b9a578)
- ✅ `e-commerce` modul — WooCommerce/Shopify szinkronizáció, rendelés import, készlet push
- ✅ `api-gateway` modul — API kulcs kezelés, rate limiting (100 req/perc), request napló, külső REST hozzáférés
- ✅ 5 DB migráció (ecommerce_connections, ecommerce_orders, ecommerce_sync_log, api_keys, api_request_log)
- ✅ Seed adatok (1 WooCommerce kapcsolat, 5 e-commerce rendelés, 2 API kulcs)

### Phase 7: Optimization (commit 36917ff)
- ✅ Service Worker v3 — modul chunk cache, stale-while-revalidate stratégia
- ✅ PWA manifest — installálható alkalmazás, ikonok, standalone display
- ✅ OffscreenCanvas — NeuronBackground fő szálon kívül fut (main thread tehermentesítés)
- ✅ CSP headers — Content-Security-Policy proxy.ts-ben (script-src, style-src, connect-src stb.)
- ✅ Edge auth pre-check — proxy.ts-ben session validálás API route-okhoz
- ✅ `proxy.ts` alkalmazása (Next.js 16 — middleware.ts build hibát okoz)

---

## 2026.03.13 — Migráció & Bug javítások

### Modul-specifikus javítások
- ✅ digital-twin: Teljes backend API (CRUD + seed 7 gép + layout DB integráció)
- ✅ sap-import: Admin UI 4 fül + 5 tábla migráció + 50+ objektum katalógus
- ✅ plc-connector: Eszköz nyilvántartás + 4 driver interfész (S7, Modbus, MQTT, OPC-UA)
- ✅ scheduling: Allokáció tábla + tervezés UI
- ✅ quality: 8D riport wizard D1-D8 + viewer modal
- ✅ maintenance: Karbantartás napló + complete API + tab UI
- ✅ performance: Célérték beállító + performance_targets tábla + modal UI
- ✅ reports: Riport motor (query API, viewer, editor, delete — recharts alapú)

---

## 2026.03.12

### Deployment
- ✅ Supabase Cloud migráció (55 tábla + 1 view, 0 hiba)
- ✅ Demo adat seedelés (3291 sor, 27 tábla)
- ✅ Vercel deployment működik
- ✅ Login fix: `pg` modul statikus import (Vercel NFT)
- ✅ Login fix: Boolean konverzió (`is_active = 1` → `= true`)
- ✅ Login fix: `I18nProvider` hozzáadva auth layout-hoz
- ✅ Login fix: DB_SERVER régió javítás (`eu-central-1` → `eu-north-1`)
- ✅ Dashboard fix: `SELECT TOP N` → `LIMIT N` konverzió
- ✅ `lib/db/index.ts`: statikus import minden adapter-re (require() törött Turbopack/ESM-mel)
- ✅ `next.config.ts`: `output: 'standalone'` eltávolítva (Vercel inkompatibilis)
- ✅ `.vscode/mcp.json` létrehozva (GitHub + Postgres MCP)

### i18n
- ✅ Nyelvváltó HU/EN/DE (1 kattintás, SW cache fix)
- ✅ Login oldal fordítások (I18nProvider wrapping)

### DevOps
- ✅ Git konfiguráció: `timetolife1989` / `timetolife1989@gmail.com`
- ✅ Docs cleanup (en/de/archive/todo mappák törölve)

---

## 2026.03.10

### Core
- ✅ SQLite session timezone fix (ISO 8601 UTC)
- ✅ Header hydration fix (idő renderelés csak kliens oldalon)
- ✅ Service Worker v2 (dashboard kizárva cache-ból)
- ✅ Nyelvváltó végleges architektúra (I18nProvider + modul-szintű store)
