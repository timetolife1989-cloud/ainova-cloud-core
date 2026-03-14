# MODUL FEJLESZTÉSI FELADATOK

> Utolsó frissítés: 2026.03.15 — Phase 0-7 KÉSZ, összes modul implementálva

## Státusz összefoglaló

### STARTER Csomag (€99/hó, max 5 user)
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| inventory | ✅ Működik | Készlet + mozgások, alacsony készlet riasztás |
| invoicing | ✅ Működik | Magyar NAV-kompatibilis számlázás, 5 ÁFA kulcs, PDF |
| reports | ✅ Működik | Riport motor, query API, viewer, editor |
| file-import | ⚠️ Részleges | Saját API endpoint nincs — közös admin API |

### BASIC Csomag (€299/hó, max 15 user)
Starter összes modulja, plusz:
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| workforce | ✅ Működik | CRUD, chartok, szűrők, CSV export |
| tracking | ✅ Működik | CRUD + history, szűrők, státusz kezelés |
| fleet | ✅ Működik | Járműnyilvántartás + útnapló |
| purchasing | ✅ Működik | Beszállítók CRUD, rendelések, beérkezés → inventory |
| pos | ✅ Működik | POS felület, eladás, fizetési mód, napi zárás |

### BASIC Add-on Modulok
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| recipes | ✅ Működik | Receptúra kezelés + gyártás → inventory csökkentés |
| appointments | ✅ Működik | Időpontfoglalás, naptár, kapacitás kezelés |
| projects | ✅ Működik | Projektek, feladatok, Kanban, költségvetés |
| e-commerce | ✅ Működik | WooCommerce/Shopify szinkronizáció |

### PROFESSIONAL Csomag (€599/hó, max 50 user)
Basic összes modulja, plusz:
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| performance | ✅ Működik | Teljesítmény CRUD, KPI, célérték beállító |
| scheduling | ✅ Működik | Kapacitástervezés (allokáció UI is kész) |
| delivery | ✅ Működik | Szállítmány CRUD, szűrők, összesítő kártyák |
| crm | ✅ Működik | Ügyfélkezelés, pipeline, interakciók, emlékeztetők |
| worksheets | ✅ Működik | Munkalapok, munkaóra, anyag, aláírás, PDF, → számla |

### PROFESSIONAL Add-on Modulok
| Modul | Állapot | Ár/hó | Megjegyzés |
|-------|---------|-------|------------|
| sap-import | ⚠️ Stub | €99 | RFC/OData konnektorok stub — éles SAP nincs |
| api-gateway | ✅ Működik | €99 | Külső API kulcs kezelés, rate limiting, request napló |

### ENTERPRISE Csomag (€1199/hó, korlátlan user)
Enterprise összes alsóbb tier modulja, plusz:
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| oee | ✅ Működik | A/P/Q/OEE kalkuláció, gépek, rekordok |
| plc-connector | ⚠️ Előkészítve | Eszköz nyilvántartás + 4 driver interfész, hardver szükséges |
| shift-management | ✅ Működik | Műszakdefiníciók + beosztás, ütközés detektálás |
| quality | ✅ Működik | Minőségellenőrzés CRUD + 8D riport wizard |
| maintenance | ✅ Működik | Karbantartás ütemezés + "kész" jelölés + napló UI |
| digital-twin | ✅ Működik | 2D SVG gyártósor, CRUD API, 7 gép seed, layout DB |

### ENTERPRISE Add-on Modul
| Modul | Állapot | Ár/hó | Megjegyzés |
|-------|---------|-------|------------|
| multi-site | 🔴 Tervezett | €199 | Több telephely kezelés |

### Speciális Modulok
| Modul | Állapot | Megjegyzés |
|-------|---------|------------|
| lac-napi-perces | ✅ Production Ready | Komplex belső LAC referencia modul. Disabled demo-ban. |<br>

---

## Hátralévő fejlesztési feladatok (összes modulra)

### Közös hátralékok
- [ ] i18n: Modul UI-k hardcoded stringjeinek i18n kulcsokra cserélése (részleges — sok modul már kész)
- [ ] Tesztek: Unit tesztek minden modulhoz (jelenleg minimális coverage)
- [ ] E2E tesztek: Playwright integráció

### Modul-specifikus hátralékok
- [ ] `file-import`: Saját API endpoint (jelenleg közös admin API-t használ)
- [ ] `plc-connector`: Hardver driver aktiválás (node-snap7, modbus-serial, mqtt, node-opcua)
- [ ] `sap-import`: SAP RFC SDK telepítés + élő kapcsolat teszt
- [ ] `scheduling`: Allokáció drag & drop UI (tábla létezik, UI részleges)
- [ ] `digital-twin`: OEE integráció élő gép állapothoz
- [ ] Workflow trigger bővítés (jelenleg: alapvető szabálymotor)
