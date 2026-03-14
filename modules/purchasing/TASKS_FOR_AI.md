# Purchasing modul — Feladatlista

> **Tier:** Basic | **Ár:** Alap csomag része | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — 3 jogosultság, admin settings, Basic tier
- [x] 001_purchasing.sql — 3 tábla (suppliers, orders, order_items)
- [x] API: Supplier CRUD, Order CRUD, Order receive/approve
- [x] DashboardPage.tsx — 3 tab (Beszállítók, Rendelések, Beérkezés)
- [x] Inventory integráció: beérkezés → `in` mozgás
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió (form labelek, hibaüzenetek)
- [ ] Mobile responsive ellenőrzés

### P2 — Funkciók
- [ ] Auto-reorder: alacsony készlet → rendelés javaslat
- [ ] RFQ (Request for Quotation) workflow
- [ ] Beszállítói értékelés (rating rendszer)

### P3 — Tesztek
- [ ] Unit tesztek (API route-ok)
- [ ] Integration tesztek (inventory update flow)
