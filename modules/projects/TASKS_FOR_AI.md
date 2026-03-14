# Projects modul — Feladatlista

> **Tier:** Add-on | **Ár:** €49/hó | **Min tier:** Basic | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, add-on modul
- [x] 001_projects.sql — 3 tábla (projects, tasks, costs)
- [x] API: Project CRUD, Task CRUD (subtasks), Cost tracking
- [x] DashboardPage.tsx — Kanban nézet + költségvetés riport
- [x] Feladat hierarchia (parent_id subtask support)
- [x] Budget vs. actual cost tracking
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió

### P2 — Funkciók
- [ ] Gantt chart nézet (timeline vizualizáció)
- [ ] Feladat hozzárendelés felhasználókhoz
- [ ] Projekt sablon mentés és alkalmazás
- [ ] Időnyilvántartás (time tracking per task)

### P3 — Tesztek
- [ ] Unit tesztek (API, budget calculation)
- [ ] Integration tesztek (cost aggregation)
