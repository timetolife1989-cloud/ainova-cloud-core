# Worksheets modul — Feladatlista

> **Tier:** Professional | **Ár:** Alap csomag része | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, Professional tier, depends: inventory
- [x] 001_worksheets.sql — 3 tábla (orders, labor, materials)
- [x] API: Order CRUD, Labor tracking, Material usage, Invoice generation
- [x] DashboardPage.tsx — Munkalap lista + form + detail nézet
- [x] Munkaóra nyilvántartás (worker + hours × rate)
- [x] Anyagfelhasználás → inventory `out` mozgás
- [x] Ügyfél aláírás (canvas base64)
- [x] PDF generálás
- [x] Invoicing integráció: munkalap → számla automatikus generálás
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió
- [ ] Mobile optimalizáció (aláírás, form)

### P2 — Funkciók
- [ ] Munkalap sablonok (gyakori javítások elődefiniálása)
- [ ] Fotó csatolás (before/after)
- [ ] SMS/email értesítés ügyfélnek (állapot változás)

### P3 — Tesztek
- [ ] Unit tesztek (API, cost calculation)
- [ ] Integration tesztek (inventory deduction, invoice generation)
