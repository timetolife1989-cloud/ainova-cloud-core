# Recipes modul — Feladatlista

> **Tier:** Add-on | **Ár:** €29/hó | **Min tier:** Starter | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, add-on modul
- [x] 001_recipes.sql — 3 tábla (recipes, ingredients, productions)
- [x] API: Recipe CRUD, Ingredient management, Production flow
- [x] DashboardPage.tsx — Receptúra szerkesztő + gyártás nézet
- [x] Gyártás → inventory csökkentés (ingredient `out` mozgások)
- [x] Költségszámítás (Σ ingredient costs)
- [x] HACCP megjegyzések (allergének, hőmérséklet, eltarthatóság)
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió

### P2 — Funkciók
- [ ] Receptúra másolás/verziókezelés
- [ ] Allergén kimutatás generálás (PDF)
- [ ] Batch tracking (LOT/sarzs számok)

### P3 — Tesztek
- [ ] Unit tesztek (cost calculation, production flow)
- [ ] Integration tesztek (inventory deduction)
