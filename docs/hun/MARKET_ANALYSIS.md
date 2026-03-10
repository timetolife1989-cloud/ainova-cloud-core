# Ainova Cloud Core — Piackutatás & Eladhatósági Elemzés

> Részletes elemzés a szoftver piaci pozíciójáról, versenytársakról, árképzésről és értékesítési stratégiáról.

---

## 1. PIACI ÁTTEKINTÉS

### 1.1 Globális MES/MOM Piac

A Manufacturing Execution System (MES) piac **2025-ben ~17 milliárd USD**, és évi **10-14% CAGR-rel növekszik** — 2030-ra eléri a **28-42 milliárd USD** értéket (forrás: Mordor Intelligence, Grand View Research, Fortune Business Insights).

**Fő növekedési motorok:**
- Industry 4.0 adoptáció
- Valós idejű termelési átláthatóság igénye
- KKV-k digitalizációja (eddig az enterprise szegmensben volt jellemző)
- SaaS modellek elterjedése → alacsonyabb belépési küszöb
- AI/ML integrációk (prediktív karbantartás, anomália detekció)

### 1.2 Magyar/KKE Piac

A magyar gyártási szektor sajátosságai:
- **~15,000 gyártó cég** Magyarországon (KSH adatok)
- Ebből ~3,000-5,000 aktívan keres digitalizációs megoldást
- A legtöbb KKV még **Excel-ben és papíron** vezeti a termelést
- Erős német ipari jelenlét (beszállítói lánc) → német nyelvű igény
- Pályázati lehetőségek (GINOP, Digitalizációs programok) → költségvetés elérhető

**Versenytársak a magyar piacon:**
| Szoftver | Típus | Ár/hó | Célpiac |
|----------|-------|-------|---------|
| AmTech MES | On-premise | Egyedi árazás | Nagyvállalat |
| LOGZI ERP | SaaS | ~50-200 EUR/hó | KKV |
| SAP Business One | ERP | 100-500 EUR/hó/user | KKV-közép |
| Microsoft Dynamics 365 | ERP | 70-200 EUR/hó/user | Közép-nagy |
| Odoo | Open-source ERP | 20-50 EUR/hó/user | KKV |
| Katana MRP | SaaS | 99-799 USD/hó | KKV gyártók |

### 1.3 Globális SaaS MES/MRP Versenytársak

| Szoftver | Erősség | Gyengeség | Ár |
|----------|---------|-----------|-----|
| **Katana** | Modern UI, könnyű használat | Limitált OEE, nincs magyar | $99-799/hó |
| **MRPeasy** | Teljes MRP, olcsó | Régi UI, lassú | $49-399/hó |
| **Fishbowl** | QuickBooks integráció | Csak US piac | $329/hó |
| **Plex (Rockwell)** | Erős MES, OEE | Drága, komplex | Egyedi |
| **IQMS/DELMIAworks** | Teljes MES | Nagyon drága | Egyedi |
| **Prodsmart** | Mobilbarát | Limitált | $69-499/hó |
| **SFactrix** | AI-based OEE | Indiai fejlesztés | Olcsó |

---

## 2. AZ AINOVA CLOUD CORE PIACI POZÍCIÓJA

### 2.1 Unique Selling Points (USP)

1. **Moduláris dobozos szoftver** — Nem ERP, nem MES, hanem pontosan az, amire a gyártó cégnek szüksége van. Nem kell megvenni egy hatalmas rendszert.

2. **Zero hardcode** — Teljes admin-szintű testreszabhatóság kód nélkül. Az ügyfél maga definiálja a mértékegységeit, importformátumait, jogosultságait.

3. **Magyar nyelv natívan** — A legtöbb versenytárs angol vagy csak gépi fordítással magyar. Mi natívan magyarok vagyunk.

4. **Tier-alapú licenszelés** — Basic csomag olcsó belépő, Enterprise csomag teljes funkcionalitás. Az ügyfél növekedhet.

5. **On-premise + Cloud** — Az ügyfél választhat: saját szerverre telepíti (GDPR, biztonság) vagy felhőben futtatja.

6. **Multi-DB** — MSSQL, PostgreSQL, SQLite támogatás → az ügyfél meglévő infrastruktúrájára telepíthető.

7. **Modern tech stack** — Next.js 16, React 19, TypeScript — nem legacy kód.

### 2.2 Célpiac Szegmentáció

| Szegmens | Méret | Igény | Csomag |
|----------|-------|-------|--------|
| **Mikro gyártó** (5-20 fő) | Létszám, jelenlét, Excel import | Basic | Basic |
| **Kis gyártó** (20-100 fő) | + Teljesítmény KPI, kapacitás | Közepes | Professional |
| **Közepes gyártó** (100-500 fő) | + OEE, műszak, minőség | Magas | Enterprise |
| **Beszállító** (német autóipar) | + 8D riport, karbantartás | Magas | Enterprise |

### 2.3 SWOT Analízis

| | Pozitív | Negatív |
|---|---------|---------|
| **Belső** | Moduláris, modern, magyar, testreszabható, alacsony belépési küszöb | Egyedüli fejlesztő, nincs értékesítési csapat, korlátozott marketing budget |
| **Külső** | Növekvő MES piac, KKV digitalizáció, pályázatok | Erős globális versenytársak, SAP/MS dominancia a közepes szegmensben, bizalomhiány ("ki fejlesztette?") |

---

## 3. ÁRKÉPZÉS

### 3.1 Javasolt Pricing Modell

**Egyszeri licenc + éves karbantartás** (on-premise) VAGY **havi előfizetés** (SaaS):

| Csomag | Egyszeri | Éves karbantartás | Havi SaaS | Max user |
|--------|----------|-------------------|-----------|----------|
| **Basic** | 300.000 Ft | 120.000 Ft/év | 29.900 Ft/hó | 10 |
| **Professional** | 600.000 Ft | 240.000 Ft/év | 59.900 Ft/hó | 50 |
| **Enterprise** | 1.200.000 Ft | 480.000 Ft/év | 119.900 Ft/hó | Korlátlan |

**Extra felhasználó:** +5.000 Ft/hó/fő (a csomag limiten felül)

**Telepítés & oktatás (opcionális):**
- Telepítés + konfiguráció: 150.000 Ft (egyszeri)
- Online oktatás (2 óra): 50.000 Ft
- Helyszíni oktatás (4 óra): 120.000 Ft

### 3.2 Versenytársakkal Összehasonlítva

A Basic csomag **29.900 Ft/hó** (~€80) versenyképes:
- Katana legolcsóbb terve $99/hó, de limitált
- MRPeasy $49/hó, de régi UI
- Odoo $20-50/user/hó, de 10 usernél már drágább
- SAP Business One $100+/user/hó — **sokkal drágább**

A mi előnyünk: **fix havi díj**, nem user-alapú (max limitig).

---

## 4. ÉRTÉKESÍTÉSI STRATÉGIA

### 4.1 Go-to-Market

**Fázis 1 — Proof of Concept (0-6 hó)**
- LAC (saját gyár) referencia használata
- 3-5 pilot ügyfél szerzése (kedvezményes áron vagy ingyenes Basic)
- Case study készítés
- LinkedIn tartalom marketing

**Fázis 2 — Launch (6-12 hó)**
- Weboldal + demo környezet (setup wizard-dal)
- Google Ads (célzott: "gyártásmenedzsment szoftver", "OEE szoftver")
- Iparági rendezvények (IPAR NAPJAI, Automatizálási szakkiállítás)
- Partner program (ERP tanácsadók, rendszerintegrátorok)

**Fázis 3 — Scale (12-24 hó)**
- Pályázati tanácsadókkal együttműködés (GINOP digitalizáció)
- Német/osztrák piacra lépés (DE nyelv már kész)
- Referencia ügyfél videók
- Affiliate program

### 4.2 Értékesítési Csatornák

1. **Direkt** — Weboldal → demo request → online bemutató → pilot → szerződés
2. **Partner** — ERP tanácsadók, akik a mi rendszert ajánlják MES kiegészítőként
3. **Pályázati** — Digitalizációs pályázatok, ahol a mi szoftver az eszköz
4. **Referencia** — Elégedett ügyfél ajánlás (leghatékonyabb, 0 költség)

### 4.3 Lead Generálás

- **Content marketing:** Blog cikkek ("Mi az OEE és miért fontos?", "5 jel, hogy szüksége van gyártásmenedzsment szoftverre")
- **Free trial:** 30 napos ingyenes próba (Basic csomag, korlátlan)
- **Demo videó:** 5 perces walkthrough YouTube-on
- **LinkedIn:** Iparági döntéshozók elérése célzott tartalommal

---

## 5. HASZNÁLHATÓSÁGI ELEMZÉS

### 5.1 Erősségek

- **Intuitív UI** — Modern, dark theme, kártya alapú layout, responsive
- **Zero config** — Setup wizard végigvezet a konfiguráción
- **Modul be/ki** — Nem kell bonyolult menürendszert kezelni, csak amit használ
- **Import pipeline** — Excel/CSV import, admin konfigurálható mapping
- **i18n** — Magyar nyelv natívan, de globálisan értékesíthető

### 5.2 Fejlesztendő Területek

| Terület | Jelenlegi | Javasolt |
|---------|-----------|---------|
| Mobilbarátság | Responsive, de nem dedikált | PWA vagy React Native app |
| Offline mód | Nincs | Service Worker + local storage |
| Real-time | Polling alapú | WebSocket / Server-Sent Events |
| Dashboardok | Alapszintű kártyák | Drag-and-drop dashboard builder |
| Export | Nincs dedikált | PDF riport, Excel export |
| Keresés | Modulonkénti | Globális fulltext search |
| Notification | DB-based | Push notification (web + mobil) |

### 5.3 UX Kutatás — Iparági Trendek

A gyártási szoftverek UX trendjei 2025-2026-ban:
1. **Low-code/No-code** — Felhasználók maguk építenek workflow-kat
2. **AI asszisztens** — Természetes nyelvű kérdések ("Mennyi volt a múlt heti OEE?")
3. **Digital Twin** — Vizuális gyártósor ábrázolás
4. **Mobile-first** — Tablet/telefon a gyártósoron
5. **Dark mode** — ✅ Már implementálva
6. **Real-time alerting** — Azonnali értesítés küszöbérték átlépésnél

---

## 6. JOGI & COMPLIANCE

### 6.1 GDPR

- Személyes adatok: felhasználónevek, nevek, email címek
- Adatfeldolgozási megállapodás (DPA) szükséges SaaS modellnél
- On-premise: az ügyfél felelős (mi csak szoftvert szállítunk)
- Audit napló: minden bejelentkezés és művelet naplózva

### 6.2 Licencelés

- Saját licenc modell (nem open-source)
- EULA szükséges (End User License Agreement)
- Karbantartási szerződés sablon
- Adatmentési és visszaállítási policy

---

## 7. ÖSSZEFOGLALÓ & AJÁNLÁS

### A szoftver eladható, ha:

1. ✅ **Probléma van** — Gyártók 70%-a Excel-ben és papíron vezeti a termelést
2. ✅ **Ár versenyképes** — A Basic csomag olcsóbb, mint bármely MES
3. ✅ **Differenciáció** — Moduláris + magyar + testreszabható + on-premise opció
4. ✅ **Piac növekszik** — MES piac évi 10-14% növekedés
5. ⚠️ **Referencia kell** — Az első 3-5 ügyfél a kritikus (trust building)
6. ⚠️ **Marketing kell** — Nincs értéke, ha senki nem tud róla
7. ⚠️ **Support kell** — Az ügyfelek elvárják a segítséget

### Prioritási sorrend:

1. LAC-nál tesztelni élesben (saját referencia)
2. 3 pilot ügyfelet szerezni (hálózat, ismerős gyárak)
3. Weboldal + demo környezet létrehozni
4. Első pályázati tanácsadóval kapcsolat
5. Content marketing elindítása (LinkedIn + blog)
