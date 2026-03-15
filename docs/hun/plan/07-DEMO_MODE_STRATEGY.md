# DEMO MÓD STRATÉGIA ÉS IMPLEMENTÁCIÓ

> **Verzió:** 1.0 | **Dátum:** 2026-03-15
> **Cél:** A demo.ainovacloud.com élménye profi, értékesítés-támogató legyen

---

## 1. PROBLÉMA ÖSSZEFOGLALÓ

### Jelenlegi helyzet
A demo.ainovacloud.com **nincs felkészítve értékesítésre:**

1. **Érthetetlen hibák** — Jogosultság-hiány esetén a felhasználó angol/kódolt hibaüzenetet lát (`error.no_permission`, `You do not have permission...`), nem érti mi történik
2. **Nincs korlátozás** — A demo teljes hozzáférést ad: export, nyomtatás, felhasználókezelés — az ügyfél ténylegesen HASZNÁLHATNÁ a rendszert ingyen (pl. számlázásra)
3. **Nincs marketing** — A demo nem közvetíti, hogy "ez egy előzetes", nem ösztönöz vásárlásra
4. **Rossz első benyomás** — Ha a vevő belép és hibát kap, nem a terméket hibáztatja, hanem elmegy

### Mi kell?
- A demo **kipróbálható** legyen (adatfelvitel, szerkesztés, dashboard, grafikonok)
- De **nem használható produkciós célra** (export, nyomtatás, API letiltva)
- Minden hibaüzenet **érthető, magyar nyelvű**
- **Marketing elemek** emlékeztetik: ez demo → vedd meg a teljes verziót

---

## 2. IMPLEMENTÁLT MEGOLDÁSOK

### 2.1 Demo Mód Flag

**Aktiválás:** Környezeti változóval

```env
# .env.local / Vercel env vars
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

- `DEMO_MODE` — szerver-oldali (API route-ok, RBAC middleware)
- `NEXT_PUBLIC_DEMO_MODE` — kliens-oldali (UI komponensek, ExportButton, DemoBanner)

**Fontos:** A két változó EGYÜTT kell legyen beállítva.

### 2.2 Demo Korlátozások (Szerver)

**Fájl:** `lib/rbac/middleware.ts` — `isDemoMode()` + `DEMO_BLOCKED_ACTIONS`

Demo módban blokkolt műveletek:
| Művelet | Miért blokkolt | Hibaüzenet |
|---------|---------------|------------|
| `export` | Ne használják ingyen | `error.demo_restricted` |
| `print` | Ne nyomtassanak éles számlát | `error.demo_restricted` |
| `delete` | Ne töröljenek demo adatot | `error.demo_restricted` |
| `users.manage` | Ne hozzanak létre felhasználókat | `error.demo_restricted` |
| `admin.access` | Ne módosítsák az admin beállításokat | `error.demo_restricted` |

**Export route:** `app/api/modules/[moduleId]/export/route.ts` — demo módban 403 + `error.demo_export_blocked`

### 2.3 Demo Korlátozások (Kliens)

**ExportButton** (`components/core/ExportButton.tsx`):
- Demo módban az Export gomb marketing popup-ot mutat (lakat ikon 🔒)
- "Export a teljes verzióban" üzenet + "Ajánlatkérés →" link

**DemoBanner** (`components/core/DemoBanner.tsx`):
- A dashboard tetején lila/indigo banner
- "Ez egy demó környezet — ismerkedjen az ACI képességeivel! Egyes funkciók korlátozottak."
- "Ajánlatkérés →" gomb (mailto:info@ainovacloud.com)
- X gombbal elrejthető (session-re megjegyzi)

### 2.4 Érthető Hibaüzenetek

**Probléma:** API route-ok i18n kulcsokat adtak vissza (pl. `error.no_permission`), de a UI nem fordította le — a felhasználó a nyers kulcsot vagy angol szöveget látta.

**Megoldás:** `lib/translate-error.ts` — `translateApiError()` és `getErrorMessage()` utility

```typescript
// Ahelyett:
catch (e) { setError(e.message); }  // → "error.no_permission"

// Ezentúl:
catch (e) { setError(getErrorMessage(e, t)); }  // → "Nincs jogosultság"
```

**Jelenleg implementálva ezekben a modulokban:**
- ✅ workforce
- ✅ fleet
- ✅ purchasing
- ✅ performance
- ✅ invoicing (+ InvoiceEditor)
- ✅ maintenance
- ✅ oee

### 2.5 i18n Kulcsok (HU / EN / DE)

Új kulcsok mindhárom nyelven:

| Kulcs | Magyar | Angol | Német |
|-------|--------|-------|-------|
| `error.demo_restricted` | Ez a funkció a demóban nem elérhető... | This feature is not available in demo mode... | Diese Funktion ist im Demo-Modus nicht verfügbar... |
| `error.demo_export_blocked` | Exportálás a demóban nem elérhető... | Export is not available in demo mode... | Export ist im Demo-Modus nicht verfügbar... |
| `demo.banner_text` | Ez egy demó környezet — ismerkedjen... | This is a demo environment — explore... | Dies ist eine Demo-Umgebung — entdecken... |
| `demo.request_offer` | Ajánlatkérés → | Request offer → | Angebot anfordern → |
| `demo.export_blocked_title` | Export a teljes verzióban | Export in full version | Export in der Vollversion |
| `demo.export_blocked_desc` | A demóban az exportálás nem elérhető... | Export is not available in demo mode... | Export ist im Demo-Modus nicht verfügbar... |
| `demo.feature_full_version` | Ez a funkció a teljes verzióban érhető el | This feature is available in the full version | Diese Funktion ist in der Vollversion verfügbar |
| `demo.try_features` | Próbálja ki a funkciókat szabadon... | Try all features freely... | Testen Sie alle Funktionen frei... |
| `demo.upgrade_cta` | Érdekli a teljes verzió? | Interested in the full version? | Interessiert an der Vollversion? |

---

## 3. MIT TEHET A FELHASZNÁLÓ A DEMÓBAN?

### ✅ Engedélyezett (teljes hozzáférés)
- **Minden modul megtekintése** (dashboard, grafikonok, KPI-k)
- **Adatfelvitel** — új workforce bejegyzés, számla, rendelés stb.
- **Adatszerkesztés** — meglévő rekordok módosítása
- **Nyelv váltás** (HU / EN / DE)
- **Keresés** (Command Palette, modul szűrők)
- **Dashboard személyre szabás**
- **AI asszisztens** (ha OpenAI API kulcs konfigurálva)

### 🔒 Blokkolt (demo korlátozás)
- **Excel/PDF export** → marketing üzenet: "A teljes verzióban korlátlanul exportálhat"
- **Nyomtatás** → hasonló marketing üzenet
- **Felhasználó létrehozás/kezelés** → "Adminisztráció a teljes verzióban érhető el"
- **Admin beállítások módosítása** → védett
- **Rekord törlés** → védett (demo adatot megőrizzük)

---

## 4. DEMO BELÉPÉSI ADATOK

| Felhasználó | Jelszó | Szerep | Mire jó? |
|-------------|--------|--------|----------|
| `admin` | `Admin1234!` | admin | Teljes hozzáférés minden modulhoz |
| `manager_hu` | `Manager2025!` | manager | Manager nézet — korlátozott admin |
| `operator1` | `Operator2025!` | operator | Operátor nézet — adatfelvitel |

---

## 5. AUTOMATIKUS RESET

A demo adatok **naponta automatikusan visszaállnak:** 
- **Vercel Cron Job** — 03:00 UTC
- **Endpoint:** `POST /api/admin/demo-reset` (CRON_SECRET védett)
- Minden modul táblát töröl és újra seed-el
- A felhasználói fiókok megmaradnak

---

## 6. TEENDŐK — TOVÁBBI FEJLESZTÉSEK

### Magas prioritás (értékesítés előtt)
- [ ] `DEMO_MODE=true` és `NEXT_PUBLIC_DEMO_MODE=true` beállítása Vercel env vars-ban
- [ ] Admin pánel hozzáférés ellenőrzése demo módban (admin user belép, de admin panel pagek redirect-eljenek marketing oldalra?)
- [ ] Nyomtatás gomb letiltása demo módban (print CSS override vagy JS block)
- [ ] Screenshotok / GIF animációk a modulokról a landing page-re

### Közepes prioritás
- [ ] Demo időlimit: "X perc múlva a demo lejár, kérjen ajánlatot" üzenet
- [ ] Demo felhasználó "guided tour" — első bejelentkezésnél lépésről lépésre bemutató
- [ ] Pricing összehasonlító panel a demóban ("Starter vs Professional" interaktív)
- [ ] Demo fiókon "watermark" overlay a dashboardon halványan: "DEMO"

### Alacsony prioritás
- [ ] Analitika: melyik modulokat nézik meg legtöbbször a demo felhasználók
- [ ] Demo session recording (Hotjar / Clarity integráció)
- [ ] A/B teszt: különböző landing page variánsok konverziós rátája

---

## 7. VERCEL KÖRNYEZETI VÁLTOZÓK BEÁLLÍTÁS

A demo.ainovacloud.com Vercel projektben ezeket kell beállítani:

```
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

A produkciós környezetben (ha lesz) ezek NE legyenek beállítva, vagy `false` legyen az értékük.

---

## 8. MÓDOSÍTOTT FÁJLOK LISTÁJA

| Fájl | Változás |
|------|---------|
| `lib/rbac/middleware.ts` | `isDemoMode()`, `DEMO_BLOCKED_ACTIONS`, i18n kulcs az angol string helyett |
| `app/api/modules/[moduleId]/export/route.ts` | Demo mód export blokkolás |
| `components/core/ExportButton.tsx` | Demo mód marketing popup |
| `components/core/DemoBanner.tsx` | **ÚJ** — Dashboard tetejére demo banner |
| `app/dashboard/layout.tsx` | DemoBanner import + render |
| `lib/translate-error.ts` | **ÚJ** — API hibák i18n fordítása kliens oldalon |
| `lib/i18n/fallback/hu.json` | Demo + error kulcsok |
| `lib/i18n/fallback/en.json` | Demo + error kulcsok |
| `lib/i18n/fallback/de.json` | Demo + error kulcsok |
| 7× modul DashboardPage + InvoiceEditor | `getErrorMessage()` használata |
