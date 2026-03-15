# 02 — ISMERT HIBÁK & TECHNIKAI ADÓSSÁGOK

> **Verzió:** 4.0 | **Dátum:** 2026-03-16 | **Státusz:** FRISSÍTVE
> **Szabály:** NINCS technikai adósság. Minden itt felsorolt tételt javítani kell a bővítés ELŐTT.
> **Megjegyzés:** Az összes Phase 0-7 feladat KÉSZ (commit 3f350c3 → 36917ff)
> **Demo teszt audit:** 2026-03-16 — demo.ainovacloud.com élő tesztelés → 7 új hiba azonosítva és javítva
> **Kapcsolódó dokumentumok:**
> - [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) — Árképzés (az árak itt defináltak)
> - [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) — Piacbővítés (ezek blokkolják)
> - [05-ROADMAP.md](./05-ROADMAP.md) — Fejlesztési ütemterv (javítási sorrend)

---

## JELÖLÉSI RENDSZER

| Szimbólum | Jelentés |
|-----------|---------|
| 🔴 | KRITIKUS — üzleti/funkcionális blokkoló |
| 🟠 | FONTOS — teljesítmény/UX probléma |
| 🟡 | KÖZEPES — inkonzisztencia, nem blokkoló de zavaró |
| ⬜ | JAVÍTVA — dátummal |

---

## SZEKCIÓ A: LANDING PAGE HIBÁK

### BUG-01 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, commit 3f350c3)

**Fájl:** `app/(marketing)/page.tsx` L196
**Reprodukció:** Landing page → Pricing szekció → bármely kártya
**Leírás:** A tier.price tartalmazza a `€` jelet (`"€299"`), MAJD a suffix is hozzáad egy `€`-t:
```tsx
<span className="text-4xl font-extrabold">{tier.price}</span>
<span className="text-gray-400 text-sm"> €{t('landing.tier_per_month')}</span>
```
**Eredmény:** `€299 €/hó` (dupla `€`)
**Javítás:**
```tsx
// EITHER: Remove € from tier.price → price: '299' and keep the prefix
// OR: Remove the € from the suffix span → just use t('landing.tier_per_month')
// RECOMMENDED: Make tier.price numeric, and put €/{currency} in the template
```
**Utasítás a végrehajtó modellnek:**
1. `page.tsx` L29-48: `price` értékeket átírni "299", "599", "1,199" formára (€ nélkül)
2. L196: `<span>€{tier.price}</span><span>{t('landing.tier_per_month')}</span>` — az € a template-ben
3. Ellenőrizni, hogy a `landing.tier_per_month` i18n kulcs NEM tartalmaz €-t (`hu.json`, `en.json`, `de.json`)
4. Frissíteni a `hu.json` kulcsot is ha kell: `/hó`, nem `€/hó`

---

### BUG-02 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, commit 3f350c3)

**Fájl:** `app/(marketing)/page.tsx` — `'use client'` komponens
**Fájl:** `hooks/useTranslation.ts`
**Reprodukció:** Landing page betöltés → néha üres/hibás, frissítésnél rendben
**Probléma gyökere (3 valószínű ok):**

1. **useTranslation fetch hiba:** A `useTranslation()` hook `fetch('/api/i18n')` hívást indít. Ha a Supabase/Vercel cold start lassú, a fetch timeout-olhat. NINCS error boundary → a komponens crash-el.
   - Fájl: `hooks/useTranslation.ts` L15-27
   - A `cache: 'no-store'` + `Date.now()` cache buster → MINDEN betöltésnél új fetch → soha nem cacheelt

2. **Framer Motion animáció + SSR hydration:** A `motion.div` komponensek server-side renderelés nélkül (`'use client'`) terhelik a fő szálat. Ha az animáció inicializálás egybeesik a fetch-csel, a UI „blank" lesz.

3. **NeuronBackground canvas 80 node:** `LazyNeuronBackground nodeCount={80}` → 80 node + canvas rajzolás a landing page-en a fetch ELŐTT elindul → CPU spike → lassú render.

**Javítás:**
1. `useTranslation.ts`: Error boundary hozzáadás (try/catch a fetch körül, fallback üres objektumra)
2. Landing page: A `NeuronBackground` nodeCount csökkentése 40-re a landing-en (80 a dashboard-on bőven elég, a landing-en 40 is szép)
3. Fontolóra venni: a landing page-et `'use server'` SSR-re átalakítani (a pricing data statikus, nem kell kliens-oldali fetch)

**Utasítás a végrehajtó modellnek:**
1. `hooks/useTranslation.ts` → a `fetch` hívást wrap-olni try/catch-be. Hiba esetén: `setTranslations({})` és `setLoading(false)`
2. `app/(marketing)/page.tsx` → `LazyNeuronBackground nodeCount={40}`
3. Fontolóra venni (OPCIONÁLIS): React Error Boundary wrapper a landing page body köré

---

### BUG-03 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, commit 3f350c3)

**Fájl:** `components/core/LanguageSwitcher.tsx`
**Fájl:** `hooks/useTranslation.ts`
**Fájl:** `lib/i18n/index.ts` (30s locale cache)
**Reprodukció:** Login page → nyelv váltás → néha beengedi auth nélkül
**Probléma gyökere:**

1. A `LanguageSwitcher` `POST /api/i18n` hívással frissíti a `core_settings.app_locale` értéket
2. Utána `router.refresh()` hívás → a szerver újrarendereli az oldalt
3. DE a `getLocale()` 30 másodperces cache-t használ → az új locale nem lép érvénybe azonnal
4. A dashboard layout-ban a `getAuth().validateSession()` fut → ha a cookie megvan de invalid (idő közben lejárt), NEM redirect-el → megmutatja az oldalt üres adatokkal

**Javítás:**
1. `lib/i18n/index.ts`: locale cache TTL csökkentése 30s → 5s (vagy 0 — mindig friss)
2. `LanguageSwitcher`: explicit cache invalidálás az API hívásnál (ha van `clearLocaleCache()` utility)
3. Az auth "bypass" nem a nyelvváltás hibája — az auth ellenőrzés FÜGGETLEN. De vizsgálni kell, hogy a `validateSession()` tényleg redirect-el-e invalid session-nél, vagy csak `null`-t ad vissza és a UI megjelenik adatok nélkül.

**Utasítás a végrehajtó modellnek:**
1. `lib/i18n/index.ts` → `_localeCacheTTL` értéket keresni és 5000-re (5s) csökkenteni
2. `components/core/LanguageSwitcher.tsx` → olvasni, megérteni a logikát, biztosítani hogy `router.refresh()` UTÁN fut-e (nem előtte parallel)
3. `app/dashboard/layout.tsx` → biztosítani hogy `if (!session) redirect('/login')` MINDIG lefut és nincs mód UI renderelésre session nélkül

---

## SZEKCIÓ B: TELJESÍTMÉNY PROBLÉMÁK

### PERF-01 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, commit 3f350c3)

**Fájl:** `app/dashboard/layout.tsx` L12: `export const dynamic = 'force-dynamic';`
**Hatás:** MINDEN dashboard oldal MINDEN kérésnél:
- Teljes szerver-side renderelés (nincs ISR, nincs statikus generálás)
- Adatbázis lekérdezések MINDIG lefutnak
- Session validálás, locale + translations betöltés minden kérésnél

**Miért van ott:** A dashboard dinamikus adatokat mutat → első pillantásra logikus.
**Miért rossz:** A layout (HudFrame, NeuronBackground, CommandPalette, InactivityGuard) STATIKUS tartalom. Csak a `{children}` dinamikus.

**Javítás (2 lépcsős):**
1. **Rövid távon:** A `force-dynamic`-ot megtartjuk, DE a layout statikus elemeit memoizáljuk (React cache)
2. **Közep távon:** A `force-dynamic`-ot áthelyezni a `page.tsx` szintjére (layout marad statikus, page dinamikus)

**Utasítás a végrehajtó modellnek:**
1. `app/dashboard/layout.tsx` → `export const dynamic = 'force-dynamic'` TÖRLÉSE
2. `app/dashboard/page.tsx` → `export const dynamic = 'force-dynamic'` HOZZÁADÁSA (itt kell, mert az adatok dinamikusak)
3. Egyéb dashboard page-ek ahol kellhet: `app/dashboard/admin/*`, `app/dashboard/modules/*` → ellenőrizni, melyikeknek kell `force-dynamic`
4. Tesztelni: a layout cacheelődik-e a HudFrame-mel, miközben a page content frissül

---

### PERF-02 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, commit 3f350c3)

**Fájl:** `app/dashboard/layout.tsx` L24: `getAuth().validateSession(sessionId)`
**Fájl:** `app/dashboard/page.tsx` L14: `getAuth().validateSession(sessionId)`
**Hatás:** Minden dashboard oldal betöltésnél 2× fut a session validálás (2× DB query).

**Javítás:**
A `page.tsx`-ből eltávolítani a session validálást. A layout MÁR validálta → a page bízhat benne.
A session adatokat (username, role) a layout-ból a children-nek kell továbbadni (React context VAGY searchParams VAGY server-side cookie).

**Utasítás a végrehajtó modellnek:**
1. `app/dashboard/page.tsx` → L10-15 session validálás TÖRLÉSE
2. A `session` adatot a layout-ból kell megkapnia. Opciók:
   a. **Legegyszerűbb:** A layout `cookies()`-ból olvassa a session-t, a page is `cookies()`-ból → de validálja csak a layout. A page `getAuth().getSessionFromCookie()` (lightweight, no DB) használjon.
   b. **Vagy:** React `cache()` wrapper: `const getSessionCached = React.cache(() => getAuth().validateSession(...))` → mindkét hívás ugyanazt a cache-elt eredményt kapja.
3. Minden `/dashboard/**/page.tsx`-ben keresni hasonló dupla validálást

---

### PERF-03 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, DB pool audit elvégezve)

**Fájl:** `lib/db/adapters/MssqlAdapter.ts` — saját `sql.ConnectionPool`
**Fájl:** `lib/db/getPool.ts` — MÁSODIK `sql.ConnectionPool` ugyanahhoz a DB-hez
**Hatás:** 2× annyi DB kapcsolat mint kellene. Max 10+10 = 20 connection az adatbázishoz.

**Megjegyzés:** Jelenleg PostgreSQL-t használunk (Supabase), nem MSSQL-t. A `getPool.ts` valószínűleg MSSQL-specifikus funkciókhoz készült (MERGE, sql.Table). Ellenőrizni, hogy egyáltalán használatban van-e.

**Utasítás a végrehajtó modellnek:**
1. `grep -r "getPool" --include="*.ts"` → megnézni, hol van használatban a `getPool.ts`
2. Ha sehol (vagy csak MSSQL-specifikus helyen ami PG-n nem fut): a fájl törölhető, vagy jelölhető `// MSSQL-ONLY`
3. Ha használatban: összevonni az MssqlAdapter pool-jával

---

### PERF-04 ⬜ JAVÍTVA — 2026-03-15 (Phase 7, commit 36917ff — OffscreenCanvas + Worker)

**Fájl:** `components/ui/LazyNeuronBackground.tsx` → tényleges komponens `NeuronBackground.tsx`
**Hatás:** 90 node + 200px connection distance + 60fps canvas animáció → folyamatos CPU/GPU terhelés
**Hol fut:** Dashboard layout (90 node) + Landing page (80 node). Összesen 170 node ha párhuzamosan nyitva.

**Javítás:**
- Dashboard: csökkenteni 60 node-ra (90 → 60)
- Landing: csökkenteni 40 node-ra (80 → 40)
- VAGY: `IntersectionObserver` → ha az elem nem látszik (scroll), animáció szüneteltetése
- VAGY: `matchMedia('(prefers-reduced-motion: reduce)')` → mozgáscsökkentés

**Utasítás a végrehajtó modellnek:**
1. `app/(marketing)/page.tsx` → `nodeCount={40}`
2. `app/dashboard/layout.tsx` → `nodeCount={60}`
3. `NeuronBackground.tsx` → `requestAnimationFrame` loop-ban: ha a tab nem aktív (`document.hidden === true`), NE rajzoljon
4. Opcionális: alacsony teljesítményű eszközökön (mobil) nodeCount felezése

---

### PERF-05 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, getSetting bulk query implementálva)

**Fájl:** `lib/settings.ts` — `getSetting(key)` egyenként kérdezi le a beállításokat
**Hatás:** Ha 5 beállítás kell → 5× `SELECT ... WHERE setting_key = @key` (cache hit után: 0, de első betöltésnél mind fut)

**Javítás:**
`getSettingsBulk(keys: string[])` függvény: egyetlen query az összes kért kulcsra.
```sql
SELECT setting_key, setting_value FROM core_settings WHERE setting_key IN (@key1, @key2, ...)
```
**Utasítás a végrehajtó modellnek:**
1. `lib/settings.ts` → `getSettingsBulk()` hozzáadása
2. A meglévő `getSetting()` MARAD (backward compat)
3. Ahol lehetséges, page szintű betöltésnél bulk query-re váltani

---

## SZEKCIÓ C: MODUL-SZINTŰ HIBÁK

### BUG-04 ⬜ JAVÍTVA — 2026-03-15 (Phase 0+1, tiers.ts teljes felülírás)

**Fájl:** `lib/license/tiers.ts`
**Probléma:** A `TIER_MODULES` objektumban:
- `invoicing` → NEM szerepel semelyik tier-ben
- `digital-twin` → NEM szerepel semelyik tier-ben

**Hatás:** Tier-alapú licenccel (ami a standard értekezési mód) ezek a modulok NEM aktiválódnak. Csak `modules_allowed` JSON override-dal működnek.

**Javítás:**
```typescript
// TIER_MODULES.professional → hozzáadni: 'invoicing'
// A Starter tier-ben is kell (lásd 01-PRICING_STRATEGY.md §2.3):
// TIER_MODULES.starter → 'invoicing' is benne van

// TIER_MODULES.enterprise → hozzáadni: 'digital-twin'
```

**Utasítás a végrehajtó modellnek:**
1. `lib/license/tiers.ts` → `professional` array → `'invoicing'` hozzáadás
2. `lib/license/tiers.ts` → `enterprise` array → `'digital-twin'` hozzáadás
3. Starter tier teljes definíció: lásd [05-ROADMAP.md](./05-ROADMAP.md) §A2

---

### BUG-05 ⬜ JAVÍTVA — 2026-03-15 (Phase 6, api-gateway teljes modul implementálva; multi-site add-on)

**Fájl:** `lib/license/tiers.ts` L27-28 — enterprise tier-ben listázva
**Probléma:** A TIER_MODULES enterprise array tartalmazza: `'api-gateway'`, `'multi-site'`
**DE:** `modules/api-gateway/` ÉS `modules/multi-site/` mappák NEM léteznek. Nincs manifest, API, migration, UI.

**Hatás:** Az enterprise licenc "megígéri" ezeket, de nincsenek. Ez megtévesztő.

**Javítás:** Stub manifest létrehozása "Coming Soon" felirattal.

**Utasítás a végrehajtó modellnek:**
1. `modules/api-gateway/manifest.ts` → stub: `registerModule({ id: 'api-gateway', name: 'API Gateway', version: '0.0.1', tier: 'enterprise', comingSoon: true, ... })`
2. `modules/multi-site/manifest.ts` → hasonló stub
3. `modules/_loader.ts` → import mindkét manifestet
4. A dashboard-on ezek "Coming Soon" badge-dzsel jelenjenek meg (ha `comingSoon: true` → MenuTile szürke + badge)
5. VAGY: eltávolítani a TIER_MODULES-ból amíg nincs kód (ez az egyszerűbb, de kevésbé professzionális)

---

### BUG-06 ⬜ JAVÍTVA — 2026-03-15 (add-on modell bevezetve, sap-import → ADDON_MODULES)

**Fájl:** `modules/sap-import/manifest.ts` → `tier: 'enterprise'`
**Fájl:** `lib/license/tiers.ts` → `sap-import` a `professional` listában
**Probléma:** Inkonzisztencia — a manifest enterprise-nak mondja, de a tiers.ts professional-ba sorolja.

**Javítás:** Döntés: SAP integráció → enterprise szintű (drága, komplex). Tehát:
- `tiers.ts` → `sap-import` áthelyezni professional-ból enterprise-ba
- VAGY: `manifest.ts` → `tier: 'professional'`
- **Javaslat:** Add-on (lásd [01-PRICING_STRATEGY.md](./01-PRICING_STRATEGY.md) §2.3): `sap-import` legyen +€99/hó add-on, Professional+ felett

**Utasítás a végrehajtó modellnek:**
1. Döntés: ha add-on → `tiers.ts`-ból eltávolítani mindkét helyről, és az add-on rendszerben kezelni (ami JELENLEG nem létezik → parkoló feladat)
2. ADDIG: `tiers.ts` enterprise-ba mozgatni (manifest-tel szinkronban)

---

### BUG-07 ⬜ JAVÍTVA — 2026-03-15 (lac-napi-perces route cleanup, Phase 0)

**Fájl:** `modules/_loader.ts` → `// import '../modules/lac-napi-perces/manifest';` (kikommentelve)
**Fájl:** `app/api/napi-perces/` és `app/dashboard/napi-perces/` → LÉTEZNEK és elérhetők

**Probléma:** A modul nem regisztrált (nincs permission check), de az API és UI route-ok aktívak. Bárki elérheti auth nélkül.

**Javítás:** Ha a modul nem kell → route-ok törlése. Ha kell → manifest visszakapcsolása.

**Utasítás a végrehajtó modellnek:**
1. Kérdezni Tibortól: kell-e a `lac-napi-perces` modul?
2. Ha NEM → `app/api/napi-perces/` mappa törlése + `app/dashboard/napi-perces/` törlése
3. Ha IGEN → `modules/_loader.ts` → uncomment + permission middleware hozzáadása az API-khoz

---

### BUG-08 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, PDF i18n locale paraméter hozzáadva)

**Fájl:** `modules/invoicing/lib/pdf-generator.ts` L53-66
**Probléma:** A `TYPE_LABELS`, `PAYMENT_LABELS`, `fmt()` mind hardcoded magyar → "SZÁMLA", "Nettó egységár", "Készpénz"
**Hatás:** Nemzetközi számlázásnál a számla MINDIG magyar → nem használható külföldi vevőhöz

**Javítás:** i18n-esíteni: a PDF generátornak kapnia kell egy `locale` paramétert, és a fordításokat az i18n rendszerből kell húznia.

**Utasítás a végrehajtó modellnek:**
1. `pdf-generator.ts` → `generateInvoicePdf(invoice, locale)` — locale paraméter hozzáadása
2. A hardcoded stringeket cserélni i18n kulcsokra: `invoicing.pdf.title`, `invoicing.pdf.net_unit_price`, stb.
3. Új i18n kulcsok hozzáadása `hu.json`, `en.json`, `de.json`-hoz

---

### BUG-09 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, i18n currency support)

**Fájl:** `modules/delivery/components/DashboardPage.tsx` L139
**Probléma:** `{totalValue.toLocaleString()} Ft` — hardcoded HUF. Nemzetközi ügyfélnél EUR/USD kellene.

**Javítás:** A pénznem a core_settings-ből vagy tenant config-ból kell jöjjön.

---

### BUG-10 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, async I/O + fájlméret validáció)

**Fájl:** `lib/import/pipeline.ts`
**Probléma (feltárt):**
1. `fs.writeFileSync` → blokkoló I/O szerver-oldalon → ha nagy fájl → a szálat blokkolja
2. Nincs fájlméret validáció (csak a `serverActions.bodySizeLimit: 50mb` védi)
3. Ha az oszlop mapping hibás → a hibaüzenet nem informatív
4. Felhasználói visszajelzés hiánya (nincs progress bar, nincs "X sor importálva, Y hiba")

**Javítás:**
1. `writeFileSync` → `writeFile` (async)
2. Expliciten fájlméret check BEFORE processing (max 10MB a normál import)
3. Hibás sorok összegyűjtése → a válaszban `{ imported: 150, errors: [{ row: 12, field: 'qty', message: 'Not a number' }] }`
4. UI: progress indicator (SSE vagy polling)

---

## SZEKCIÓ D: HARDCODED LOCALE / i18n PROBLÉMÁK

### BUG-11 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, locale context-ből olvasva)

**Fájl:** `components/core/HudFrame.tsx` — `toLocaleString('hu-HU')`
**Fájl:** `components/core/Header.tsx` L30-31 — `formatDateTime` hardcoded `hu-HU`
**Hatás:** Idő/dátum formátum mindig magyar, akkor is ha az app locale `en` vagy `de`

**Javítás:** A locale-t a Props-ból vagy context-ből kell húzni, nem hardcoded.

---

## SZEKCIÓ E: VALÓDI PDF GENERÁLÁS

### BUG-12 ⬜ JAVÍTVA — 2026-03-15 (Phase 0, @react-pdf/renderer bevezetve)

**Fájl:** `lib/export/pdf.ts`
**Probléma:** A `createPdfResponse()` HTML-t ad vissza `Content-Type: application/pdf` headerrel. Ez NEM igazi PDF.
A böngésző nemtörődömségemből rendben nyitha, de email mellékletként, offline, vagy archívumként nem használható.

**Döntés:** `@react-pdf/renderer` — server-side, React JSX alapú PDF layout.

**Miért ez a legjobb opció:**
| Szempont | @react-pdf/renderer | jsPDF | Puppeteer |
|---------|---------------------|-------|-----------|
| Szerver oldalon fut | ✅ | ❌ (kliens) | ✅ |
| Vercel-en működik | ✅ | ✅ | ❌ (150MB Chrome) |
| Layout kontroll | ✅ (JSX) | ❌ (pixel coordinates) | ✅ (HTML→PDF) |
| Költség | €0 | €0 | €0 de nagy memory |
| Offline szükséges | ❌ (nincs) | ✅ | ❌ |
| Magyar karakterek | ✅ (betöltött font) | ⚠️ (font bekötés nehéz) | ✅ |

**Implementáció terv:**
```
1. npm install @react-pdf/renderer
2. modules/invoicing/lib/invoice-pdf-template.tsx → JSX számla template
3. lib/export/pdf-react.ts → renderToBuffer(template) → Buffer
4. API route: invoicing/api/invoice-pdf.ts → Response(buffer, { 'Content-Type': 'application/pdf' })
5. Font: Noto Sans (UTF8 → magyar ékezetek)
```

**Utasítás a végrehajtó modellnek:**
1. `npm install @react-pdf/renderer @react-pdf/font`
2. Font letöltés: Noto Sans Regular + Bold (Google Fonts), `public/fonts/NotoSans-Regular.ttf`
3. Template fájl: `modules/invoicing/lib/invoice-pdf-template.tsx` — `<Document><Page><View>` hierarchia
4. A meglévő `lib/export/pdf.ts` → `generatePdfHtml()` MARAD (backward compat, a többi modul használja)
5. Az invoicing-specifikus PDF → az új `@react-pdf` template-ből generálódik
6. Tesztelni: magyar ékezetek (ÁÉÍÓÖŐÚÜŰáéíóöőúüű), A4 layout, NAV-kompatibilis mezők

---

## SZEKCIÓ F: ADATARCHITEKTÚRA MEGJEGYZÉSEK

### ARCH-01 🟡 "One Truth Table" kérdés

**Jelenlegi állapot:** Minden modul saját táblákat használ (`invoicing_*`, `inventory_*`, `tracking_*`). Ez **HELYES moduláris mintázat** — NEM kell egyetlen óriás-tábla.

**Miért jó így:** Modul hozzáadás/eltávolítás → csak a modul tábláit kell migrálni. Nincs God Table anti-pattern.

**Ami KELL:** A modulok KÖZTI integráció (purchasing→inventory, pos→inventory→invoicing) → FK referenciák a modulok között. Ez rendben van — a `purchasing_order_items.product_id → inventory_items.id` FK teljesen szabályos.

### ARCH-02 🟡 Frontend adathozzáférés

**Jelenlegi állapot:** TanStack React Query (`staleTime: 5 perc`, `refetchOnWindowFocus: false`).
**Értékelés:** ✅ Jól van konfigurálva. A 5 perces staleTime azt jelenti, hogy navigálás után a cache-elt adat azonnal megjelenik, és háttérben frissül.

### ARCH-03 🟡 Worker/cache kirendelés

**Jelenlegi állapot:** Nincs Web Worker, nincs Service Worker cache (az `sw.js` minimális).
**Javaslat:** A NeuronBackground animációt áttenni OffscreenCanvas + Worker-be → nem blokkolja a fő szálat.
**Javaslat:** PDF generálás (ha @react-pdf szerver-oldali) → Next.js API route-ban fut, nem blokkolja az UI-t.

---

## SZEKCIÓ G: DEMO TESZT AUDIT — 2026-03-16

> **Forrás:** demo.ainovacloud.com élő tesztelés (CEO screenshotok alapján)
> **Összes hiba:** 7 azonosítva → 7 javítva

### BUG-18 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** `app/(marketing)/page.tsx`
**Reprodukció:** Landing page → Pricing kártyák animálódnak, majd villognak
**Probléma:** A `motion.div` `whileInView` animáció `IntersectionObserver`-rel figyeli az elemet. Scroll közben az observer ismételten tüzel (visible → hidden → visible), ami a kártyák villogását okozza.
**Javítás:** `whileInView` → `animate` (egyszer fut le, nem ismétlődik).

### BUG-19 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** `app/(marketing)/page.tsx` (minden CTA gomb)
**Reprodukció:** Landing page → "Próbáld ki ingyen" / "Demó kérés" gomb → navigál `/setup`-ra → redirect `/login`-ra
**Probléma:** A CTA gombok `href="/setup"` linket használnak, de a demo site-on a `/setup` oldal nem elérhető (redirect `/login`-ra). Értelmetlen kerülőút.
**Javítás:** Minden CTA `href` átírva `/setup` → `/login` (hero, tier CTA-k, footer CTA).

### BUG-20 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** `lib/i18n/index.ts` L6: `LOCALE_CACHE_TTL`
**Fájl:** `components/core/LanguageSwitcher.tsx`
**Reprodukció:** Dashboard → nyelvváltó → klikk "English" → oldal újratöltődik → MARAD magyar → második klikk → AKKOR vált angolra
**Probléma gyökere:** A `LanguageSwitcher` PUT-tal frissíti a `core_settings.app_locale`-t, majd `router.refresh()` + `setTimeout(() => window.location.reload(), 600)`. DE a `getLocale()` függvény **5 másodperces cache**-t használ (`LOCALE_CACHE_TTL = 5_000`). Az oldal 600ms alatt újratöltődik, de a cache még a RÉGI locale-t adja vissza.
**Javítás:** `LOCALE_CACHE_TTL` = 0 (mindig friss DB lekérdezés). A locale cache értelmetlen mert ritkán változik, és a DB query minimális költségű.

### BUG-21 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** `app/error.tsx`
**Reprodukció:** Bármely oldal hibája → "An error occurred" angol szöveg jelenik meg
**Probléma:** A globális error boundary angol nyelvű volt ("An error occurred" / "Refresh"). Ez inkonzisztens a magyar felülettel.
**Javítás:** Magyar szöveg ("Hiba történt" / "Újrapróbálás" / "Vissza a főoldalra") + jobb UX: `reset()` gomb + "vissza a dashboard"-ra navigáció.

### BUG-22 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** 10 modul `DashboardPage.tsx` — `ExportButton` `table` prop
**Reprodukció:** Bármely modul → Excel/PDF export → "Export failed" hibaüzenet
**Probléma gyökere:** Az `ExportButton` komponens `table` prop-ja `mod_*` prefix-es nevet adott meg (pl. `mod_invoicing`, `mod_inventory`), DE az adatbázis táblák MÁSTÓL vannak elnevezve (pl. `invoicing_invoices`, `inventory_items`). Az export route `SELECT * FROM ${table}` lekérdezést futtat → nem létező tábla → hiba.

**Javított tábla nevek:**

| Modul | Rossz (volt) | Helyes (javított) |
|-------|-------------|-------------------|
| invoicing | `mod_invoicing` | `invoicing_invoices` |
| inventory | `mod_inventory` | `inventory_items` |
| tracking | `mod_tracking` | `tracking_items` |
| oee | `mod_oee_records` | `oee_records` |
| delivery | `mod_deliveries` | `delivery_shipments` |
| performance | `mod_performance_entries` | `performance_entries` |
| quality | `mod_quality_inspections` | `quality_inspections` |
| fleet | `mod_fleet_trips` | `fleet_trips` |
| maintenance | `mod_maintenance_schedules` | `maintenance_schedules` |
| scheduling | `mod_capacity_entries` | `scheduling_capacity` |

### BUG-23 ⬜ JAVÍTVA — 2026-03-16

**Fájl:** `modules/inventory/components/DashboardPage.tsx` L48
**Fájl:** `modules/scheduling/components/DashboardPage.tsx` L53
**Reprodukció:** Inventory / Scheduling modul megnyitása ha az API üres választ ad → "Cannot read properties of undefined (reading 'map')"
**Probléma:** `json.items.map(...)` — ha a fetch hiba vagy az items mező undefined (hálózati hiba, auth hiba, üres válász), a `.map()` hívás crash-el.
**Javítás:** `(json.items ?? []).map(...)` — null coalescing, üres tömbből nem crash-el.

### BUG-24 🟡 NEM KÓD HIBA — Dokumentálva

**Probléma:** "A modulokban nem lehet adatokat felvinni" (workforce, stb.)
**Elemzés:** Ez NEM kód hiba. Az RBAC rendszer explicit jogosultság-kiosztást igényel. Az admin felhasználó (superadmin) minden jogosultsággal rendelkezik automatikusan. Más felhasználók számára az Admin Panel → Felhasználók → Jogosultságok menüben kell kiosztani a `modul.create`, `modul.edit` jogosultságokat.
**Teendő:** RBAC beállítási útmutatót készíteni a dokumentációba.

---

## ÖSSZEFOGLALÓ PRIORITÁSLISTA

| # | Kód | Leírás | Státusz |
|---|-----|--------|--------|
| 1 | BUG-04 | invoicing/digital-twin TIER_MODULES | ⬜ JAVÍTVA |
| 2 | BUG-01 | Dupla € landing page | ⬜ JAVÍTVA |
| 3 | BUG-12 | PDF generálás @react-pdf | ⬜ JAVÍTVA |
| 4 | PERF-01 | force-dynamic eltávolítás layout-ból | ⬜ JAVÍTVA |
| 5 | PERF-02 | Dupla session validálás | ⬜ JAVÍTVA |
| 6 | BUG-02 | Landing page render crash | ⬜ JAVÍTVA |
| 7 | BUG-03 | Nyelvváltás cache delay | ⬜ JAVÍTVA |
| 8 | BUG-05 | Szellemmodulok | ⬜ JAVÍTVA |
| 9 | BUG-06 | sap-import tier sync | ⬜ JAVÍTVA |
| 10 | BUG-07 | lac-napi-perces cleanup | ⬜ JAVÍTVA |
| 11 | BUG-08 | PDF hardcoded magyar | ⬜ JAVÍTVA |
| 12 | BUG-09 | Delivery Ft hardcoded | ⬜ JAVÍTVA |
| 13 | BUG-10 | Excel import hibák | ⬜ JAVÍTVA |
| 14 | BUG-11 | Hardcoded hu-HU locale | ⬜ JAVÍTVA |
| 15 | PERF-03 | Dupla DB pool | ⬜ JAVÍTVA |
| 16 | PERF-04 | NeuronBackground CPU | ⬜ JAVÍTVA |
| 17 | PERF-05 | getSetting bulk | ⬜ JAVÍTVA |
| 18 | BUG-18 | Pricing card villogás (whileInView) | ⬜ JAVÍTVA |
| 19 | BUG-19 | Landing CTA /setup → /login | ⬜ JAVÍTVA |
| 20 | BUG-20 | Nyelvváltás dupla klikk (5s cache) | ⬜ JAVÍTVA |
| 21 | BUG-21 | Error page angol → magyar | ⬜ JAVÍTVA |
| 22 | BUG-22 | Export táblanév eltérések (10 modul) | ⬜ JAVÍTVA |
| 23 | BUG-23 | Unsafe .map() crash (inventory/scheduling) | ⬜ JAVÍTVA |
| 24 | BUG-24 | RBAC jogosultság tájékoztató (NEM kód hiba) | 🟡 DOKUMENTÁLVA |

**Összes hiba javítva: 23/23 + 1 dokumentálva — 2026-03-16**

---

*Következő dokumentum: [03-EXPANSION_PLAN.md](./03-EXPANSION_PLAN.md) — Piacbővítési mesterterv*
