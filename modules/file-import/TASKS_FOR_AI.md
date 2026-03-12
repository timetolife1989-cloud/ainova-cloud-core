# TASKS_FOR_AI.md — File Import modul

> **Modul:** file-import
> **Állapot:** ⚠️ Részleges (UI only)
> **Csomag:** Basic

## Befejezett funkciók
- [x] Frontend: Drag-n-drop fájl feltöltés (FormData)
- [x] Frontend: Automatikus formátum felismerés
- [x] Frontend: Oszlop mapping UI
- [x] Frontend: Import progress tracking
- [x] Frontend: Config kiválasztó modal

## Még hátralévő feladatok

### P1 — Backend integráció
- [ ] Backend: Saját API endpoint létrehozása (`/api/modules/file-import/upload`) — jelenleg a közös admin API-t használja
- [ ] Backend: Import konfiguráció CRUD (modul-specifikus endpoint)
- [ ] Backend: Validációs szabály definíció (oszlop típus, kötelezőség, regex)
- [ ] DB: Migráció fájl — `mod_file_import_history` tábla (import napló)

### P2 — Funkció bővítés
- [ ] Frontend: Import előnézet (első 10 sor megjelenítés mapping után)
- [ ] Frontend: Hibalista megjelenítés (melyik sor miért hibás)
- [ ] Frontend: Korábbi importok listája (history)
- [ ] Logic: Típus konverzió pipeline (string→szám, dátum formátum felismerés)
- [ ] Logic: Duplikátum felismerés (egyedi kulcs alapján)

### P3 — Tesztek
- [ ] Backend: Unit teszt — CSV parsing
- [ ] Backend: Unit teszt — Excel parsing (ExcelJS)
- [ ] Backend: Unit teszt — oszlop mapping validáció
