# Ainova Cloud Intelligence

**Moduláris gyártásmenedzsment platform** — testreszabható, dobozos szoftver gyártási területekre.

## Gyors start

```bash
# Docker-rel
docker-compose up -d

# Vagy Node.js-sel
npm install
npm run dev
```

Böngészőben: `http://localhost:3000` → Setup Wizard végigvezet a konfiguráción.

## Követelmények

- **Docker** (ajánlott) vagy
- **Node.js 22+** és **MSSQL** (vagy PostgreSQL/SQLite — tervben)

## Csomagok

| Csomag | Modulok | Célcsoport |
|--------|---------|------------|
| **Basic** | Létszám, Felkövetés, Gépjármű, Fájl Import, Riportok | Kis cégek, egyszerű igények |
| **Professional** | + Teljesítmény, Kapacitás, Kiszállítás, Készlet | Közepes cégek, KPI igény |
| **Enterprise** | + OEE, PLC, Műszakbeosztás, Minőség, Karbantartás | Nagyvállalatok, automatizáció |

## Modulok

### Basic csomag
- **Workforce** — Napi létszám, jelenlét, hiányzások
- **Tracking** — Feladat/rendelés felkövetés, státuszok
- **Fleet** — Gépjármű nyilvántartás, futások, tankolás
- **File-import** — Excel/CSV import admin konfigurációval
- **Reports** — Riport generátor, diagramok, export

### Professional csomag
- **Performance** — Egyéni és csapat KPI, normaidő vs. valós
- **Scheduling** — Heti kapacitás tervezés, kihasználtság
- **Delivery** — Kiszállítási riport, vevő-bontás
- **Inventory** — Készletnyilvántartás, mozgás napló

### Enterprise csomag (tervben)
- **OEE** — Overall Equipment Effectiveness
- **PLC-Connector** — Logo PLC / Siemens S7 integráció
- **Shift-Management** — Műszakbeosztás tervezés
- **Quality** — Minőségellenőrzés, 8D riport
- **Maintenance** — Karbantartás ütemezés

## Admin Panel

Az admin panel (`/dashboard/admin`) a következő funkciókat biztosítja:

- **Felhasználók** — Fiókok kezelése, jelszó visszaállítás
- **Szerepkörök & Jogok** — RBAC, jogosultság mátrix
- **Modulok** — Be/kikapcsolás, függőség-ellenőrzés
- **Branding** — Cégnév, logó, színek
- **Mértékegységek** — Egyedi unit-ok definiálása
- **Nyelv** — HU/EN/DE, dátum formátumok
- **Import konfigurációk** — Oszlop mapping, szűrők
- **Diagnosztika** — DB kapcsolat, uptime
- **Audit napló** — Bejelentkezések, műveletek
- **Licenc** — Csomag szint, lejárat

## Fejlesztői dokumentáció

Új modul készítéséhez lásd: `docs/module-development.md`

### Modul struktúra

```
modules/<modul-id>/
  manifest.ts           ← Modul definíció
  migrations/           ← DB migrációk
  api/                  ← API route-ok
  components/           ← React komponensek
  types/                ← TypeScript típusok
```

## Technológiák

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5.9**
- **Tailwind CSS 4**
- **MSSQL** (PostgreSQL/SQLite tervben)
- **Zod** validáció
- **TanStack Query** (opcionális)

## Licenszelés

A szoftver licenc alapú. Licenc kulcs nélkül Basic funkcionalitás érhető el.

Licenc generálás (fejlesztőknek):
```bash
npx tsx scripts/generate-license.ts --tier professional --customer "Cég Kft." --expires "2027-12-31"
```

## Support

- GitHub Issues
- Email: support@ainova.hu

---

© 2026 Ainova Cloud Intelligence
