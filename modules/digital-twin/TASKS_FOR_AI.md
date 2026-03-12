# TASKS_FOR_AI.md — Digital Twin modul

> **Modul:** digital-twin
> **Állapot:** ⚠️ Részleges (UI only, hardcoded demo adat)
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Frontend: 2D SVG gyártósor vizualizáció
- [x] Frontend: 7 gép megjelenítés állapot színekkel (running/idle/warning/error/maintenance)
- [x] Frontend: Interaktív gép kiválasztás + részletek panel
- [x] Frontend: Szállítószalag vizualizáció
- [x] Frontend: Állapot összesítő statisztika
- [x] DB: mod_dt_layouts + mod_dt_machines táblák (migrálva, de üresek)

## Még hátralévő feladatok

### P0 — Kritikus hiányzó funkciók
- [ ] Backend: API endpoint implementáció — `GET /api/modules/digital-twin/data` — jelenleg fallback demo adatot használ!
- [ ] Backend: Gép állapot lekérdezés (mod_dt_machines + OEE integráció)
- [ ] Backend: Layout mentés/betöltés endpoint (mod_dt_layouts CRUD)
- [ ] Backend: Gép pozíció mentés endpoint (x, y, width, height)

### P1 — Adat integráció
- [ ] Backend: OEE modul integráció (aktuális OEE érték megjelenítés gépenként)
- [ ] Backend: PLC Connector integráció (valós gép állapot ha PLC elérhető)
- [ ] Backend: Maintenance integráció (esedékes karbantartás jelzés)
- [ ] Frontend: Hardcoded demo adat eltávolítása, API-ról való betöltésre váltás
- [ ] Frontend: Valós idejű frissítés SSE-vel (30 másodpercenként)

### P2 — UI fejlesztés
- [ ] Frontend: Drag-and-drop gép elhelyezés (layout szerkesztő mód)
- [ ] Frontend: Zoom és pan a gyártósor térképen
- [ ] Frontend: Gép ikon testreszabás (típus alapján eltérő SVG)
- [ ] Frontend: Szállítószalag útvonal szerkesztő
- [ ] Frontend: Mini-dashboard popup a kiválasztott géphez (OEE, utolsó karbantartás, hőmérséklet)
- [ ] Frontend: Teljes képernyős nézet

### P3 — Tesztek
- [ ] Backend: Unit teszt — layout CRUD
- [ ] Backend: Unit teszt — gép állapot aggregáció
