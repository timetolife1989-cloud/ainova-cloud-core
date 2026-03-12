# TASKS_FOR_AI.md — Workforce modul

> **Modul:** workforce
> **Állapot:** ✅ Működik (PG bugok javítva 2026.03.12)
> **Csomag:** Basic

## Befejezett funkciók
- [x] Backend: CRUD API (`/api/modules/workforce/data`)
- [x] Backend: Szűrés (dátum tartomány, műszak, terület)
- [x] Backend: Lapozás (OFFSET ROWS FETCH → LIMIT OFFSET konverzió)
- [x] Frontend: Rögzítő form (dátum/műszak/terület/létszám)
- [x] Frontend: Táblázat megjelenítés szűrőkkel
- [x] Frontend: Chart vizualizáció (WorkforceCharts — napi/heti/havi/éves)
- [x] Frontend: CSV export (BOM-os UTF-8, Excel kompatibilis)
- [x] Frontend: Összesítő kártyák (mai tervezett/tényleges/hiányzó/jelenlét %)
- [x] DB: workforce_daily tábla migrációval
- [x] Seeder: 30 napos demo adat (420 sor)
- [x] PostgreSQL fix: DECIMAL(10,2) oszlopok számként (nem string)
- [x] PostgreSQL fix: DATE oszlopok YYYY-MM-DD string (nem Date objektum)
- [x] PostgreSQL fix: OUTPUT INSERTED → RETURNING konverzió

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Hardcoded magyar stringek kicserélése `t()` hívásokra a `DashboardPage.tsx`-ben
- [ ] Frontend: Form label-ek lokalizálása (pl. "Műszak", "Terület", "Tervezett létszám")
- [ ] Frontend: Hibaüzenetek lokalizálása

### P2 — Funkció bővítés
- [ ] Backend: Excel export endpoint (`/api/modules/workforce/export`)
- [ ] Backend: Aggregáció endpoint (heti/havi összesítő)
- [ ] Frontend: Heti összesítő nézet
- [ ] Frontend: Havi trend chart (Recharts AreaChart)
- [ ] Logic: Automatikus összesítő számítás (jelenlét arány %)

### P3 — Tesztek
- [ ] Backend: Unit teszt — API route handler (GET szűrés)
- [ ] Backend: Unit teszt — API route handler (POST validáció)
- [ ] Backend: Unit teszt — Lapozás és rendezés
