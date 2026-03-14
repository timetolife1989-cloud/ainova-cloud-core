# TASKS_FOR_AI.md — OEE modul

> **Modul:** oee
> **Állapot:** ✅ Production Ready
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Backend: CRUD API + OEE számítás (Availability × Performance × Quality)
- [x] Backend: Gép és dátum szűrés
- [x] Frontend: Gauge vizualizáció (zöld ≥85%, sárga ≥60%, piros <60%)
- [x] Frontend: Összesítő statisztika (avg OEE/A/P/Q)
- [x] Frontend: Modal rögzítő form
- [x] Frontend: Gép választó dropdown
- [x] DB: oee_machines + oee_records táblák
- [x] Seeder: 8 gép + 30 napos OEE adat valós matematikával

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Dashboard label-ek további lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Gép összesítő endpoint (gépenként átlag OEE trend)
- [ ] Backend: Műszak összesítő endpoint
- [ ] Backend: Excel export endpoint
- [ ] Frontend: OEE trend chart (Recharts LineChart, 30 napos)
- [ ] Frontend: Gépenkénti összehasonlító bar chart
- [ ] Frontend: Veszteség felbontás (Six Big Losses vizualizáció)
- [ ] Frontend: Pareto chart a leggyakoribb leállásokhoz
- [ ] Logic: OEE célérték konfiguráció (admin settings)
- [ ] Logic: Automatikus riasztás ha OEE < célérték (notifications integráció)

### P3 — Tesztek
- [ ] Backend: Unit teszt — OEE számítás (A × P × Q / 10000)
- [ ] Backend: Unit teszt — nulla osztás kezelés
