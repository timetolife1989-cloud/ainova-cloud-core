# TASKS_FOR_AI.md — Delivery modul

> **Modul:** delivery
> **Állapot:** ✅ Production Ready
> **Csomag:** Professional

## Befejezett funkciók
- [x] Backend: CRUD API + szűrés (dátum, vevő)
- [x] Backend: Zod validáció
- [x] Frontend: Szállítmány táblázat
- [x] DB: delivery_shipments tábla
- [x] Seeder: 30 napos demo szállítási adat

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Státusz nevek lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Vevő összesítő endpoint (vevőnkénti darabszám/érték aggregáció)
- [ ] Backend: Havi trend endpoint
- [ ] Backend: Excel export endpoint
- [ ] Frontend: Vevő breakdown chart (Recharts PieChart)
- [ ] Frontend: Havi trend chart (BarChart: szállított mennyiség/érték)
- [ ] Frontend: Szállítmány szerkesztő modal
- [ ] Logic: Automatikus státusz frissítés (dátum alapú: shipped→delivered)

### P3 — Tesztek
- [ ] Backend: Unit teszt — vevő aggregáció
- [ ] Backend: Unit teszt — szűrés és lapozás
