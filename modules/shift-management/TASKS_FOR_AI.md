# TASKS_FOR_AI.md — Shift Management modul

> **Modul:** shift-management
> **Állapot:** ✅ Production Ready
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Backend: CRUD API + ütközés detektálás (409 hiba dupla beosztásnál)
- [x] Backend: Dátum szűrés
- [x] Frontend: Beosztás form
- [x] DB: shift_definitions + shift_assignments táblák
- [x] Seeder: 3 műszak + 30 napos beosztás 30 dolgozóval

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Műszak nevek lokalizálása (Reggeli, Délutáni, Éjszakai)
- [ ] Frontend: Státusz nevek lokalizálása (`planned`, `confirmed`, `absent`)
- [ ] Frontend: Form label-ek és hibaüzenetek i18n kulcsokra cserélése

### P2 — Funkció bővítés
- [ ] Backend: Heti beosztás másolás endpoint (előző hét klónozása)
- [ ] Backend: Rotáció szabály motor (auto-beosztás rotáció pattern alapján)
- [ ] Backend: Hiányzás kezelés endpoint (helyettesítő javaslat)
- [ ] Frontend: Heti naptár nézet (grid: dolgozó × nap × műszak)
- [ ] Frontend: Drag-and-drop beosztás módosítás
- [ ] Frontend: Színkódolt ütközés jelzés
- [ ] Frontend: Havi összesítő (dolgozónkénti műszak darabszám)
- [ ] Logic: Rotáció pattern definíció (pl. R-D-É-szabad-R-D-É)
- [ ] Logic: Pihenőidő validáció (min. 11 óra váltások között)

### P3 — Tesztek
- [ ] Backend: Unit teszt — ütközés detektálás logika
- [ ] Backend: Unit teszt — rotáció pattern generálás
