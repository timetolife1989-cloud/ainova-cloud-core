# TASKS_FOR_AI.md — PLC Connector modul

> **Modul:** plc-connector
> **Állapot:** ⚠️ Részleges (Infrastruktúra kész, driver nincs)
> **Csomag:** Enterprise

## Befejezett funkciók
- [x] Backend: Eszköz regisztráció API (név, protokoll, IP, port)
- [x] Frontend: Eszköz kártya grid + állapot (online/offline)
- [x] Frontend: Protokoll választó (S7/Modbus/MQTT)
- [x] Frontend: Eszköz hozzáadó modal
- [x] DB: mod_plc_devices + mod_plc_registers + mod_plc_data (idősor) táblák

## Még hátralévő feladatok

### P0 — Kritikus hiányzó funkciók (a modul lényege!)
- [ ] Backend: Siemens S7 driver implementáció (`nodes7` vagy `snap7` npm csomag) — a modul NEM kommunikál PLC-vel jelenleg!
- [ ] Backend: Modbus TCP driver implementáció (`modbus-serial` npm csomag)
- [ ] Backend: MQTT kliens implementáció (`mqtt` npm csomag)
- [ ] Backend: Polling engine — periodikus register olvasás a konfigurált intervallumonként
- [ ] Backend: Adat írás a `mod_plc_data` táblába (idősor rekordok)
- [ ] Backend: Kapcsolat állapot frissítés (`last_seen_at` update)

### P1 — Register kezelés
- [ ] Backend: Register CRUD API endpoint (`/api/modules/plc-connector/registers`)
- [ ] Frontend: Register konfiguráció UI (cím, adattípus, mértékegység, skálázás, poll intervallum)
- [ ] Frontend: Aktuális register értékek live megjelenítése
- [ ] Logic: Adat típus konverzió (INT16, INT32, FLOAT32, BOOL)
- [ ] Logic: Skálázás alkalmazás (raw_value × scale_factor + offset)

### P2 — Vizualizáció & Monitoring
- [ ] Frontend: Valós idejű adat chart (Recharts + SSE frissítés)
- [ ] Frontend: Eszköz részletek oldal (összes register + utolsó értékek)
- [ ] Frontend: Riasztás konfiguráció (küszöbérték megadás registerenként)
- [ ] Logic: Küszöbérték figyelés + notification trigger
- [ ] Logic: Adat aggregáció (percenkénti/órás átlag a történeti adatból)

### P3 — Tesztek
- [ ] Backend: Unit teszt — S7 adat parsing (big-endian byte order)
- [ ] Backend: Unit teszt — Modbus register olvasás + skálázás
- [ ] Backend: Unit teszt — MQTT topic subscribe + message parsing
- [ ] Backend: Integration teszt — mock PLC szerver ellen
