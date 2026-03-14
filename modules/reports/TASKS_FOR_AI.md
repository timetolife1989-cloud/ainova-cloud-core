# TASKS_FOR_AI.md — Reports modul

> **Modul:** reports
> **Állapot:** ✅ Production Ready
> **Csomag:** Basic

## Befejezett funkciók
- [x] Backend: CRUD API (mentett riportok)
- [x] Backend: Láthatóság szűrés (is_public OR created_by)
- [x] Frontend: Dinamikus chart renderelés
- [x] DB: reports_saved tábla JSON config-gal
- [x] Seeder: Demo riportok

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [x] Frontend: DashboardPage i18n konvertálva (hu/en/de)
- [ ] Frontend: Chart típus nevek lokalizálása (részleges)

### P2 — Funkció bővítés
- [ ] Backend: Riport adat lekérdezés endpoint (source_table + config alapján dinamikus query)
- [ ] Backend: Excel export endpoint (ExcelJS integráció)
- [ ] Backend: PDF export endpoint (jsPDF vagy hasonló)
- [ ] Frontend: Riport szerkesztő wizard (forrás tábla, oszlopok, szűrők, chart típus)
- [ ] Frontend: Riport megosztás (is_public toggle)
- [ ] Frontend: Ütemezett riport generálás konfiguráció
- [ ] Logic: Adat aggregáció logika (SUM, AVG, COUNT, GROUP BY)

### P3 — Tesztek
- [ ] Backend: Unit teszt — dinamikus query építés
- [ ] Backend: Unit teszt — export formátumok
