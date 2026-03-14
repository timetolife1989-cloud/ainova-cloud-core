# CRM modul — Feladatlista

> **Tier:** Professional | **Ár:** Alap csomag része | **Státusz:** ✅ Production Ready

## Kész funkciók
- [x] manifest.ts — jogosultságok, admin settings, Professional tier
- [x] 001_crm.sql — 4 tábla (customers, interactions, opportunities, reminders)
- [x] API: Customer CRUD, Interaction CRUD, Opportunity pipeline, Reminders
- [x] DashboardPage.tsx — Ügyfél lista + detail + pipeline nézet
- [x] Pipeline: Lead → Proposal → Negotiation → Won/Lost
- [x] i18n: DashboardPage `useTranslation()` konvertálva

## Hátralévő feladatok

### P1 — I18n/UX
- [ ] Összes statikus szöveg i18n konverzió (form labelek, pipeline stages)
- [ ] Mobile responsive ellenőrzés

### P2 — Funkciók
- [ ] Email integráció (automatikus interakció naplózás)
- [ ] Ügyféltag-ek és szegmentáció
- [ ] Pipeline riportok (konverziós ráta, átlagos deal méret)
- [ ] Invoicing integráció (ügyfél FK)

### P3 — Tesztek
- [ ] Unit tesztek (API route-ok, pipeline stage transitions)
- [ ] Integration tesztek (invoicing, worksheets FK)
