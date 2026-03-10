# Ainova Cloud Core — Fejlesztési TODO

> **Referencia:** `BLUEPRINT.md` — teljes architektúra terv
> **Szabály:** Minden pont EGYENKÉNT végrehajtandó, sorrendben. Egy pont = egy commit.
> **Fontos:** Ha egy pont nem egyértelmű, olvasd el a BLUEPRINT.md megfelelő fejezetét.
> **Üzleti modell:** A vevő csomagot vásárol (Basic/Pro/Enterprise). Csak a megvásárolt modulokat és feature-öket éri el. Plusz modul = feláras. A szoftverfejlesztő (TE) továbbra is szükséges egyedi fejlesztésekhez, integrációkhoz.

---

## ÖSSZEFOGLALÓ (Rövid lista)

- **F0** — LAC-specifikus kód szeparálás a core-ból
- **F1** — Licenc & Tier rendszer (mit lát a vevő, mit nem)
- **F2** — Role & Permission rendszer (DB-driven, admin UI)
- **F3** — Unit System (univerzális mértékegységek)
- **F4** — i18n többnyelvűség (HU/EN/DE)
- **F5** — Modul rendszer véglegesítés (manifest, loader, dinamikus routing)
- **F6** — Generikus Import Pipeline (column mapper, admin UI)
- **F7** — Admin Panel bővítés (összes új admin oldal)
- **F8** — Basic csomag modulok (workforce, tracking, fleet, file-import, reports)
- **F9** — Multi-DB support (PostgreSQL, SQLite adapter)
- **F10** — Multi-Auth support (JWT, OAuth adapter)
- **F11** — Setup Wizard (első indítás konfigurátor)
- **F12** — Professional csomag modulok
- **F13** — Enterprise csomag modulok
- **F14** — Docker, dokumentáció, piacra vitel

---

A részletes kibontás fázisonként külön fájlokban található:
- `TODO_F0.md` — LAC szeparálás
- `TODO_F1.md` — Licenc rendszer
- `TODO_F2.md` — Role & Permission
- `TODO_F3.md` — Unit System
- `TODO_F4.md` — i18n
- `TODO_F5.md` — Modul rendszer
- `TODO_F6.md` — Import Pipeline
- `TODO_F7.md` — Admin Panel
- `TODO_F8.md` — Basic modulok
- `TODO_F9_F14.md` — Multi-DB, Multi-Auth, Setup Wizard, Pro/Enterprise modulok, Piacra vitel
