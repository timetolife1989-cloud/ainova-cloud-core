# MODUL FEJLESZTÉSI FELADATOK

> Utolsó frissítés: 2026.03.12 — ŐSZINTE státuszok, nem hazugság

## Státusz összefoglaló

| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| workforce | ✅ Működik | CRUD, chartok, szűrők, CSV export — DECIMAL/dátum bug javítva |
| tracking | ✅ Működik | CRUD + history, szűrők, státusz kezelés |
| fleet | ✅ Működik | Járműnyilvántartás + útnapló |
| inventory | ✅ Működik | Készlet + mozgások, alacsony készlet riasztás |
| oee | ✅ Működik | A/P/Q/OEE kalkuláció, gépek, rekordok |
| shift-management | ✅ Működik | Műszakdefiníciók + beosztás, ütközés detektálás |
| delivery | ✅ Működik | Szállítmány CRUD, szűrők, összesítő kártyák |
| performance | ✅ Működik | Teljesítmény CRUD, KPI kártyák (⚠️ célérték UI hiányzik) |
| scheduling | ✅ Működik | Kapacitástervezés (⚠️ allokáció UI hiányzik) |
| quality | ✅ Működik | Minőségellenőrzés CRUD (⚠️ 8D riport UI hiányzik) |
| maintenance | ✅ Működik | Karbantartás ütemezés (⚠️ "kész" gomb / napló UI hiányzik) |
| reports | ⚠️ Váz | Riport definíciókat ment, de NEM tud riportot futtatni |
| file-import | ⚠️ Részleges | Saját API endpoint nincs |
| plc-connector | ⚠️ Részleges | Eszköz nyilvántartás van, S7/Modbus/MQTT driver NINCS |
| digital-twin | ⚠️ Részleges | Hardcoded demo adat, API NINCS |

---

## Kritikus javítások (2026.03.12)

### PostgreSQL kompatibilitás — JAVÍTVA
- ✅ `DECIMAL(10,2)` oszlopok string-ként jöttek vissza → `pg.types.setTypeParser(1700)` hozzáadva
- ✅ `DATE` oszlopok Date objektumként jöttek vissza → `pg.types.setTypeParser(1082)` hozzáadva
- ✅ API válaszokban `Number()` konverzió hozzáadva biztonsági rétegként
- ✅ `OUTPUT INSERTED` → `RETURNING` konverzió
- ✅ `OFFSET ROWS FETCH NEXT` → `LIMIT OFFSET` konverzió
- ✅ `SYSDATETIME()` → `NOW()` konverzió
- ✅ `ISNULL()` → `COALESCE()` konverzió
- ✅ `GETDATE()` → `NOW()` konverzió
- ✅ Boolean oszlopok (is_active stb.) `= 1` → `= true`

## Hiányzó al-funkciók működő moduloknál

### reports — SKELETON
- ⬜ Nincs riport motor — csak definíciókat CRUD-ol
- ⬜ "Megtekintés" és "Exportálás" gombok nem csinálnak semmit
- ⬜ Komplett újragondolás kell (chart.js/recharts alapú riport engine)

### quality — 8D hiányzik
- ⬜ `quality_8d_reports` tábla létezik, API/UI NINCS

### maintenance — "Kész" jelölés hiányzik
- ⬜ `maintenance_log` tábla létezik, de nincs API/UI a teljesítés rögzítésére

### performance — Célértékek hiányzik
- ⬜ `performance_targets` tábla létezik, nincs célérték beállító UI

### scheduling — Allokáció hiányzik
- ⬜ `scheduling_allocations` tábla létezik, nincs allokáció kezelő UI
