# TASKS_FOR_AI.md — Performance modul

> **Modul:** performance
> **Állapot:** ✅ Production Ready
> **Csomag:** Professional

## Befejezett funkciók
- [x] Backend: CRUD API + hatékonyság kalkuláció
- [x] Backend: Szűrés (dátum, dolgozó, csapat)
- [x] Frontend: KPI dashboard + rögzítő form
- [x] DB: performance_entries + performance_targets táblák
- [x] Seeder: 30 napos demo adat 20+ dolgozóval

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Dashboard label-ek lokalizálása
- [ ] Frontend: Hibaüzenetek i18n kulcsokra cserélése

### P2 — Funkció bővítés
- [ ] Backend: Csapat összesítő endpoint (csapat szintű avg hatékonyság)
- [ ] Backend: Target vs. tényleges comparison endpoint
- [ ] Backend: Excel export endpoint
- [ ] Frontend: Csapat összesítő nézet
- [ ] Frontend: Hatékonyság trend chart (Recharts LineChart, 30 napos)
- [ ] Frontend: Target vs. tényleges bar chart
- [ ] Frontend: Top/Bottom dolgozó rangsor
- [ ] Logic: Norma idő konfigurálhatóság (admin settings integráció)

### P3 — Tesztek
- [ ] Backend: Unit teszt — hatékonyság számítás (norm_time / actual_time × 100)
- [ ] Backend: Unit teszt — célérték validáció
