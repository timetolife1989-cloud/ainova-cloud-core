# Appointments modul — Feladatlista

> **Tier:** Add-on | **Ár:** €29/hó | **Min tier:** Starter | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, add-on modul
- [x] 001_appointments.sql — 2 tábla (slots, bookings)
- [x] API: Slot CRUD, Booking CRUD, Calendar view, Capacity check
- [x] DashboardPage.tsx — Heti/napi nézet naptár
- [x] Ütközés detektálás (double-booking prevention)
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió

### P2 — Funkciók
- [ ] Email/SMS emlékeztető (booking előtt 24h)
- [ ] Ismétlődő időpontok (recurring bookings)
- [ ] Ügyfél self-service foglalás (publikus link)

### P3 — Tesztek
- [ ] Unit tesztek (slot availability, conflict detection)
