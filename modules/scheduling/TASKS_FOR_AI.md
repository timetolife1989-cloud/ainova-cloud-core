# TASKS_FOR_AI.md — Scheduling modul

> **Modul:** scheduling
> **Állapot:** ✅ Production Ready
> **Csomag:** Professional

## Befejezett funkciók
- [x] Backend: CRUD API + heti kapacitás kezelés
- [x] Backend: Szűrés (hét, erőforrás típus)
- [x] Frontend: Kapacitás vizualizáció
- [x] DB: scheduling_capacity + scheduling_allocations táblák
- [x] Seeder: 5 hét demo kapacitás adat

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Erőforrás típus nevek lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Allokáció CRUD endpoint (`/api/modules/scheduling/allocations`)
- [ ] Backend: Kapacitás kihasználtság kalkuláció (allocated/planned %)
- [ ] Backend: Ütközés és túlterhelés detektálás
- [ ] Frontend: Heti naptár nézet a kapacitásokkal
- [ ] Frontend: Drag-and-drop allokáció (feladat húzás kapacitás slotra)
- [ ] Frontend: Kihasználtság hőtérkép (zöld→sárga→piros)
- [ ] Frontend: Allokáció lista egy capacity_id-hez

### P3 — Tesztek
- [ ] Backend: Unit teszt — kapacitás túlterhelés logika
- [ ] Backend: Unit teszt — heti dátum kezelés
