# MODUL FEJLESZTÉSI FELADATOK

> Utolsó frissítés: 2026.03.13 — ŐSZINTE státuszok, nem hazugság

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
| performance | ✅ Működik | Teljesítmény CRUD, KPI kártyák, célérték beállító UI (CRUD API + tab + modal) |
| scheduling | ✅ Működik | Kapacitástervezés (⚠️ allokáció UI hiányzik) |
| quality | ✅ Működik | Minőségellenőrzés CRUD + 8D riport wizard (D1-D8, viewer modal, i18n) |
| maintenance | ✅ Működik | Karbantartás ütemezés + "kész" jelölés + napló UI (complete API, log API, tab) |
| reports | ✅ Működik | Riport motor implementálva (query API, viewer, editor, delete — recharts alapú) |
| file-import | ⚠️ Részleges | Saját API endpoint nincs |
| plc-connector | ⚠️ Előkészítve | Eszköz nyilvántartás + 4 driver interfész kész (S7/Modbus TCP/Modbus RTU/MQTT/OPC-UA stub), 002 migráció (alerts, driver_config, poll_status — hardver aktiváláshoz npm install szükséges) |
| digital-twin | ✅ Működik | Valós API endpoint (CRUD, seed 7 gép, layout DB) |
| sap-import | ⚠️ Előkészítve | Enterprise — teljes séma (mod_sap_* 5 tábla, 50+ objektum katalógus seed), 4 API route, 4 fül admin UI; RFC/OData aktiváláshoz node-rfc + SAP NW RFC SDK szükséges |

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

### reports — KÉSZ ✅
- ✅ Riport motor implementálva (query API, viewer, editor, delete — commit 92f6da0)
- ✅ Recharts alapú vizualizáció

### quality — 8D KÉSZ ✅
- ✅ `quality_8d_reports` tábla + API + wizard UI D1-D8 (commit 5433b6d)

### maintenance — "Kész" jelölés KÉSZ ✅
- ✅ `maintenance_log` tábla + complete API + napló tab UI (commit 10cfac1)

### performance — Célértékek KÉSZ ✅
- ✅ `performance_targets` tábla + célérték beállító API + modal UI (commit e13b520)

### scheduling — Allokáció hiányzik
- ⬜ `scheduling_allocations` tábla létezik, nincs allokáció kezelő UI
