# HELYZETKÉP — Hol tartasz, mi működik, mi nem, és mit csinálj

> **Készült:** 2026. március 10. (frissítve: 2026.03.10 — nyelvváltó végleges fix, SW cache fix)
> **Cél:** Rendet tenni a fejedben. Ezt a dokumentumot olvasd el elejétől végéig.

---

## 1. MI EZ A PROGRAM? (Egyszerűen)

Az Ainova Cloud Core egy **gyártásmenedzsment szoftver**, amit böngészőben használnak.

Képzeld el úgy, mint egy **okos Excel-t a gyárnak**:
- A dolgozók bejelentkeznek böngészőben
- Látják a saját feladataikat (létszám, felkövetés, gépjármű, stb.)
- Az admin beállítja mit láthatnak, kik vannak, milyen jogaik vannak
- Különböző **modulok** (funkciók) kapcsolhatók be/ki — mint egy LEGO

**A nagy ötlet:** Ezt a szoftvert el akarod adni gyártó cégeknek, 3 csomagban:
- **Basic** (5 modul) — kis cégek
- **Professional** (9 modul) — közepes cégek
- **Enterprise** (13+ modul) — nagyvállalatok

---

## 2. MIT KELLENE LÁTNOD, HA ELINDÍTOD?

### 2.1 Legelső indítás (üres adatbázis)

```
http://localhost:3000 → Setup Wizard (5 lépés):
  1. Üdvözlés
  2. Admin fiók létrehozása (felhasználónév + jelszó)
  3. Branding (cégnév + nyelv)
  4. Modulok kiválasztása
  5. Licenc kulcs (opcionális)
  → Kész → Login oldalra dob
```

### 2.2 Bejelentkezés után

```
http://localhost:3000/login → beírod a jelszavad →
http://localhost:3000/dashboard → EZT KELLENE LÁTNOD:

┌──────────────────────────────────────────────────────┐
│ HEADER SÁV (kék-sötét gradiens, fix a tetején)      │
│ [Logo] [Neved + Szerepkör] [Nyelv 🇭🇺] [Keresés]  │
│                          [Dátum/Idő] [KILÉPÉS gomb] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Vezérlőpult                                         │
│  Üdv, Admin!                                         │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │Létszám  │  │Felkövet.│  │Gépjármű │  ← modulok   │
│  └─────────┘  └─────────┘  └─────────┘     tile-ok   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │Import   │  │Riportok │  │Admin    │               │
│  └─────────┘  └─────────┘  └─────────┘              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.3 Admin Panel (ha rákattintasz az "Admin" tile-ra)

```
http://localhost:3000/dashboard/admin →

10 menüpont (kártyák):
  Users, Roles & Permissions, Modules,
  Branding & Settings, Language & Formats,
  Units, Import Configs, Diagnostics,
  Audit Log, License
```

### 2.4 Modul oldal (ha rákattintasz pl. "Létszám"-ra)

```
http://localhost:3000/dashboard/modules/workforce →

Adat tábla + form a modul saját adataival
(dolgozók listája, jelenlét, stb.)
```

---

## 3. MI NEM MŰKÖDIK ÉS MIÉRT? (A bajaid diagnózisa)

### ✅ 1. PROBLÉMA: "Visszadob a login oldalra" — JAVÍTVA!

**Mi volt a probléma:**
SQLite `datetime('now')` visszaadta: `"2026-03-10 07:01:25"` (nincs timezone info). JavaScript ezt LOKÁL IDŐKÉNT parse-olta, nem UTC-ként. Az idle timeout check rosszul számolt (timezone offset órákkal), így a session azonnal törlődött.

**Javítás (2026.03.10):**
- `lib/db/adapters/SqliteAdapter.ts`: `SYSDATETIME()` → `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` (ISO 8601 UTC)
- `DATEADD()` szintén ISO formátumot használ
- **Eredmény:** Session stabil marad, API hívások működnek

**Hol volt a kód:**
- `app/dashboard/layout.tsx` — session ellenőrzés
- `lib/auth/adapters/SessionAdapter.ts` — idle timeout logika
- `lib/api-utils.ts` — `checkSession` függvény

**Teszt eredmény:**
```
Dashboard SSR: 200 ✅
API /workforce/data: 200 ✅ (valós adatok)
API /tracking/data: 200 ✅ (valós adatok)
Session a DB-ben: megmarad ✅
```

---

### ✅ 2. PROBLÉMA: "Nem kezeli a nyelvkülönbségeket" — JAVÍTVA!

**Mi volt a probléma:**
A nyelvváltó (HU/EN/DE) nem működött rendesen — a checkmark rossz helyen volt, a fordítások nem frissültek, kétszer kellett kattintani.

**Gyökérok (2026.03.10):**
A `public/sw.js` Service Worker **stale-while-revalidate** cache stratégiát használt a dashboard oldalakra. Nyelvváltáskor:
1. PUT mentette az új nyelvet a DB-be ✅
2. `window.location.reload()` lefutott ✅
3. **A Service Worker a RÉGI cache-elt oldalt adta vissza** ❌
4. Háttérben letöltötte az új oldalt → cache frissült
5. Csak a MÁSODIK kattintás mutatta a helyes nyelvet

**Javítások (2026.03.10):**

| Fájl | Változás |
|------|----------|
| `public/sw.js` | `/dashboard` kizárva a SW cache-ből + cache verzió bump (v2) |
| `components/core/I18nProvider.tsx` | ÚJ — module-level store a fordításoknak |
| `hooks/useTranslation.ts` | Átírva: I18nProvider store-ból olvas (nincs fetch, nincs async) |
| `app/dashboard/layout.tsx` | I18nProvider-be csomagol, szerver-oldali locale + translations |
| `components/core/Header.tsx` | `locale` prop direkt használata (nincs lokális state) |
| `app/api/admin/settings/route.ts` | `clearTranslationCache()` hívás locale váltáskor |
| `app/api/i18n/route.ts` | `dynamic = 'force-dynamic'` + no-cache headerek |

**Architektúra (végleges):**
```
Kattintás Magyar-ra
  → PUT app_locale="hu" DB-be
  → clearTranslationCache()
  → window.location.reload()
  → Server layout renderel:
      getLocale() → "hu" (DB-ből)
      getTranslationsForLocale("hu") → magyar fordítások (fallback JSON + DB)
  → <I18nProvider locale="hu" translations={magyar}>
      → Header: locale="hu" → checkmark Magyar ✓
      → useTranslation() → module store-ból olvas → magyar fordítások ✓
```

**Eredmény:** Nyelvváltó HU/EN/DE egy kattintásra működik ✅

**Még hátravan (alacsony prioritás):**
- Login oldal szövegei → `useTranslation`-ból jöjjenek
- Setup wizard → fordítás kulcsok
- Hiba üzenetek → egységes nyelv

---

### � 3. PROBLÉMA: "Lefagy" — RÉSZBEN JAVÍTVA

**Mi volt a probléma:**
A program **server-oldali renderelést** használ (Next.js Server Components). MINDEN oldal betöltésekor:
1. Session ellenőrzés → DB hívás
2. Nyelv lekérés → DB hívás  
3. Aktív modulok → DB hívás
4. Licenc ellenőrzés → DB hívás

**Javítások:**
- **Session bug fix (2026.03.10):** Az SQLite timezone probléma megoldva → session stabil
- **Hydration fix (2026.03.10):** `Header.tsx` idő renderelés csak kliens oldalon → nincs több mismatch warning
- **DB hívások optimalizálva:** A kritikus útvonalakon gyorsabbak a lekérdezések

**Még mindig lassú lehet, ha:**
- SQLite DB fájl nagy (>100MB)
- Sok modul aktív (15+)
- Komplex lekérdezések futnak

**Megoldás javaslat:** Cache réteg a DB hívások elé (Redis/内存)

---

### 🔴 4. PROBLÉMA: "Mindenhol error"

**Miért történik:**
A kód nagyon sok helyen "lenyeli" a hibákat (`catch { /* ignore */ }`), ezért nem kapod meg a VALÓDI hibaüzenetet, hanem csak egy általános "Hiba történt"-et látsz.

**Példák a kódból:**
```
catch { /* ignore */ }        ← LoginContainer.tsx
catch(() => {});              ← Setup wizard
catch { /* ignore */ }        ← Header locale change
catch { // fallback }         ← i18n getLocale
catch { activeIds = []; }     ← module registry
```

---

### 🟡 5. PROBLÉMA: "Nem tudom értelmezni a konstrukciót"

A program rétegei egyszerűen:

```
┌─────────────────────────────────────────────┐
│  BÖNGÉSZŐ (amit te látsz)                   │
│  React komponensek (components/, app/)       │
├─────────────────────────────────────────────┤
│  SZERVER (Next.js - futtatja a logikát)     │
│  API route-ok (app/api/)                     │
│  Auth, RBAC, i18n, License (lib/)           │
├─────────────────────────────────────────────┤
│  ADATBÁZIS (MSSQL)                          │
│  Táblák (core_users, core_sessions, stb.)   │
│  15 core tábla + modul táblák               │
├─────────────────────────────────────────────┤
│  MODULOK (modules/)                          │
│  workforce, tracking, fleet, stb.           │
│  Mindegyik: manifest + api + ui + db tábla  │
└─────────────────────────────────────────────┘
```

---

### ✅ 5. PROBLÉMA: "Module API 404 és .toISOString() crash" — JAVÍTVA!

**Mi volt a probléma:**
- Dashboard komponensek `/api/modules/{id}/data`-t hívtak, de a route `modules/{id}/api/route.ts`-ben volt
- SQLite stringként adja vissza a dátumokat, de a kód `.toISOString()`-t hívott → runtime error

**Javítás (2026.03.10):**
- `app/api/modules/[moduleId]/[...path]/route.ts`: Fallback mechanizmus → először `api/data/route`, ha nincs → `api/route`
- **16 modul API fájl fixelve:** `String(r.field)` pattern a `.toISOString()` helyett
- **Eredmény:** Minden modul betölti az adatait, nincs több 404/500 error

**Érintett modulok:** workforce, tracking, fleet, oee, performance, maintenance, inventory, quality, delivery, scheduling, shift-management, reports (+ [id] sub-routes)

---

## 4. A PROGRAM JELENLEGI ÁLLAPOTA (Őszintén)

### ✅ Ami TÉNYLEG kész és működik (ha a DB él):
- Login/Logout flow (session-based)
- Dashboard megjelenítés modul tile-okkal
- Admin panel (10 menüpont - UI megvan)
- Setup Wizard (5 lépés)
- Header (navigáció, logout, óra, nyelvváltó HU/EN/DE — MŰKÖDIK)
- Modul rendszer (regisztráció, aktiválás, dependency check)
- RBAC (szerepkörök, jogosultságok)
- Licenc rendszer (tier-based szűrés)
- i18n rendszer (I18nProvider + useTranslation hook — szerver-oldali inject, működik)
- DB migrációs rendszer (15 core + modul táblák)
- Import pipeline (Excel/CSV)
- Ctrl+K keresés (Command Palette)
- Build hiba nélkül lefordul (TypeScript 0 error)

### ⚠️ Ami félig kész:
- Nyelvkezelés (dashboard KÉSZ, de login/setup/admin oldalak szövegei még hardcode)
- Modul dashboardok (UI van, de valódi gyártási logika nincs)
- Export (PDF/Excel keret kész, de nem tesztelve valós adattal)
- Email értesítések (kód kész, de SMTP konfig nincs)
- Workflow engine (keret kész, de nem tesztelve)

### ❌ Ami SKELETON (csak váz, nem funkcionális):
- AI Asszisztens (kell OpenAI API kulcs + valós adatok)
- PLC Connector (csak manifest + üres dashboard)
- Digital Twin (2D demo, nem valódi)
- SSE real-time (event bus kész, de nincs ki/bekapcsolva sehol)
- API Gateway (kód kész, de nincs kliens aki használná)
- Multi-site (csak CRUD, nincs bekötve a modulokba)
- Dashboard Builder (layout mentés kész, widget renderelés nincs)

### 🔢 Számokban:
- **17 modul** regisztrálva (15 aktív a loaderben)
- **55+ API route** definiálva
- **15 DB migráció** (core táblák)
- **~100 TypeScript fájl** a lib/ és modules/ mappákban
- **0 TypeScript build hiba** (tehát buildel, de ez nem jelenti hogy működik!)

---

## 5. MIT KELLENE MOST CSINÁLNOD? (Javasolt sorrend)

### 🏁 NULLA LÉPÉS: Az adatbázist életre kelteni

Semmi nem fog működni adatbázis nélkül. Ellenőrizd:

1. **Fut az MSSQL?** (Docker-ben vagy helyi gépen)
   ```bash
   # Docker-rel:
   docker-compose -f docker-compose.dev.yml up -d db
   # VAGY ellenőrizd a Windows Services-ben: "SQL Server (MSSQLSERVER)"
   ```

2. **Jók a .env.local beállítások?** Nézd meg a fájlt és ellenőrizd:
   ```
   DB_SERVER=localhost      ← A szerver elérhetősége
   DB_DATABASE=AinovaCore   ← Az adatbázis neve (léteznie kell!)
   DB_USER=sa               ← Felhasználó
   DB_PASSWORD=???          ← Jelszó
   DB_PORT=1433             ← Port
   ```

3. **Futtasd le a migrációkat** (ez hozza létre a táblákat):
   ```bash
   npx tsx scripts/migrate-all.ts
   ```

4. **Hozd létre az admin felhasználót:**
   ```bash
   npx tsx scripts/bootstrap-admin.ts
   ```

5. **Indítsd el:**
   ```bash
   npm run dev
   ```

6. **Nyisd meg:** `http://localhost:3000/login`

**Ha ez működik, onnantól minden más javítható.**

---

### 🥇 ELSŐ PRIORITÁS: Stabilizálás (hogy ne fagyjon le, ne dobjon vissza)

Ezek az igazi blokkoló hibák. Amíg ezek nincsenek rendben, felesleges bármi mást csinálni.

1. **Jobb hibakezelés** — A "catch ignore" mintákat cserélni valódi hibaüzenetekre
2. **DB kapcsolat ellenőrzés** — Ha nincs DB, értelmesen jelezni (nem csak lefagyni)
3. **Session stabilizálás** — A 30 perces timeout meghosszabbítása fejlesztés idejére

### 🥈 MÁSODIK PRIORITÁS: Nyelvkezelés rendbe tétele

A fordítórendszer (`useTranslation` hook) működik, de nincs bekötve a legtöbb helyre.

**Ami kell:**
- Login oldal szövegei → `useTranslation`-ból jöjjenek
- Admin panel menü szövegei → fordítás kulcsok használata
- Setup wizard → fordítás kulcsok
- Hiba üzenetek → egységes nyelv

### 🥉 HARMADIK PRIORITÁS: Egy modult végigcsinálni rendesen

Válassz EGY modult (pl. **Workforce** - Létszám), és csináld végig:
- Valódi adatok bevitele
- Lista + szűrés
- Szerkesztés + törlés
- Export (PDF/Excel)
- Hogy TÉNYLEG használható legyen

**Ez lesz a referencia** — ha EGY modul tökéletesen működik, a többit másolhatod.

---

## 6. A WEBOLDALRÓL (Bryan dolga)

Bryan a landing page-en dolgozik (`app/(marketing)/page.tsx`). Ez TELJESEN különálló az alkalmazástól:
- A landing page: `http://localhost:3000/` — marketing oldal, bárki látja
- Az alkalmazás: `http://localhost:3000/dashboard` — bejelentkezés után
- A kettő NINCS összekötve funkcionálisan, csak a "Sign In" link vezet a loginra

**Nem kell aggódnod emiatt.** Bryan csinálhatja a weboldalat, az nem befolyásolja az alkalmazást.

---

## 7. GYORS SZÓSZEDET (hogy értsd a kódot)

| Szó | Mit jelent | Hol van |
|-----|-----------|---------|
| **Modul** | Egy funkció blokk (pl. Létszám, Gépjármű) | `modules/` mappa |
| **Manifest** | A modul "személyi igazolványa" (név, ikon, tier) | `modules/xxx/manifest.ts` |
| **Adapter** | Cserélhető alkatrész (DB típus, Auth típus) | `lib/db/`, `lib/auth/` |
| **RBAC** | Ki mit láthat (Role-Based Access Control) | `lib/rbac/` |
| **Session** | Bejelentkezési azonosító (cookie-ban) | `lib/auth/adapters/SessionAdapter.ts` |
| **CSRF** | Biztonsági token (hogy ne lehessen kívülről POST-olni) | `lib/csrf.ts` |
| **Migráció** | SQL fájl ami táblákat hoz létre | `database/core/` |
| **Tier** | Licenc szint (basic/professional/enterprise) | `lib/license/` |
| **i18n** | Többnyelvűség (internationalization) | `lib/i18n/` |
| **SSE** | Real-time frissítés (Server-Sent Events) | `lib/sse/` |
| **Route** | API végpont (URL amire a szerver válaszol) | `app/api/` |
| **Layout** | Oldal keret (header + tartalom) | `app/dashboard/layout.tsx` |
| **Hook** | React funkció ami state-et/adatot kezel | `hooks/` |
| **Fallback** | Tartalék érték ha a fő forrás nem elérhető | `lib/i18n/fallback/` |

---

## 8. MAPPASTRUKTÚRA (amit értened KELL)

```
ainova-cloud-core/
│
├── app/                    ← 🖥️ AMIT A FELHASZNÁLÓ LÁT
│   ├── (auth)/login/       ←   Login oldal
│   ├── (marketing)/        ←   Landing page (Bryan dolga)
│   ├── dashboard/          ←   Bejelentkezés utáni oldalak
│   │   ├── admin/          ←     Admin panel (10 aloldal)
│   │   ├── modules/        ←     Modul oldalak (dinamikus)
│   │   ├── layout.tsx      ←     Keret (header + session check)
│   │   └── page.tsx        ←     Főoldal (modul tile-ok)
│   ├── setup/              ←   Setup wizard (első indítás)
│   └── api/                ←   API végpontok (szerver oldal)
│       ├── auth/           ←     Login/logout/session
│       ├── admin/          ←     Admin műveletek
│       ├── modules/        ←     Modul adatok CRUD
│       └── i18n/           ←     Fordítások
│
├── components/             ← 🧩 ÚJRAFELHASZNÁLHATÓ UI ELEMEK
│   ├── core/               ←   Header, MenuTile, CommandPalette
│   ├── login/              ←   Login form elemek
│   └── admin/              ←   Admin panel elemek
│
├── lib/                    ← ⚙️ ÜZLETI LOGIKA (a "motor")
│   ├── auth/               ←   Bejelentkezés kezelés
│   ├── db/                 ←   Adatbázis kapcsolat
│   ├── i18n/               ←   Fordítások
│   ├── modules/            ←   Modul rendszer
│   ├── rbac/               ←   Jogosultság kezelés
│   └── ...                 ←   Egyéb (export, email, AI, stb.)
│
├── modules/                ← 📦 A MODULOK (a "termékek")
│   ├── workforce/          ←   Létszám & Jelenlét
│   ├── tracking/           ←   Feladat felkövetés
│   ├── fleet/              ←   Gépjármű
│   ├── ...                 ←   + 12 további modul
│   └── _loader.ts          ←   Modul betöltő (import lista)
│
├── database/core/          ← 🗄️ DB TÁBLÁK (SQL fájlok)
│   ├── 001_core_users.sql  ←   Felhasználók tábla
│   ├── ...                 ←   14 további tábla
│   └── 015_workflow_rules.sql
│
├── scripts/                ← 🔧 PARANCSOK (kézi futtatás)
│   ├── migrate-all.ts      ←   Táblák létrehozása
│   ├── bootstrap-admin.ts  ←   Admin fiók létrehozás
│   └── generate-license.ts ←   Licenc generálás
│
├── docs/                   ← 📚 DOKUMENTÁCIÓ
│   ├── ARCHITECTURE.md     ←   Technikai architektúra
│   ├── OWNER_GUIDE.md      ←   Fejlesztői útmutató
│   ├── HELYZETKEP.md       ←   *** EZ A FÁJL ***
│   └── todo/               ←   Fázis TODO fájlok
│
├── .env.local              ← 🔑 TITKOS BEÁLLÍTÁSOK (DB jelszó stb.)
├── package.json            ← 📋 Projekt leírás + függőségek
└── next.config.ts          ← ⚙️ Next.js konfiguráció
```

---

## 9. A NAGY KÉP — HOL TARTASZ AZ ÜZLETBEN

```
┌──────────────────────────────────────────────────────────┐
│                    AINOVA PROJEKT ÁLLAPOT                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ KÉSZ:          A kódbázis váza, architektúra,        │
│                    modul rendszer, auth, admin UI         │
│                    (~ a ház alapja és falai állnak)       │
│                                                          │
│  🔧 MOST KELL:    Stabilizálás, nyelvkezelés,            │
│                    1 modul 100%-ra befejezése             │
│                    (~ az ajtókat/ablakokat berakni)       │
│                                                          │
│  ⏳ KÉSŐBB:        Többi modul, tesztelés,                │
│                    első ügyfél telepítés                  │
│                    (~ berendezni és beköltözni)           │
│                                                          │
│  🔮 TÁVOLI JÖVŐ:  Marketplace, Mobile, SaaS              │
│                    (~ második emelet ráépítés)            │
│                                                          │
│  BRYAN:           Landing page (marketing) — különálló   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 10. KONKRÉT TEENDŐK LISTÁJA (végrehajtási sorrendben)

### ✅ ELVÉGZETT (2026.03.10):
- Session timezone bug fix → SQLite kompatibilitás
- Module API 404 fix → fallback mechanizmus  
- .toISOString() crash fix → 16 modul API
- Header hydration fix → kliens oldali idő renderelés
- **Nyelvváltó végleges fix → I18nProvider + SW cache kizárás**
- **Workforce CSV export → pontosvessző szeparátor (magyar Excel kompatibilis)**
- **Workforce grafikonok → Recharts integráció (napi/heti/havi/éves bontás)**
- **Service Worker fix → /dashboard oldalak kizárva a cache-ből**

### 🔄 MOSTANI FÓKUSZ:

| # | Feladat | Állapot | Miért fontos |
|---|---------|--------|-------------|
| 1 | **Nyelvváltó (HU/EN/DE)** | ✅ KÉSZ | Checkmark + fordítás szinkronban, 1 klikk |
| 2 | **Workforce CSV export** | ✅ KÉSZ | Pontosvessző + magyar fejlécek |
| 3 | **Workforce grafikonok** | ✅ KÉSZ | Recharts, gradiens, tooltip, periódus választó |
| 4 | **Login/Setup/Admin lokalizálás** | ⏳ VÁR | Ezek még hardcode szövegekkel működnek |
| 5 | **Hibaüzenetek javítása** | ⏳ VÁR | Valódi hibaüzenetek, ne "Hiba történt" |

### 📋 KÉSŐBBI FELADATOK:
| # | Feladat | Prioritás | Megjegyzés |
|---|---------|-----------|------------|
| 6 | Workforce modul 100%-ra | KÖZEPES | Referencia modul — szűrés, szerkesztés, törlés |
| 7 | Login/Setup lokalizálás | KÖZEPES | useTranslation bekötés |
| 8 | Cache réteg (Redis) | ALACSONY | Teljesítmény |
| 9 | Unit tesztek írása | ALACSONY | Stabilitás |

---

## 11. NYELVVÁLTÓ ARCHITEKTÚRA (2026.03.10 — végleges)

### ✅ MI MŰKÖDIK:
- **Nyelvváltó dropdown**: Header-ben HU/EN/DE, checkmark helyes, 1 kattintás
- **Dashboard UI**: Teljes lokalizáció a workforce modulban (fejlécek, gombok, statisztikák)
- **Fallback rendszer**: `lib/i18n/fallback/hu.json`, `en.json`, `de.json`
- **DB felülírás**: `core_translations` tábla (admin szerkeszthető)

### 🔧 ARCHITEKTÚRA:
```
Szerver oldal (layout.tsx):
  getLocale() → DB core_settings.app_locale
  getTranslationsForLocale(locale) → fallback JSON + DB merge
  <I18nProvider locale={...} translations={...}>

Kliens oldal:
  I18nProvider.tsx → module-level store-ba ír (render közben)
  useTranslation.ts → module-level store-ból olvas
  Header.tsx → locale prop direkt (szerver-oldali)
```

### �️ ÉRINTETT FÁJLOK:
| Fájl | Szerep |
|------|--------|
| `components/core/I18nProvider.tsx` | Module-level store provider |
| `hooks/useTranslation.ts` | `t()` hook — store-ból olvas |
| `app/dashboard/layout.tsx` | Szerver-oldali locale + translations fetch |
| `components/core/Header.tsx` | Nyelvváltó UI + handleLocaleChange |
| `app/api/admin/settings/route.ts` | PUT locale → DB + clearTranslationCache |
| `app/api/i18n/route.ts` | GET locale + translations (fallback endpoint) |
| `lib/i18n/index.ts` | getLocale(), getTranslationsForLocale(), clearTranslationCache() |
| `public/sw.js` | Service Worker — /dashboard KIZÁRVA a cache-ből |

### ⚠️ FONTOS TANULSÁGOK:
1. **Service Worker cache** volt a fő probléma — stale-while-revalidate = mindig régi oldalt ad
2. **React Context** nem megbízható Turbopack dev módban (modul duplikáció) → module-level store
3. **window.__AINOVA_I18N__** script inject nem működik Next.js streaming-gel → I18nProvider props
4. **Locale prop + translations MINDIG ugyanabból a szerver renderből kell jöjjön**

---

## 12. HA ELAKADSZ — KÉRDEZD EZEKET

Amikor legközelebb Cascade-del (velem) dolgozol, így kérhetsz segítséget:

- **"A DB nem indul"** → megoldom a `.env.local` + Docker konfigot
- **"A login visszadob"** → megnézem a session/auth hibát
- **"Fordítsd le magyarra a login oldalt"** → bekötöm a useTranslation hookot
- **"Csináljuk végig a workforce modult"** → végigmegyünk rajta lépésről lépésre
- **"Miért kapok 500-as hibát?"** → megnézem a szerver logot és megtalálom az okot

**A lényeg: MINDIG egy konkrét problémát adj nekem, ne az egészet egyszerre.**

---

> **Összefoglalás:** A programod váza JÓ. Az architektúra szilárd. A nyelvváltó MŰKÖDIK (HU/EN/DE). A Workforce modul CSV exporttal és grafikonokkal bővült. Következő lépés: a Workforce modult 100%-ra befejezni (szűrés, szerkesztés, törlés), majd a többi modult is.
