# UI / UX JAVÍTÁSOK

> Utolsó frissítés: 2026.03.15

## Dashboard
- ✅ Nyelvváltó: I18nProvider + SW cache fix (1 klikk váltás)
- ✅ Modul tile-ok: ikon renderelés (MenuTile CSS-only optimalizálás)
- ✅ Mobile responsive: Header responsive (logo+avatar+lang+logout mobilon)
- ✅ Loading grid: 5 modul loading grid optimalizálva
- ✅ CommandPalette: Ctrl+K keresés (lazy loaded)
- ⬜ Sötét/világos téma váltás (jelenleg: csak dark)

## Login oldal
- ✅ Branding: "AINOVA CLOUD INTELLIGENCE"
- ✅ Glow effekt + ripple button
- ⬜ "Elfelejtett jelszó" flow (email alapú) — SMTP konfig szükséges
- ⬜ "Jegyezd meg" checkbox

## Admin panel
- ⬜ User szerkesztő: jelszó erősség jelző
- ⬜ Bulk user import (CSV)
- ⬜ Modul dependency vizualizáció (gráf)

## Általános
- ✅ Loading skeleton-ok (dashboard loading.tsx kész)
- ✅ Error boundary (app/error.tsx kész)
- ✅ Inaktivitás érzékelés (25p figyelmeztetés, 30p auto-kijelentkezés)
- ✅ Dátum input dark theme CSS (color-scheme: dark)
- ⬜ 404 oldal testreszabás (jelenleg: Next.js default)
