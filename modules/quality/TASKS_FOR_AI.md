# TASKS_FOR_AI.md — Quality modul

> **Modul:** quality
> **Állapot:** ✅ Production Ready
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Backend: CRUD API + selejt kód kezelés
- [x] Backend: Dátum/státusz szűrés
- [x] Frontend: Vizsgálati rekord megjelenítés
- [x] DB: quality_inspections + quality_8d_reports táblák
- [x] Seeder: 30 napos vizsgálati adat 5 termékkel

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Státusz nevek lokalizálása (`passed`, `failed`, `conditional`, `pending`)
- [ ] Frontend: Hibakód nevek lokalizálása
- [ ] Frontend: Form label-ek i18n kulcsokra cserélése

### P2 — Funkció bővítés
- [x] Backend: 8D riport CRUD endpoint (`/api/modules/quality/8d`)
- [ ] Backend: Hibakód katalógus CRUD endpoint
- [ ] Backend: Selejt arány trend endpoint (időszak × termék aggregáció)
- [ ] Backend: Excel export endpoint
- [x] Frontend: 8D riport wizard (D1→D8 lépések formlap)
- [ ] Frontend: Hibakód katalógus kezelő UI
- [ ] Frontend: Selejt arány trend chart (Recharts LineChart)
- [ ] Frontend: Pareto chart (leggyakoribb hibakódok)
- [ ] Frontend: Batch szintű minőségi összesítő
- [ ] Logic: Automatikus 8D riport indítás ha selejt arány > küszöb

### P3 — Tesztek
- [ ] Backend: Unit teszt — selejt arány kalkuláció
- [ ] Backend: Unit teszt — 8D riport validáció
