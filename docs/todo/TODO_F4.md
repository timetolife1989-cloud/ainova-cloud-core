# F4 — i18n TÖBBNYELVŰSÉG

> **Cél:** A rendszer többnyelvű legyen. Minimum: HU, EN, DE. Admin panelből váltható nyelv.
> **Előfeltétel:** F0-F3 kész
> **Időbecslés:** 1.5 hét

---

## F4.1 — core_translations tábla migráció

**Fájl:** `database/core/010_core_translations.sql` (ÚJ fájl)

```sql
-- Migration 010: core_translations tábla

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_translations'
)
  CREATE TABLE core_translations (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    translation_key   NVARCHAR(200) NOT NULL,
    locale            NVARCHAR(10)  NOT NULL,    -- 'hu', 'en', 'de'
    translation_value NVARCHAR(MAX) NOT NULL,
    updated_at        DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_translations_key_locale' AND object_id = OBJECT_ID('dbo.core_translations'))
  ALTER TABLE core_translations ADD CONSTRAINT UQ_translations_key_locale UNIQUE (translation_key, locale);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_translations_locale' AND object_id = OBJECT_ID('dbo.core_translations'))
  CREATE INDEX idx_translations_locale ON core_translations(locale);
GO
```

**Megjegyzés:** A táblát NEM töltjük fel default adatokkal a migrációban. A fallback JSON fájlok szolgálnak alapértelmezettként.

---

## F4.2 — app_locale setting hozzáadása

**Fájl:** `database/core/011_core_settings_locale.sql` (ÚJ fájl)

```sql
IF NOT EXISTS (SELECT 1 FROM core_settings WHERE setting_key = 'app_locale')
  INSERT INTO core_settings (setting_key, setting_value, setting_type, description)
  VALUES ('app_locale', 'hu', 'string', 'Application locale (hu, en, de)');
GO
```

---

## F4.3 — Fallback JSON fájlok

**Fájl:** `lib/i18n/fallback/hu.json` (ÚJ fájl)

**Tartalom:** Összes UI szöveg magyarul. **Minimum 50+ kulcs.** Struktúra:

```json
{
  "auth.login": "Bejelentkezés",
  "auth.logout": "Kilépés",
  "auth.username": "Felhasználónév",
  "auth.password": "Jelszó",
  "auth.login_button": "Bejelentkezés",
  "auth.login_success": "Sikeres belépés!",
  "auth.login_failed": "Hibás felhasználónév vagy jelszó",
  "auth.rate_limited": "Túl sok sikertelen kísérlet. Próbáld újra 15 perc múlva.",
  "auth.account_disabled": "A fiók le van tiltva.",
  "auth.server_error": "Szerverhiba. Kérjük, próbáld újra.",
  "auth.change_password": "Jelszó módosítás",
  "auth.first_login_notice": "Első bejelentkezéskor kötelező jelszót változtatni.",
  "auth.session_expired": "A munkamenet lejárt. Jelentkezz be újra.",

  "dashboard.title": "Vezérlőpult",
  "dashboard.welcome": "Üdv, {name}!",
  "dashboard.no_modules": "Nincsenek aktív modulok.",
  "dashboard.no_modules_admin": "Menj az Admin panelbe és kapcsolj be modulokat.",
  "dashboard.no_modules_user": "Kérj hozzáférést a rendszergazdától.",

  "admin.title": "Admin Panel",
  "admin.subtitle": "Rendszergazdai beállítások és felügyelet",
  "admin.users": "Felhasználók",
  "admin.users_desc": "Fiókok kezelése, szerepkörök, jelszó visszaállítás",
  "admin.modules": "Modulok",
  "admin.modules_desc": "Modulok be- és kikapcsolása, függőség-ellenőrzés",
  "admin.settings": "Branding & Beállítások",
  "admin.settings_desc": "Cégnév, szín, logó, általános konfiguráció",
  "admin.diagnostics": "Diagnosztika",
  "admin.diagnostics_desc": "DB kapcsolat, uptime, aktív munkamenetek",
  "admin.audit_log": "Audit Napló",
  "admin.audit_log_desc": "Bejelentkezések, admin műveletek, eseménylista",
  "admin.license": "Licenc",
  "admin.license_desc": "Csomag szint, engedélyezett modulok, lejárat",
  "admin.roles": "Szerepkörök & Jogok",
  "admin.roles_desc": "Szerepkörök kezelése, jogosultság mátrix",
  "admin.units": "Mértékegységek",
  "admin.units_desc": "Mértékegységek kezelése (perc, darab, kg, egyedi)",
  "admin.locale": "Nyelv & Formátumok",
  "admin.locale_desc": "Nyelv, dátum formátum, pénznem",

  "common.save": "Mentés",
  "common.cancel": "Mégse",
  "common.delete": "Törlés",
  "common.edit": "Szerkesztés",
  "common.create": "Létrehozás",
  "common.search": "Keresés...",
  "common.loading": "Betöltés...",
  "common.error": "Hiba történt",
  "common.success": "Sikeres",
  "common.confirm_delete": "Biztosan törölni szeretnéd?",
  "common.yes": "Igen",
  "common.no": "Nem",
  "common.back": "Vissza",
  "common.refresh": "Frissítés",
  "common.export": "Export",
  "common.import": "Import",
  "common.filter": "Szűrés",
  "common.all": "Összes",
  "common.active": "Aktív",
  "common.inactive": "Inaktív",
  "common.actions": "Műveletek",
  "common.no_data": "Nincs adat",

  "error.forbidden": "Nincs jogosultság",
  "error.not_found": "Nem található",
  "error.server": "Szerverhiba történt",
  "error.network": "Hálózati hiba",
  "error.db": "Adatbázis hiba történt",
  "error.csrf_invalid": "Érvénytelen CSRF token",
  "error.validation": "Érvénytelen adatok",

  "license.basic": "Basic",
  "license.professional": "Professional",
  "license.enterprise": "Enterprise",
  "license.expired": "A licenc lejárt",
  "license.module_not_allowed": "Ez a modul nem elérhető a jelenlegi licenccsomagban.",
  "license.user_limit": "Elérte a maximális felhasználó számot.",
  "license.lifetime": "Korlátlan",

  "time.now": "Most",
  "time.minutes_ago": "{n} perce",
  "time.hours_ago": "{n} órája",
  "time.days_ago": "{n} napja"
}
```

**Fájl:** `lib/i18n/fallback/en.json` (ÚJ fájl)

Ugyanez a struktúra angol szövegekkel:
```json
{
  "auth.login": "Login",
  "auth.logout": "Logout",
  "auth.username": "Username",
  "auth.password": "Password",
  "auth.login_button": "Sign in",
  "auth.login_success": "Login successful!",
  "auth.login_failed": "Invalid username or password",
  ...
}
```

**Fontos:** Minden kulcsot ki kell tölteni angolul is. Ne maradjon üres érték.

---

## F4.4 — i18n service: `lib/i18n/index.ts`

**Fájl:** `lib/i18n/index.ts` (ÚJ fájl)

**Funkcionalitás:**

1. `getLocale(): Promise<string>` — lekéri az `app_locale` setting-et, fallback: `'hu'`
2. `t(key: string, params?: Record<string, string>): Promise<string>` — fordítás lekérése:
   - Először DB (core_translations tábla, cache-elt)
   - Ha nincs DB-ben: JSON fallback (az aktuális locale-hoz)
   - Ha nincs fallback-ben sem: magyar fallback (`hu.json`)
   - Ha sehol sincs: visszaadja a kulcsot magát
   - Paraméter behelyettesítés: `{name}` → érték
3. `getTranslationsForLocale(locale: string): Promise<Record<string, string>>` — belső, cache-elt
4. `clearTranslationCache(): void` — cache ürítés

**Cache:** `Map<string, Record<string, string>>` — locale → kulcs→érték, 10 perces TTL.

**DB query:**
```sql
SELECT translation_key, translation_value FROM core_translations WHERE locale = @locale
```

**Fontos:** A `tsconfig.json`-ban legyen:
```json
"resolveJsonModule": true,
"esModuleInterop": true
```

---

## F4.5 — Kliens-oldali i18n hook: `hooks/useTranslation.ts`

**Fájl:** `hooks/useTranslation.ts` (ÚJ fájl)

**Funkcionalitás:**
A szerver-oldali `t()` async — kliens-oldalon kell egy hook.

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';

interface Translations {
  [key: string]: string;
}

let _clientCache: Translations | null = null;

export function useTranslation() {
  const [translations, setTranslations] = useState<Translations>(_clientCache ?? {});
  const [locale, setLocale] = useState<string>('hu');

  useEffect(() => {
    if (_clientCache) return;
    fetch('/api/i18n')
      .then(res => res.json())
      .then((data: { locale: string; translations: Translations }) => {
        _clientCache = data.translations;
        setTranslations(data.translations);
        setLocale(data.locale);
      })
      .catch(() => {});
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let value = translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return value;
  }, [translations]);

  return { t, locale };
}
```

---

## F4.6 — i18n API endpoint: `app/api/i18n/route.ts`

**Fájl:** `app/api/i18n/route.ts` (ÚJ fájl)

**GET /api/i18n** — visszaadja az aktuális locale + összes fordítást (DB + fallback merge)

```typescript
import { getLocale } from '@/lib/i18n';
// ... merge DB translations + fallback JSON
// Válasz: { locale: 'hu', translations: { "auth.login": "Bejelentkezés", ... } }
```

Ez a kliens-oldali hook számára van. Egy request-tel letölti az összes szöveget, a kliens cache-eli.

---

## F4.7 — Locale admin oldal

**Fájl:** `app/dashboard/admin/locale/page.tsx` (ÚJ fájl)

**Felépítés:**
1. **Nyelv választó:** 3 nagy gomb/kártya: 🇭🇺 Magyar / 🇬🇧 English / 🇩🇪 Deutsch
   - Az aktív zöld kerettel
   - Kattintásra: `PUT /api/admin/settings { key: 'app_locale', value: 'en' }`
2. **Előnézet panel:** Pár példa szöveg a kiválasztott nyelven (pl. "Bejelentkezés", "Vezérlőpult", "Mentés")
3. **(Opcionális, későbbi fázis):** Egyedi fordítások szerkesztése — kulcs-érték pár lista, keresővel

---

## F4.8 — Locale menüpont az admin panelen

**Fájl:** `app/dashboard/admin/page.tsx`

Az `ADMIN_MENU` tömbbe:
```typescript
{
  title: 'Nyelv & Formátumok',
  description: 'Nyelv, dátum formátum beállítások',
  icon: 'Globe',
  href: '/dashboard/admin/locale',
},
```

---

## F4.9 — `app/layout.tsx` lang attribútum dinamikussá tétele

**Fájl:** `app/layout.tsx`

**Jelenlegi (16. sor):** `<html lang="hu">`

**Cseréld erre:**
```typescript
import { getLocale } from '@/lib/i18n';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      ...
    </html>
  );
}
```

---

## F4.10 — Header.tsx: magyar napok → Intl.DateTimeFormat

**Fájl:** `components/core/Header.tsx`

**Jelenlegi (13. sor):**
```typescript
const HU_DAYS = ['vasárnap', 'hétfő', ...] as const;
```

**Cseréld erre:**
```typescript
// A napot az Intl.DateTimeFormat adja a rendszer locale-ja szerint
function getDayName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}
```

A `locale`-t prop-ként kapja a Header (a dashboard layout-ból), vagy a `useTranslation()` hook-ból.

---

## F4.11 — Fokozatos magyar hardcode szöveg csere

**Ez NEM egyszeri feladat — folyamatos refaktor.** Az F4 keretében legalább a következőket cseréld ki:

| Fájl | Jelenlegi hardcode | i18n kulcs |
|---|---|---|
| `lib/error-handler.ts:26` | `'Adatbázis hiba történt'` | `await t('error.db')` |
| `lib/error-handler.ts:31` | `'Adatbázis hiba történt'` | `await t('error.db')` |
| `lib/error-handler.ts:40` | `'Hálózati hiba történt'` | `await t('error.network')` |
| `lib/error-handler.ts:49` | `'Fájl hozzáférési hiba történt'` | `await t('error.file')` |
| `lib/error-handler.ts:58` | `'Váratlan hiba történt'` | `await t('error.server')` |
| `lib/api-utils.ts:98` | `'Nincs bejelentkezve'` | `await t('auth.session_expired')` |
| `lib/api-utils.ts:99` | `'Érvénytelen munkamenet'` | `await t('auth.session_expired')` |
| `lib/api-utils.ts:100` | `'Nincs jogosultság'` | `await t('error.forbidden')` |
| `lib/api-utils.ts:107` | `'Szerver hiba történt'` | `await t('error.server')` |
| `components/login/LoginContainer.tsx:11-15` | `ERROR_MESSAGES` objektum | `useTranslation()` hook |
| `app/dashboard/page.tsx:27-36` | Magyar szövegek | `t()` |
| `app/dashboard/admin/page.tsx` | ADMIN_MENU title/description | `t()` |

**Fontos:** Az API response-okban az `error` mező szinkron kell legyen. Két megoldás:
1. Maradjon a magyar szöveg (a frontend úgyis a saját locale-ja szerint jeleníti meg)
2. Vagy az API error kódot ad vissza (pl. `"error_code": "auth.session_expired"`), a frontend fordítja le

**Ajánlás:** Az API error kódokat használd (opció 2), és a frontend a `useTranslation().t()` hook-kal fordítja.

---

## F4.12 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 010, 011 hiba nélkül lefut
2. `npm run type-check` — 0 hiba
3. Admin → Locale oldal: nyelv választó megjelenik, 3 nyelv (HU/EN/DE)
4. Nyelv váltás EN-re → a UI szövegek (legalább a fallback JSON-ből) angolra váltanak
5. `app/layout.tsx` `<html lang=...>` attribútum a kiválasztott nyelvet mutatja
6. Header-ben a napnév a kiválasztott locale szerint jelenik meg
