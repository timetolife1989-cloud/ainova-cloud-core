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

| Csomag | Modulok | Célcsoport | Ár/hó |
|--------|---------|------------|-------|
| **Starter** | Raktár, Számlázás, Riportok, Import (max 5 user) | Micro cégek, kipróbálás | €99 |
| **Basic** | + Létszám, Felkövetés, Gépjármű, Purchasing, POS | Kis cégek | €299 |
| **Professional** | + Teljesítmény, Kapacitás, Kiszállítás, Készlet, Számlázás, CRM, Munkalapok, API Gateway | Közepes cégek | €599 |
| **Enterprise** | + OEE, PLC, Műszakbeosztás, Minőség, Karbantartás, Digital Twin | Nagyvállalatok | €1199 |

**Add-on modulok:** Recipes (€29), Appointments (€29), Projects (€49), E-commerce (€49), SAP Import (€99), API Gateway (€99), Multi-site (€199)

## Modulok

### Starter csomag
- **Inventory** — Raktárkezelés, készletnyilvántartás, mozgások
- **Invoicing** — Számlázás, NAV-kompatibilis számlagenerálás
- **Reports** — Riport generátor, diagramok, export
- **File-import** — Excel/CSV import admin konfigurációval

### Basic csomag
Starter csomag összes modulja, plusz:
- **Workforce** — Napi létszám, jelenlét, hiányzások
- **Tracking** — Feladat/rendelés felkövetés, státuszok
- **Fleet** — Gépjármű nyilvántartás, futások, tankolás
- **Purchasing** — Beszállító kezelés, rendelések, árubeérkezés
- **POS** — Pénztár (eladás, fizetési mód, napi zárás)

### Basic add-on modulok
- **Recipes** — Receptúra kezelés, hozzávalók, gyártás → készlet csökkentés
- **Appointments** — Időpontfoglalás, naptár, kapacitás kezelés
- **Projects** — Projektek, feladatok, Kanban, költségvetés
- **E-commerce** — WooCommerce/Shopify szinkronizáció

### Professional csomag
- **Performance** — Egyéni és csapat KPI, normaidő vs. valós
- **Scheduling** — Heti kapacitás tervezés, kihasználtság
- **Delivery** — Kiszállítási riport, vevő-bontás
- **Inventory** — Készletnyilvántartás, mozgás napló
- **Invoicing** — Magyar NAV-kompatibilis számlázás, PDF
- **CRM** — Ügyfélkezelés, pipeline, interakciók
- **Worksheets** — Munkalapok, munkaóra, anyag, aláírás, PDF
- **API Gateway** — Külső REST API hozzáférés, rate limiting

### Enterprise csomag
- **OEE** — Overall Equipment Effectiveness
- **PLC-Connector** — Siemens S7 / Modbus TCP / MQTT / OPC-UA integráció
- **Shift-Management** — Műszakbeosztás tervezés
- **Quality** — Minőségellenőrzés, 8D riport
- **Maintenance** — Karbantartás ütemezés
- **Digital Twin** — 2D gyártósor vizualizáció, valós DB integráció
- **SAP Import** — SAP RFC/OData integráció (séma + API + UI előkészítve)

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
- **PostgreSQL** (Supabase Cloud — elsődleges); MSSQL / SQLite adapter is elérhető
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
