# PRIORITÁSOK — 2026.03.12

> Frissítsd ezt a fájlt minden session elején/végén!
> Jelölések: ✅ kész | 🔧 folyamatban | ❌ blokkolva | ⬜ nem kezdődött

---

## P0 — KRITIKUS (most kell megoldani)

- ✅ Vercel deployment működőképes (Supabase Cloud)
- ✅ Login működik (pg modul, boolean konverzió, i18n)
- ✅ `SELECT TOP N` → `LIMIT N` konverzió PostgresAdapter-ben
- 🔧 Dashboard modulok megjelenése Vercel-en (TOP→LIMIT fix push-olva, redeploy kell)
- ⬜ Teljes PostgreSQL kompatibilitás ellenőrzés (egyéb MSSQL szintaxisok?)

## P1 — FONTOS (ezen a héten)

- ⬜ Dashboard nyelvváltó javítás (nem frissül rendesen Vercel-en)
- ⬜ Hardcoded magyar string-ek → i18n kulcsok (login oldal, hibaüzenetek)
- ⬜ Landing page (`/`) véglegesítése (marketing tartalom, 3 csomag)
- ⬜ Password change oldal tesztelése Vercel-en

## P2 — KÖZEPES (jövő hét)

- ⬜ Digital Twin API implementálás (jelenleg hardcoded demo adat)
- ⬜ PLC Connector driverek (S7, Modbus, MQTT — jelenleg csak eszköz nyilvántartás)
- ⬜ Email értesítés rendszer (alacsony készlet, lejárt karbantartás)
- ⬜ Excel/PDF export finomhangolás minden modulban

## P3 — NICE TO HAVE (később)

- ⬜ SAP import modul aktiválás
- ⬜ Demo környezet auto-reset (24 órás ciklus)
- ⬜ Mobile responsive optimalizáció
- ⬜ PWA offline funkciók
- ⬜ AI funkciók (prediktív karbantartás, anomália detekció)
