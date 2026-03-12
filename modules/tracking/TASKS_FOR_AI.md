# TASKS_FOR_AI.md — Tracking modul

> **Modul:** tracking
> **Állapot:** ✅ Production Ready
> **Csomag:** Basic

## Befejezett funkciók
- [x] Backend: CRUD API (`/api/modules/tracking/data`)
- [x] Backend: Státusz/prioritás/felelős szűrés
- [x] Backend: Egyedi rendezés (Nyitott→Folyamatban→Kész→Lezárt)
- [x] Frontend: Modal form létrehozás/szerkesztés
- [x] Frontend: Státusz badge-ek színkóddal
- [x] Frontend: Szűrőpanel kereséssel
- [x] DB: tracking_items + tracking_history táblák
- [x] Seeder: 12 demo feladat + státusz történet

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Hardcoded magyar státusz nevek lokalizálása (`Nyitott`, `Folyamatban`, `Kész`, `Lezárt`)
- [ ] Frontend: Prioritás nevek lokalizálása (`alacsony`, `normal`, `magas`, `kritikus`)
- [ ] Frontend: Form label-ek és hibaüzenetek i18n kulcsokra cserélése

### P2 — Funkció bővítés
- [ ] Backend: Státusz timeline endpoint (tracking_history lekérdezés item_id alapján)
- [ ] Backend: Excel export endpoint
- [ ] Frontend: Timeline/history vizualizáció az egyes feladatoknál
- [ ] Frontend: Gantt chart nézet határidőkkel
- [ ] Logic: Automatikus emaill értesítés státusz változásnál (workflow integráció)
- [ ] Logic: Határidő figyelő — lejárt feladatok kiemelése

### P3 — Tesztek
- [ ] Backend: Unit teszt — szűrés és rendezés logika
- [ ] Backend: Unit teszt — státusz átmenet validáció
