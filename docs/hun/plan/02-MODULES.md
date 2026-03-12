# MODUL FEJLESZTÉSI FELADATOK

## Státusz összefoglaló

| Modul | Állapot | Fő tennivaló |
|-------|---------|---------------|
| workforce | ✅ Kész | Nyelvi gomboknál i18n |
| tracking | ✅ Kész | — |
| fleet | ✅ Kész | — |
| file-import | ⚠️ Részleges | Saját API endpoint nincs |
| reports | ✅ Kész | — |
| performance | ✅ Kész | — |
| scheduling | ✅ Kész | — |
| delivery | ✅ Kész | — |
| inventory | ✅ Kész | — |
| oee | ✅ Kész | — |
| shift-management | ✅ Kész | — |
| quality | ✅ Kész | — |
| maintenance | ✅ Kész | — |
| plc-connector | ⚠️ Részleges | S7/Modbus/MQTT driver NINCS |
| digital-twin | ⚠️ Részleges | API endpoint NINCS, hardcoded demo |

---

## Modul-specifikus tennivalók

### workforce
- ⬜ Form label-ek és gomb szövegek → useTranslation()
- ⬜ Validációs hibaüzenetek → i18n
- ⬜ Tesztelés Vercel-en Supabase-szel

### digital-twin
- ⬜ `GET/POST /api/modules/digital-twin/data` endpoint implementálás
- ⬜ DB integráció: `mod_dt_layouts` + `mod_dt_machines` táblákból olvasás
- ⬜ Gép állapot frissítés API
- ⬜ SSE valós idejű frissítés

### plc-connector
- ⬜ S7 driver (Siemens S7-1200/1500) — `nodes7` npm csomag
- ⬜ Modbus TCP driver — `jsmodbus` npm csomag
- ⬜ MQTT subscriber — `mqtt` npm csomag
- ⬜ Polling engine (konfigurálaható intervallum)
- ⬜ Idősor adat gyűjtés és tárolás

### file-import
- ⬜ Saját API végpont (`/api/modules/file-import/...`)
- ⬜ Import template kezelés
