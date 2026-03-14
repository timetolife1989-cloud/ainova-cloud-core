# PRIORITÁSOK — 2026.03.15

> ŐSZINTE státusz — Phase 0-7 roadmap TELJESÍTVE. Alább a kiegészítő feladatok, amik a Phase-ektől függetlenül kerültek felvételre.

---

## P0 — KRITIKUS (mind javítva ✅)

- ✅ Vercel deployment működik (Supabase Cloud, PgBouncer, SSL)
- ✅ Login működik (pg modul, boolean konverzió, i18n provider)
- ✅ Dashboard modulok listázása (SELECT TOP → LIMIT konverzió)
- ✅ MSSQL→PG szintaxis konverzió (12+ pattern a PostgresAdapter-ben)
- ✅ DATE típusú oszlopok ISO string-ként jönnek (nem Date objektum)
- ✅ DECIMAL/NUMERIC oszlopok számként jönnek (nem string) — pg.types parser
- ✅ Workforce API Number() biztonsági réteg
- ✅ .gitignore UTF-8 javítás (korábban UTF-16 korrumpálódott)
- ✅ Workforce UX teljes újraírás (shift gombok, overwrite detection, report-required, validációk)
- ✅ Inaktivitás érzékelés (25p figyelmeztetés, 30p auto-kijelentkezés)
- ✅ Túlóra rögzítés (overtime_hours + overtime_workers — DB, API, UI, i18n)
- ✅ i18n: ÖSSZES modul DashboardPage (14 komponens konvertálva, 260+ kulcs hu/en/de)
- ✅ i18n: Admin panel (UserTable, UserForm, UserFilters, AuditLogTable, SyncStatusWidget)
- ✅ Security headers (CSP, HSTS, Permissions-Policy, SameSite=strict)

## P1 — MOST JAVÍTANDÓ (CEO feedback — mind javítva ✅)

- ✅ Mobile nyelvváltó javítva (Header responsive — logo+avatar+lang+logout mobilon is)
- ✅ Dátum input mezők: dark theme CSS (color-scheme: dark, webkit-calendar invert)
- ✅ Workforce shift nevek i18n (Reggeli/Délutáni/Éjszakai → labelKey pattern hu/en/de)
- ✅ Header i18n (logout, hét, nyelvváltás hiba)
- ✅ Landing page i18n (50+ kulcs hu/en/de, marketing layout + I18nProvider)
- ✅ Audit napló oldal i18n (szűrők, gombok, paginálás — 23 kulcs hu/en/de)
- ✅ Teljesítmény optimalizálás (useMemo 6 modulban, staleTime 5min, refetchOnWindowFocus kikapcsolva, MenuTile CSS-only, CommandPalette lazy load, dead Inter import törölve)
- ✅ Demo seed bővítés (reports 8 mentett definíció, PLC connector 4 eszköz, quality 8D 4 riport)

## P2 — FONTOS (mind javítva ✅)

- ✅ Dashboard nyelvváltó (force-dynamic + revalidatePath + router.refresh)
- ✅ Password change oldal i18n (27 kulcs hu/en/de, layout + I18nProvider)

## P3 — KÖZEPES (mind javítva ✅)

- ✅ Reports modul: riport motor implementálás (query API, viewer, editor, delete — commit 92f6da0)
- ✅ Maintenance: "kész" jelölés + napló UI (complete API, log API, tab UI — commit 10cfac1)
- ✅ Quality: 8D riport UI (CRUD API, wizard D1-D8, viewer modal, i18n — commit 5433b6d)
- ✅ Performance: célérték beállító UI (targets CRUD API, tab UI, modal — commit e13b520)
- ✅ Excel/PDF export javítás minden modulban (SQL injection fix, ExportButton 9 modulba, i18n)

## P4 — NICE TO HAVE (mind javítva ✅)

- ✅ Digital Twin: valós API endpoint (CRUD, seed 7 gép, layout DB)
- ✅ PLC Connector: driver interfészek előkészítve (S7/Modbus TCP/Modbus RTU/MQTT/OPC-UA stub driverek, 002 migráció — alerts, driver_config, poll_status táblák)
- ✅ SAP import modul: teljes séma + API + admin UI előkészítve (mod_sap_* 5 tábla, 50+ objektum katalógus seed, 4 API route, 4 fül DashboardPage — RFC/OData aktiváláshoz külső integrációs kulcs szükséges)
- ✅ Demo környezet auto-reset (Vercel Cron 03:00 UTC, CRON_SECRET)
- ✅ Mobile responsive optimalizáció (5 loading grid + audit)
- ✅ AI Asszisztens SYSTEM_PROMPT teljes újraírás (mind a 18 modul + SAP + PLC táblaismeret, OEE benchmark, minőségi formula, BI fókusz — OpenAI API kulcs szükséges)

## P5 — Phase 0-7 Roadmap (2026.03.15 — mind KÉSZ ✅)

- ✅ Phase 0: Stabilizáció (dupla €, force-dynamic, getSetting bulk, SSE heartbeat, TIER_MODULES)
- ✅ Phase 1: 4-tier licenc + Starter csomag + Landing page árazás
- ✅ Phase 2: Purchasing + POS modulok (6 DB tábla, CRUD API, seed)
- ✅ Phase 3: CRM + Worksheets modulok (5 DB tábla, pipeline, PDF, számla konverzió)
- ✅ Phase 4: Sector Presets (6 iparági preset, Setup wizard UI, auto-aktiválás)
- ✅ Phase 5: Recipes + Appointments + Projects add-on modulok (7 DB tábla)
- ✅ Phase 6: E-commerce + API Gateway integráció (5 DB tábla, rate limiting)
- ✅ Phase 7: SW v3 + PWA + OffscreenCanvas + CSP + edge auth

---

## HÁTRALÉVŐ TEENDŐK (aktuális)

| # | Feladat | Prioritás | Állapot |
|---|---------|-----------|---------|
| 1 | i18n: hardcoded stringek (login, setup, admin részleges) | KÖZEPES | Részben kész |
| 2 | Unit tesztek (vitest) | KÖZEPES | Minimális coverage |
| 3 | E2E tesztek (Playwright) | KÖZEPES | Nincs |
| 4 | SAP RFC SDK aktiválás | ALACSONY | Ext. SDK szükséges |
| 5 | PLC driver aktiválás (hardware) | ALACSONY | Hardware szükséges |
| 6 | SMTP email konfiguráció | ALACSONY | Kód kész, konfig hiányzik |
| 7 | Pilot ügyfél telepítés | MAGAS | Első éles teszt |
