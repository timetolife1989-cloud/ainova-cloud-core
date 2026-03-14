# TASKS_FOR_AI.md — Maintenance modul

> **Modul:** maintenance
> **Állapot:** ✅ Production Ready
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Backend: CRUD API + esedékesség kalkuláció
- [x] Backend: Túlhaladott elemek kiemelése
- [x] Frontend: Karbantartási ütemterv megjelenítés
- [x] DB: maintenance_assets + maintenance_schedules + maintenance_log táblák
- [x] Seeder: 7 eszköz + 9 ütemezés + napló bejegyzések
- [x] Backend: Complete API ("kész" jelölés)
- [x] Backend: Log API (karbantartási napló)
- [x] Frontend: Napló tab UI

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Eszköz típus nevek lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Karbantartási napló CRUD endpoint (`/api/modules/maintenance/log`)
- [ ] Backend: MTBF/MTTR kalkuláció endpoint (Mean Time Between Failures / Mean Time To Repair)
- [ ] Backend: Esedékesség riasztás endpoint (SSE notifications integráció)
- [ ] Backend: Excel export endpoint
- [ ] Frontend: Karbantartási napló lista + rögzítő form
- [ ] Frontend: MTBF/MTTR gauge megjelenítés
- [ ] Frontend: Eszköz kártya nézet (állapot + következő karbantartás)
- [ ] Frontend: Naptár nézet (esedékes karbantartások)
- [ ] Logic: Automatikus next_due_date frissítés napló bejegyzés után
- [ ] Logic: Esedékesség email értesítés (7 nap / 3 nap / 1 nap előtte)

### P3 — Tesztek
- [ ] Backend: Unit teszt — MTBF számítás
- [ ] Backend: Unit teszt — esedékesség kalkuláció
