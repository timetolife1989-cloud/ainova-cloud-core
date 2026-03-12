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

## P1 — ELLENŐRZÉSRE VÁR (push-olva, Vercel redeploy kell)

- 🔧 Workforce összesítő kártyák (ma: tervezett/tényleges/hiányzó) — DECIMAL fix push-olva
- 🔧 Workforce chartok (oszlop/terület/bontás) — DECIMAL fix push-olva
- 🔧 Workforce CRUD (létrehozás/szerkesztés/törlés) — tesztelni kell live-ban
- 🔧 Tracking modul — tesztelni kell Vercel-en
- 🔧 Többi modul live Vercel tesztelése

## P2 — FONTOS (ezen a héten)

- ⬜ i18n: hardcoded magyar stringek → useTranslation() a modulokban
- ⬜ Dashboard nyelvváltó (nem frissül rendesen Vercel-en)
- ⬜ Landing page (`/`) véglegesítése (marketing tartalom, árazás)
- ⬜ Password change oldal tesztelése

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
- ⬜ Mobile responsive optimalizáció
- ⬜ AI funkciók (prediktív karbantartás)
