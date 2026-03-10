# GitHub Repo Cleanup — Lovable Nyomok Eltávolítása

## ⚠️ NE KLÓNOZD ÚJRA A REPÓT
A repo Cloudflare-hez van kötve → maradjon ugyanaz a repo, csak tisztítsd meg.

---

## 1. README.md Átírása (1 perc)

A `design-collaborator-hub` repo README.md fájlját írd át erre:

```markdown
# Ainova Cloud — Website

Marketing website for Ainova Cloud Core manufacturing management platform.

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS

## Deployment
Deployed via Cloudflare Pages to [ainovacloud.com](https://ainovacloud.com)

## License
Proprietary — All rights reserved
```

---

## 2. Git History Tisztítás (OPCIONÁLIS — csak ha nagyon zavar)

Ha a commit history-ban lévő "lovable-dev[bot]" commit-ok zavarnak:

```bash
# VIGYÁZAT: Ez törli a teljes history-t és újrakezdi
git checkout --orphan new-main
git add -A
git commit -m "Initial commit - Ainova Cloud Website"
git branch -D main
git branch -m main
git push -f origin main
```

⚠️ **Ez törli az összes korábbi commit-ot!** Csak akkor csináld, ha biztosan akarod.

---

## 3. Repo Átnevezés (30 másodperc)

GitHub-on:
1. Menj a repo Settings-be
2. **Repository name** → `ainova-cloud-website`
3. Kattints **Rename**

✅ **A Cloudflare automatikusan követi az átnevezést** — nem kell semmit átállítani!

---

## 4. Repo Visibility (opcionális)

Ha nem akarod hogy mások lássák:
- Settings → Danger Zone → **Change visibility** → **Make private**

---

## 5. Fájlok Ellenőrzése a Weboldalon

A `design-collaborator-hub` repóban (weboldal kódja):

### Keresendő szavak:
- `lovable`
- `Lovable`
- `template`
- `LAC`
- `napi perces`
- `munkaterv`

### Cserélendő:
- Minden LAC-specifikus tartalom → generikus gyártási tartalom
- Magyar szövegek → angol (ha van)

---

## ✅ Gyors Checklist (5 perc alatt)

- [ ] README.md átírva
- [ ] Repo átnevezve `ainova-cloud-website`-re
- [ ] Weboldal kódban nincs "Lovable" vagy "LAC" szöveg
- [ ] Cloudflare Pages továbbra is működik (automatikus)

---

**Megjegyzés:** A Cloudflare Pages automatikusan követi a GitHub repo átnevezését — **nem kell semmit átállítani** a Cloudflare-ben!
