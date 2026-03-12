# TASKS_FOR_AI.md — LAC Napi Perces modul

> **Modul:** lac-napi-perces
> **Állapot:** ✅ Production Ready (legkomplexebb modul)
> **Csomag:** Professional

## Befejezett funkciók
- [x] Backend: KPI adat API (multi-source: sap_visszajelentes, norma_friss, targets_schedule)
- [x] Backend: Excel export endpoint
- [x] Backend: SAP import pipeline (upload → process → verify)
- [x] Backend: Valós idejű import progress tracking
- [x] Frontend: Multi-view dashboard (napi/heti/havi)
- [x] Frontend: 10+ komponens (chart-ok, táblázatok, tooltip, selector, dropzone)
- [x] DB: 5 migrációs fájl (sap_visszajelentes, norma_friss, sap_munkaterv, targets_schedule, nézet)
- [x] Admin: SAP import dropzone + status widget

## Még hátralévő feladatok

### P1 — i18n & Lokalizáció
- [ ] Frontend: Dashboard label-ek lokalizálása (magyar → i18n kulcsok)
- [ ] Frontend: Chart axis és tooltip szövegek lokalizálása
- [ ] Frontend: Import státusz üzenetek lokalizálása

### P2 — Funkció bővítés
- [ ] Backend: SAP IDoc automatikus fogadás endpoint (scheduled pull / webhook)
- [ ] Backend: Norma frissítés API (manuális norma szerkesztés)
- [ ] Backend: Target (célérték) CRUD API
- [ ] Frontend: Norma karbantartó UI (norma tétel szerkesztés)
- [ ] Frontend: Target beállító UI (heti/havi célértékek)
- [ ] Frontend: Eltérés elemzés (terv vs. tény × norma)
- [ ] Logic: Automatikus SAP import ütemezés (cron trigger)

### P3 — Tesztek
- [ ] Backend: Unit teszt — SAP IDoc parsing
- [ ] Backend: Unit teszt — KPI aggregáció logika
- [ ] Backend: Unit teszt — norma kalkuláció
