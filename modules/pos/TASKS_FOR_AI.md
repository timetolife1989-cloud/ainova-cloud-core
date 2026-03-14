# POS modul — Feladatlista

> **Tier:** Basic | **Ár:** Alap csomag része | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, Basic tier, depends: inventory + invoicing
- [x] 001_pos.sql — 3 tábla (transactions, transaction_items, daily_closings)
- [x] API: sell, refund, close-day, product-search
- [x] DashboardPage.tsx — POS felület touchscreen-re optimalizálva
- [x] Inventory integráció: eladás → `out` mozgás
- [x] Invoicing integráció: számla generálás (opcionális)
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió
- [ ] Touchscreen UX továbbfejlesztés (nagyobb gombok, scroll)

### P2 — Funkciók
- [ ] Vonalkód/QR olvasó integráció (kamera API)
- [ ] Kedvezmény rendszer (százalék/fix összeg)
- [ ] Nyugta nyomtatás (thermal printer support)
- [ ] Többpénzneműség (multi-currency)

### P3 — Tesztek
- [ ] Unit tesztek (sell, refund, close-day flow)
- [ ] Integration tesztek (inventory + invoicing update)
