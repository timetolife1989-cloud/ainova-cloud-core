# TECHNIKAI ADÓSSÁGOK ÉS AZONNALI JAVÍTÁSOK

> **Verzió:** 1.0 | **Dátum:** 2026-03-14
> **Társdokumentum:** [EXPANSION_MASTER_PLAN.md](./EXPANSION_MASTER_PLAN.md), [MODULE_TECHNICAL_SPEC.md](./MODULE_TECHNICAL_SPEC.md)
> **Cél:** Minden ismert hiba, hiányosság, inkonzisztencia dokumentálása és priorizálása

---

## 1. 🔴 KRITIKUS — Üzleti logikát blokkoló hibák

### 1.1 `invoicing` és `digital-twin` NINCS a TIER_MODULES-ban

**Fájl:** `lib/license/tiers.ts`

**Probléma:** A `TIER_MODULES` objektum tartalmazza az összes tier-hez rendelt modult: basic-nél 5, professional-nál +5, enterprise-nál +7. DE:
- `invoicing` → NEM szerepel SEMELYIK tier-ben → csak license `modules_allowed` JSON override-dal működik
- `digital-twin` → NEM szerepel SEMELYIK tier-ben → ugyanaz

**Hatás:** Ha valaki tier-alapú licencet vesz (nem egyedi override), az invoicing és digital-twin modulokat NEM kapja meg.

**Javítás:**
```typescript
// lib/license/tiers.ts
TIER_MODULES.professional → hozzáadni: 'invoicing'
TIER_MODULES.enterprise → hozzáadni: 'digital-twin'
```

**Becsült idő:** 5 perc

---

### 1.2 `api-gateway` és `multi-site` — Szellemmodulok

**Probléma:** A `TIER_MODULES.enterprise` tartalmazza az `api-gateway` és `multi-site` modulokat, DE:
- `modules/api-gateway/` mappa NEM LÉTEZIK
- `modules/multi-site/` mappa NEM LÉTEZIK
- `_loader.ts`-ben NINCS import hozzájuk
- NINCS manifest.ts, migrations, api, components

**Hatás:** Az enterprise license "megígéri" ezeket a funkciókat, de nincs mögöttük kód.

**Opciók:**
1. **Eltávolítás a TIER_MODULES-ból** (ha nem tervezett) → 5 perc
2. **Modul stub létrehozás** (manifest + coming-soon UI) → 30 perc/db
3. **Teljes implementáció** → hetekbe kerül

**Javaslat:** Opció 2 — stub + "Coming Soon" badge az admin module listán.

---

### 1.3 PDF generálás — Csak HTML

**Fájl:** `lib/export/pdf.ts`

**Probléma:** A `createPdfResponse()` függvény HTML-t ad vissza, nem PDF-et. A `Content-Type` header ugyan `application/pdf`, de a tartalom HTML string. A komment is jelzi: *"For real PDF, puppeteer or @react-pdf can be added later."*

**Hatás:**
- A letöltött "PDF" fájl nem igazi PDF — nem nyílik meg PDF olvasóval
- A `modules/invoicing/api/invoice-pdf.ts` is ezt használja → a számla PDF nem valódi
- A böngésző `window.print()` → PDF mentés megoldás kliens-oldalon működik, de nem automatizálható

**Javítás részletes terv:** Lásd MODULE_TECHNICAL_SPEC.md §6.1

---

## 2. 🟡 FONTOS — Funkcionális hiányosságok

### 2.1 NAV Online Számla adapter — Üres stub

**Fájl:** `modules/invoicing/api/nav-adapter.ts`

**Probléma:** A NAV adapter csak stub — a `submitToNav()` függvény üres, nem küld adatot a NAV-hoz.

**Hatás:** Magyar NAV köteles számláknál NEM történik adatszolgáltatás → ez jogszabályi kötelesség → bírság.

**Megjegyzés:** Amíg nem élesítjük a számlázást fizetős ügyfeleknél, ez nem blokkoló. DE az élesítés előtt KÖTELEZŐ.

---

### 2.2 `lac-napi-perces` modul — Disabled, de API route-ok aktívak

**Probléma:** A `_loader.ts`-ben a `lac-napi-perces` modul ki van kommentezve:
```typescript
// import '../modules/lac-napi-perces/manifest';  // DISABLED
```
DE az `app/api/napi-perces/` és `app/dashboard/napi-perces/` route-ok megvannak és aktívak. Ez inkonzisztens: a modul nem regisztrált (nincs permissions, nincs adminSettings), de az API-k elérhetők.

**Javítás:** 
- Ha a modul nem kell → API route-ok + dashboard page törlése
- Ha kell → manifest visszakapcsolása + jogosultság ellenőrzés az API-kban

---

### 2.3 `sap-import` tier eltérés

**Probléma:** A `sap-import` manifest-ben `tier: 'enterprise'`, de a `TIER_MODULES`-ban a `professional` szinten van listázva. Inkonzisztencia.

**Javítás:** Dönteni kell melyik a helyes, és szinkronizálni:
- Ha enterprise → `TIER_MODULES.professional`-ból eltávolítani → `TIER_MODULES.enterprise`-ba
- Ha professional → `manifest.ts`-ben módosítani `tier: 'professional'`

---

### 2.4 Modul gateway — Hiányzó import a `_loader.ts`-ben

**Probléma:** Az `app/api/modules/[module]/route.ts` (module gateway) a `_loader.ts`-ből importál. Korábban javítottuk, hogy az `invoicing` bekerüljön. DE ha új modulokat adunk hozzá (purchasing, pos, crm, worksheets), mindegyiket külön importálni kell a `_loader.ts`-ben.

**Teendő:** Minden új modul manifest.ts-ét importálni kell a `modules/_loader.ts` fájlba. Ez kézi lépés, nincs auto-discovery.

**Javaslat:** Megfontolni automatikus modul discovery-t (filesystem scan), de ez NEM prioritás.

---

## 3. 🔵 TECHNIKAI ADÓSSÁG — Kódminőségi problémák

### 3.1 Adatbázis adapter inkonzisztencia — MSSQL vs PostgreSQL vs SQLite

**Probléma:** A rendszer 3 DB adaptert támogat, de a migrációs SQL fájlok PostgreSQL szintaxist használnak (pl. `gen_random_uuid()`, `TIMESTAMPTZ`, `BOOLEAN`). Az MSSQL és SQLite adaptereknél ezek nem működnek.

**Jelenlegi megoldás:** A migrate szkript adapter-specifikus SQL transzformációt végez. DE ez nem teljesen megbízható.

**Hatás:** Új migrációknál minden SQL-t kézzel 3 dialektusban kell tesztelni.

**Javaslat:** Elfogadni a PostgreSQL-t mint elsődleges dialektust (Supabase prod + Docker PostgreSQL on-prem). Az MSSQL és SQLite támogatás másodlagos.

---

### 3.2 `getSetting()` cache — Memória alapú, nincs invalidálás

**Fájl:** `lib/settings-server.ts`

**Probléma:** A `getSetting()` in-memory cache-t használ (5 perc TTL). Ha az admin módosít egy beállítást, a változás legfeljebb 5 perccel később lép érvénybe.

**Hatás:** Nem kritikus, de zavaró lehet (pl. modul bekapcsolás → 5 percig nem látszik).

**Javaslat:** SSE event küldés beállítás-változáskor → kliens cache invalidálás. VAGY a cache TTL csökkentése 1 percre.

---

### 3.3 Jogosultság-rendszer — `ensurePermissionsExist` kikapcsolva

**Probléma:** Korábban a `ensurePermissionsExist()` minden API hívásnál lefutott és DB-be szúrta a jogosultságokat. Ez lassú volt, ezért kikapcsoltuk (performance fix).

**Hatás:** Ha egy új modul jogosultságot definiál a manifest-ben, az NEM kerül be automatikusan a `core_permissions` táblába amíg valaki manuálisan nem futtatja a seed-et.

**Javaslat:** Jogosultságokat a migráció részeként INSERT-elni (nem runtime), vagy startup hook-ban egyszer lefuttatni.

---

### 3.4 `inventory_movements` — Nincs referencia típus normalizálás

**Probléma:** Az `inventory_movements.reference` mező szabad szöveges. Különböző modulok különböző formátumban írják:
- POS: `"TRX-2026-03-14-0001"`
- Purchasing: `"PO-2026-00001"`
- Worksheets: `"WS-2026-00001"`
- Manual: `"Kézi bevét"`

**Hatás:** Nehéz lekérdezni, melyik mozgás melyik modulból jött.

**Javaslat:** Új mező: `source_module VARCHAR(30)` + `source_id UUID` az inventory_movements táblán. Így: `source_module = 'pos', source_id = transaction_id`.

---

### 3.5 Hiányzó unit tesztek

**Jelenlegi helyzet:** A `tests/` mappa létezik, de leginkább a `lib/` alatti utility-ket teszteli. Nincs:
- Modul API tesztek (endpoint-ok)
- Számla generálás teszt
- Raktár mozgás integráció teszt
- POS flow teszt

**Javaslat:** Minimum tesztkészlet a FÁZIS A végére:
```
tests/
├── modules/
│   ├── purchasing/
│   │   ├── suppliers.test.ts
│   │   ├── orders.test.ts
│   │   └── receiving.test.ts
│   ├── pos/
│   │   ├── sessions.test.ts
│   │   ├── transactions.test.ts
│   │   └── refunds.test.ts
│   ├── invoicing/
│   │   ├── pdf-generation.test.ts
│   │   └── recurring.test.ts
│   └── inventory/
│       ├── barcode-search.test.ts
│       └── stocktaking.test.ts
├── lib/
│   ├── pdf-engine.test.ts
│   └── sectors.test.ts
```

---

## 4. ⚪ ALACSONY PRIORITÁS — Későbbi javítások

### 4.1 i18n — Hiányzó kulcsok

Néhány moduldashboardon hardcoded magyar szövegek vannak i18n kulcs nélkül. A tervezett ~370 új kulcs között ezek javítása is benne van.

### 4.2 Mobile responsiveness

A POS modul **ELEVE** mobil-optimalizáltra készüljön (tablet kasszának használható). A többi modul jelenleg desktop-first, de elfogadhatóan működik mobilon (Tailwind responsive classes).

### 4.3 Dark mode hiányosságok

A NeuronBackground és a Header támogatja a dark mode-ot, de egyes modul komponensek (OEE chart, Quality 8D form) hardcoded fehér háttérrel rendelkeznek.

### 4.4 Accessibility (a11y)

A POS modul esetén fontos: screen reader, keyboard navigation, ARIA labels. A jelenlegi moduloknál ez inkább "nice to have".

### 4.5 Demo adatok szektorspecifikusak

A jelenlegi `seed-demo-data.ts` gyártási kontextusú demo adatokat generál. A piacbővítéshez kell:
- Kiskereskedelmi demo (csavarok, festékek, szerszámok)
- Szolgáltatási demo (szerviz munkalapok, ügyfelek)
- Vendéglátási demo (alapanyagok, receptek)

---

## 5. ÖSSZEFOGLALÓ PRIORITÁSMÁTRIX

| # | Probléma | Súlyosság | Javítási idő | Blokkolja a bővítést? |
|---|---------|-----------|-------------|----------------------|
| 1.1 | invoicing/digital-twin nincs tier-ben | 🔴 | 5 perc | Igen — tier-alapú license nem ad modult |
| 1.2 | api-gateway/multi-site szellemmodulok | 🔴 | 30 perc | Nem, de megtévesztő |
| 1.3 | PDF csak HTML | 🔴 | 1-2 nap | Igen — számlát nem lehet emailben küldeni |
| 2.1 | NAV stub | 🟡 | 5 nap | Nem, de élesítés előtt kell |
| 2.2 | lac-napi-perces inkonzisztencia | 🟡 | 15 perc | Nem |
| 2.3 | sap-import tier eltérés | 🟡 | 5 perc | Nem |
| 2.4 | _loader.ts kézi import | 🟡 | ongoing | Igen — minden új modulnál |
| 3.1 | Multi-DB dialektus | 🔵 | N/A | Nem, ha PG-nél maradunk |
| 3.2 | Settings cache | 🔵 | 30 perc | Nem |
| 3.3 | Permissions insert | 🔵 | 1 óra | Igen — új modulok permission-jei |
| 3.4 | Movement reference | 🔵 | 30 perc | Nem, de jobb lenne |
| 3.5 | Hiányzó tesztek | 🔵 | ongoing | Nem, de kockázatos |
| 4.1-4.5 | Alacsony prioritás | ⚪ | változó | Nem |

---

## 6. JAVASOLT JAVÍTÁSI SORREND (PRE-EXPANSION)

A piacbővítési fejlesztés (FÁZIS A) ELŐTT vagy azzal PÁRHUZAMOSAN:

```
1. [5 perc]   tiers.ts → invoicing + digital-twin hozzáadás ← AZONNAL
2. [5 perc]   tiers.ts → sap-import tier szinkronizálás ← AZONNAL  
3. [30 perc]  api-gateway + multi-site → stub manifest + "Coming Soon" ← FÁZIS A előtt
4. [15 perc]  lac-napi-perces → tisztázás (törlés VAGY visszakapcsolás) ← FÁZIS A előtt
5. [1-2 nap]  PDF engine → jsPDF adapter ← FÁZIS A közben (invoicing bővítéssel együtt)
6. [1 óra]    Permissions → migrációba INSERT ← FÁZIS A közben (új modulok migrációjával)
7. [30 perc]  inventory_movements → source_module + source_id ← FÁZIS A közben
8. [5 nap]    NAV Online Számla 3.0 ← FÁZIS B-ben
9. [ongoing]  Tesztek ← Minden fázis végén
```

---

*Ez a dokumentum élő dokumentum — minden javítás után frissítendő a státusz.*
