# TASKS_FOR_AI.md — Fleet modul

> **Modul:** fleet
> **Állapot:** ✅ Production Ready
> **Csomag:** Basic

## Befejezett funkciók
- [x] Backend: CRUD API (`/api/modules/fleet/data`)
- [x] Backend: Aktív jármű szűrés
- [x] Backend: Zod validáció (rendszám, jármű típus enum)
- [x] Frontend: Dashboard + form
- [x] DB: fleet_vehicles + fleet_trips + fleet_refuels táblák
- [x] Seeder: 6 jármű + 30 napos trip/tankolás adat

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Jármű típus nevek lokalizálása (`van`, `truck`, `car`, `forklift`)
- [ ] Frontend: Form label-ek i18n kulcsokra cserélése

### P2 — Funkció bővítés
- [ ] Backend: Trip (út) CRUD API endpoint (`/api/modules/fleet/trips`)
- [ ] Backend: Tankolás CRUD API endpoint (`/api/modules/fleet/refuels`)
- [ ] Backend: Aggregáció endpoint (havi km összesítő, fogyasztás számítás)
- [ ] Frontend: Trip lista és rögzítő form
- [ ] Frontend: Tankolás lista és rögzítő form
- [ ] Frontend: Fogyasztás chart (l/100km trend)
- [ ] Frontend: Km számláló vizualizáció járművenként
- [ ] Logic: Automatikus fogyasztás kalkuláció (tankolás/távolság)

### P3 — Tesztek
- [ ] Backend: Unit teszt — jármű CRUD validáció
- [ ] Backend: Unit teszt — fogyasztás számítás logika
