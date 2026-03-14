# E-commerce modul — Feladatlista

> **Tier:** Add-on | **Ár:** €49/hó | **Min tier:** Basic | **Státusz:** ✅ Production Ready
> **Depends on:** inventory

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, add-on modul
- [x] 001_e_commerce.sql — 3 tábla (connections, product_map, orders)
- [x] API: Connection CRUD, Product mapping, Order import, Stock sync
- [x] DashboardPage.tsx — Kapcsolatok + szinkron napló
- [x] WooCommerce adapter (REST API v3)
- [x] Shopify adapter (Admin API)
- [x] Bi-directional stock sync (polling 15min + webhook)
- [x] AES-256-GCM titkosítás (API kulcsok)
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió

### P2 — Funkciók
- [ ] Ár szinkronizáció (nem csak készlet)
- [ ] Több webshop egyidejű kezelés
- [ ] Rendelés státusz visszaírás (ACI → webshop)
- [ ] Webhook endpoint (valós idejű rendelés import)

### P3 — Tesztek
- [ ] Unit tesztek (adapter, sync logic)
- [ ] Integration tesztek (inventory stock update, order creation)

### P4 — Biztonság
- [ ] API credential rotation támogatás
- [ ] Rate limiting a sync endpointokon
