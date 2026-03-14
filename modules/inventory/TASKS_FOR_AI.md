# TASKS_FOR_AI.md — Inventory modul

> **Modul:** inventory
> **Állapot:** ✅ Production Ready
> **Csomag:** Professional

## Befejezett funkciók
- [x] Backend: CRUD API + kategória/alacsony készlet szűrés
- [x] Backend: Zod validáció (SKU, név, mennyiségek)
- [x] Frontend: Készletszint kijelzés
- [x] DB: inventory_items + inventory_movements táblák
- [x] Seeder: 12 cikk + 30 napos mozgás adat

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Kategória nevek lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Mozgás (movement) CRUD API endpoint (`/api/modules/inventory/movements`)
- [ ] Backend: Készlet szint auto-update (mozgás rögzítésnél current_qty módosítás)
- [ ] Backend: Alacsony készlet riasztás endpoint
- [ ] Backend: Excel export endpoint
- [ ] Frontend: Mozgás napló lista (be/ki, referencia, dátum)
- [ ] Frontend: Mozgás rögzítő form (cikk kiválasztás, mennyiség, irány)
- [ ] Frontend: Készlet trend chart (cikkenként)
- [ ] Frontend: Min/Max jelzés (szín kód: piros < min, sárga < 150%, zöld > 150%)
- [ ] Logic: Automatikus rendelési javaslat (current_qty < min_qty)

### P3 — Tesztek
- [ ] Backend: Unit teszt — készlet szint kalkuláció
- [ ] Backend: Unit teszt — mozgás validáció (negatív készlet tiltás)
