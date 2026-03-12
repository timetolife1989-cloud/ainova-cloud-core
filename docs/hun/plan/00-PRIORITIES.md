# PRIORITÁSOK — 2026.03.12

> ŐSZINTE státusz. Nincs hamis ✅ — csak az van megjelölve ami TÉNYLEG működik a live URL-en.

---

## P0 — KRITIKUS (javítva, push-olva)

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

## P1 — MOST JAVÍTANDÓ (CEO feedback 2026.03.12)

- ✅ Mobile nyelvváltó javítva (Header responsive — logo+avatar+lang+logout mobilon is)
- ✅ Dátum input mezők: dark theme CSS (color-scheme: dark, webkit-calendar invert)
- ✅ Workforce shift nevek i18n (Reggeli/Délutáni/Éjszakai → labelKey pattern hu/en/de)
- ✅ Header i18n (logout, hét, nyelvváltás hiba)
- ✅ Landing page i18n (50+ kulcs hu/en/de, marketing layout + I18nProvider)
- ✅ Audit napló oldal i18n (szűrők, gombok, paginálás — 23 kulcs hu/en/de)
- ⬜ Lassú mobilon ÉS PC-n is → ✅ Teljesítmény optimalizálás (useMemo 6 modulban, staleTime 5min, refetchOnWindowFocus kikapcsolva, MenuTile CSS-only, CommandPalette lazy load, dead Inter import törölve)
- ⬜ Egyes modulokban nincs adat → ✅ Demo seed bővítés (reports 8 mentett definíció, PLC connector 4 eszköz, quality 8D 4 riport)

## P2 — FONTOS (ezen a héten)

- ⬜ Dashboard nyelvváltó (nem frissül rendesen Vercel-en) → ✅ force-dynamic + revalidatePath + router.refresh
- ⬜ Password change oldal tesztelése → ✅ i18n (27 kulcs hu/en/de), layout + I18nProvider

## P3 — KÖZEPES (jövő hét)

- ⬜ Reports modul: riport motor implementálás (jelenleg SKELETON)
- ⬜ Maintenance: "kész" jelölés + napló UI
- ⬜ Quality: 8D riport UI
- ⬜ Performance: célérték beállító UI
- ⬜ Excel/PDF export javítás minden modulban

## P4 — NICE TO HAVE (később)

- ⬜ Digital Twin: valós API endpoint (jelenleg hardcoded demo)
- ⬜ PLC Connector: S7/Modbus/MQTT driverek
- ⬜ SAP import modul
- ⬜ Demo környezet auto-reset
- ⬜ Mobile responsive optimalizáció (teljes audit)
- ⬜ AI funkciók (prediktív karbantartás)
