# ÉRTÉKESÍTÉS-ELŐKÉSZÍTÉS

> Utolsó frissítés: 2026.03.15

## Demo környezet
- ✅ `demo.ainovacloud.com` él (Vercel)
- ✅ Demo adatok seedel-ve (200 fős gyár, 30 nap adat)
- ✅ Auto-reset (24 óránként — Vercel Cron Job 03:00 UTC, CRON_SECRET)
- ✅ Demo mód implementálva (`DEMO_MODE=true` env var) — lásd [07-DEMO_MODE_STRATEGY.md](./07-DEMO_MODE_STRATEGY.md)
- ✅ Demo korlátozások: export/nyomtatás/törlés/admin letiltva, marketing üzenetek
- ✅ DemoBanner a dashboard tetején + ExportButton marketing popup
- ✅ Érthető magyar hibaüzenetek (API error i18n fordítás kliens oldalon)
- ⬜ Vercel env vars beállítása: `DEMO_MODE=true`, `NEXT_PUBLIC_DEMO_MODE=true`

## Demo fiókok

| Felhasználó | Jelszó | Szerep |
|-------------|--------|--------|
| `admin` | `Admin1234!` | admin |
| `manager_hu` | `Manager2025!` | manager |
| `manager_de` | `Manager2025!` | manager |
| `operator1` | `Operator2025!` | operator |
| `operator2` | `Operator2025!` | operator |
| `operator3` | `Operator2025!` | operator |

## Landing page
- ✅ Marketing szöveg kész (4 csomag: Starter / Basic / Professional / Enterprise)
- ✅ Árazás megjelenítés (€99/€299/€599/€1199 + add-on árak)
- ✅ CTA gombok (demo kérés, bejelentkezés)
- ✅ Többnyelvű (HU / EN / DE — I18nProvider + 50+ kulcs)
- ✅ Sector presets szekció (6 iparág)
- ⬜ Screenshotok / videó a modulokról
- ⬜ Testimonials / referenciák

## Dokumentáció vevőknek
- ⬜ Felhasználói kézikönyv (PDF)
- ⬜ Admin útmutató (OWNER_GUIDE.md részleges)
- ⬜ API dokumentáció (OpenAPI/Swagger)
- ⬜ Modul katalógus (feature lista csomagonként)

## Prezentációs anyag
- ⬜ Pitch deck (Google Slides / PowerPoint)
- ⬜ Feature összehasonlító tábla (ACI vs. versenytársak)
- ⬜ ROI kalkulátor draftok
