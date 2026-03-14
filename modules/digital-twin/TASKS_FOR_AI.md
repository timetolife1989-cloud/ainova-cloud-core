# TASKS_FOR_AI.md — Digital Twin modul

> **Modul:** digital-twin
> **Állapot:** ✅ Production Ready (CRUD API + 7 gép seed + layout DB)
> **Csomag:** Enterprise
> **Utolsó frissítés:** 2026.03.15

## Befejezett funkciók
- [x] Frontend: 2D SVG gyártósor vizualizáció
- [x] Frontend: 7 gép megjelenítés állapot színekkel (running/idle/warning/error/maintenance)
- [x] Frontend: Interaktív gép kiválasztás + részletek panel
- [x] Frontend: Szállítószalag vizualizáció
- [x] Frontend: Állapot összesítő statisztika
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [x] DB: mod_dt_layouts + mod_dt_machines táblák (migrálva + seedel-ve)
- [x] Backend: API endpoint implementáció — `GET /api/modules/digital-twin/data` — CRUD
- [x] Backend: Gép állapot lekérdezés (mod_dt_machines)
- [x] Backend: Layout mentés/betöltés endpoint (mod_dt_layouts CRUD)
- [x] Backend: Gép pozíció mentés endpoint (x, y, width, height)
- [x] Seeder: 7 gép demo adat (CNC, Press, Welder, Assembly, Paint, QC, Pack)

## Még hátralévő feladatok

### P1 — Adat integráció
- [ ] Backend: OEE modul integráció (aktuális OEE érték megjelenítés gépenként)
- [ ] Backend: PLC Connector integráció (valós gép állapot ha PLC elérhető)
- [ ] Backend: Maintenance integráció (esedékes karbantartás jelzés)
- [ ] Frontend: Valós idejű frissítés SSE-vel (30 másodpercenként)

### P2 — UI fejlesztés
- [ ] Frontend: Drag-and-drop gép elhelyezés (layout szerkesztő mód)
- [ ] Frontend: Zoom és pan a gyártósor térképen
- [ ] Frontend: Gép ikon testreszabás (típus alapján eltérő SVG)
- [ ] Frontend: Mini-dashboard popup a kiválasztott géphez
- [ ] Frontend: Teljes képernyős nézet

### P3 — Tesztek
- [ ] Backend: Unit teszt — layout CRUD
- [ ] Backend: Unit teszt — gép állapot aggregáció
