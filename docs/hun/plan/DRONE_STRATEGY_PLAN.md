# AINOVA Drón Stratégia — Végleges Terv

> **Készítette:** Cascade AI (2026-03-13)
> **Alapja:** DRONE_STRATEGY_QUESTIONS.md válaszai
> **Státusz:** VÉGLEGES — Végrehajtásra kész

---

## 0. BRUTÁLISAN ŐSZINTE HELYZETÉRTÉKELÉS

Mielőtt bármit csinálunk, nézzük meg hol állunk valójában:

### Amink van:
- Egy **jó architektúrájú, de befejezetlen** Next.js projekt (ACI)
- **$16-25 RunPod kredit** (= max 4-6 óra GPU idő)
- **2x RTX PRO 6000** (192GB VRAM) — brutális erő, de rövid időre
- **Supabase** free tier (DB + auth + storage)
- **Vercel** (frontend hosting)
- **GitHub** repo
- **Cascade/Windsurf** AI asszisztens (TE — a fő fejlesztő motor)
- Egy ember aki termelési részlegvezető és AI-val fejleszt
- Bryan (brand marketing, kezdő, tanuló fázis)

### Amink nincs:
- OpenAI API kulcs (és nem is akarunk külső AI függőséget)
- Saját GPU a lokális gépen
- Programozói tapasztalat (AI-val dolgozol)
- Fizető ügyfél
- Kész, stabil termék
- Pénz sok mindenre

### A kemény igazság:
> **A drónok kiküldése ELŐTT az ACI-nak működnie kell.** Ha a drónok visszahoznak tökéletes adatot, de a platform lassú, a nyelvváltás szar és a design kritikán aluli — akkor az adat hiába van meg, nincs hova tenni.
>
> **DE** — a drónok pont ebben is tudnak segíteni: technológiai kutatással, kód mintákkal, architektúra javaslatokkal.

---

## 1. A TERV FILOZÓFIÁJA

### "Kettős Haszon" megközelítés

A drónokat nem CSAK adatgyűjtésre küldjük. Minden drón feladatnak **két kimenete** van:

1. **Azonnali haszon** — pl. kód minta amit holnap be tudunk építeni
2. **Stratégiai haszon** — pl. versenytárs feature lista amit 3 hónap múlva használunk

### Prioritási sorrend (a válaszaid alapján):

```
1. ACI STABILIZÁLÁS    → lassúság, nyelvkezelés, design (MOST, Cascade-del)
2. TECHNOLÓGIAI KUTATÁS → kód minták, best practice (RunPod drón)
3. IPARÁGI ADATGYŰJTÉS  → OEE, KPI, szabványok (RunPod drón)
4. VERSENYTÁRS ELEMZÉS  → feature gap, pricing (RunPod drón)
5. AI/ML MODELLEK       → prediktív, anomália (KÉSŐBBI RunPod session)
6. FINE-TUNED MODELL    → beépített Ainova AI (KÉSŐBBI fázis)
```

> **Fontos felismerés:** Az 1. pont (ACI stabilizálás) NEM a drónok feladata — azt MOST, ebben a Cascade session-ben kell csinálnunk. A drónok a 2-4. pontokat fedik le.

---

## 2. MIT CSINÁLUNK MA — KÉT PÁRHUZAMOS SZÁL

### SZÁL A: RunPod Drón Session (~4 óra, ~$15)
### SZÁL B: ACI Stabilizálás (Cascade, párhuzamosan, ingyen)

```
IDŐEGYENES:

Óra 0-1: [RunPod] Setup + modell indítás
          [Cascade] ACI nyelvkezelés fix (i18n performance)

Óra 1-2: [RunPod] Drón 1: Tech kutató — Next.js performance, i18n pattern-ek
          [Cascade] ACI design javítások (Tailwind, modern UI)

Óra 2-3: [RunPod] Drón 2: Iparági adat — OEE, KPI, ISA-95
          [Cascade] ACI eredmények integrálása ahogy jönnek

Óra 3-4: [RunPod] Drón 3: Versenytárs elemzés + eredmények mentése
          [Cascade] Összesítés, következő lépések

Óra 4:   [RunPod] LEÁLLÍTÁS — adatok Supabase-re + Git push
```

---

## 3. RUNPOD SESSION — RÉSZLETES FORGATÓKÖNYV

### 3.1 Előkészítés (MOST, RunPod indítás előtt)

A RunPod indítása előtt **mindent előkészítünk** hogy egy percet se vesztegessünk:

#### A. Supabase előkészítés
Új táblák kellenek az eredményeknek:

```sql
-- drone_results tábla a Supabase-ben
CREATE TABLE drone_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  drone_type TEXT NOT NULL,          -- 'tech_research', 'industry_data', 'competitor'
  category TEXT NOT NULL,            -- pl. 'nextjs_performance', 'oee_benchmarks'
  title TEXT NOT NULL,
  content JSONB NOT NULL,            -- strukturált adat
  summary TEXT,                      -- ember-olvasható összefoglaló
  source_url TEXT,                   -- forrás URL
  relevance_score FLOAT,            -- 0-1 mennyire releváns az ACI-nak
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- drone_sessions tábla
CREATE TABLE drone_sessions (
  id TEXT PRIMARY KEY,               -- pl. 'session_2026-03-13'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  model_used TEXT,
  total_results INTEGER DEFAULT 0,
  cost_usd FLOAT,
  status TEXT DEFAULT 'running'      -- 'running', 'completed', 'failed'
);
```

#### B. RunPod setup script (előre megírjuk)
Ez a script fut le ELSŐKÉNT a RunPod-on:

```bash
#!/bin/bash
# setup.sh — RunPod első indításkor

# 1. Alapok
pip install vllm supabase-py requests beautifulsoup4 trafilatura \
  playwright aiohttp pydantic rich --quiet

# 2. Playwright böngészők (headless scraping)
playwright install chromium

# 3. vLLM szerver indítás háttérben
# Llama 3.1 70B — legjobb ár/érték általános feladatokra
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --tensor-parallel-size 2 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.85 \
  --port 8000 &

# 4. Várakozás amíg a modell betöltődik (~5-10 perc)
echo "Modell töltés... (5-10 perc)"
while ! curl -s http://localhost:8000/health > /dev/null 2>&1; do
  sleep 10
  echo "Még tölt..."
done
echo "KÉSZ! Modell elérhető: http://localhost:8000"
```

### 3.2 Modell választás indoklás

**Llama 3.1 70B Instruct** — EZ a legjobb választás, mert:

| Szempont | Llama 3.1 70B | Alternatívák |
|----------|---------------|--------------|
| Általános minőség | ★★★★★ | Mixtral: ★★★★ |
| Kód generálás | ★★★★☆ | DeepSeek: ★★★★★ (de csak kód) |
| Kutatás/elemzés | ★★★★★ | Qwen: ★★★★☆ |
| Angol nyelv | ★★★★★ | Mind jó angolul |
| 2 GPU-n futtatás | ★★★★★ | Mixtral 8x22B: túl nagy |
| VRAM igény | ~45GB (bőven fér) | - |
| Licenc | Permissive (kereskedelmi) | DeepSeek: kérdéses |

**Alternatíva ha gyorsabb kell:** Llama 3.1 8B — kisebb, gyorsabb, 1 GPU elég, de butább.

**Stratégia:** 70B-vel indítunk. Ha lassú → 8B-re váltunk a kevésbé fontos feladatokhoz.

### 3.3 A Három Drón — Részletes Feladat

---

#### DRÓN 1: Technológiai Kutató ("Tech Scout")

**Idő:** ~60 perc
**Cél:** Azonnali, beépíthető megoldások az ACI problémáira

**Feladatok (prioritás sorrendben):**

1. **Next.js i18n performance** — Hogyan csináljuk hogy a nyelvváltás AZONNALI legyen?
   - Keresés: "next.js 14 15 16 i18n without page reload", "react i18n client side instant switch"
   - Forrás: GitHub repos, next-intl, react-i18next implementációk
   - **Output:** 3-5 konkrét kód minta ami megoldja a lassú nyelvváltást

2. **Next.js App Router performance** — Miért lassú az ACI?
   - Keresés: "next.js app router slow", "react server components performance", "next.js bundle size optimization"
   - Forrás: Vercel blog, GitHub issues, Stack Overflow
   - **Output:** Performance checklist + konkrét fix-ek listája

3. **Modern MES/Manufacturing UI design** — Hogyan nézzen ki egy pro manufacturing dashboard?
   - Keresés: "manufacturing dashboard UI", "MES software interface design", "industrial SaaS dashboard"
   - Forrás: Dribbble, Behance, versenytárs screenshotok
   - **Output:** UI/UX javaslatok, color palette, layout pattern-ek

4. **Multi-tenant SaaS architektúra** — Legjobb gyakorlat Next.js-ben
   - Keresés: "multi-tenant next.js", "row level security supabase", "tenant isolation pattern"
   - **Output:** Architektúra javaslat az ACI-hoz

5. **PLC kommunikáció valódi implementáció**
   - Keresés: "node.js S7 protocol", "modbus tcp javascript", "opc-ua node.js client"
   - Forrás: GitHub repos (node-snap7, node-opcua, modbus-serial)
   - **Output:** Működő kód minták a driver stub-ok helyett

**Elvárt output formátum:**
```json
{
  "drone_type": "tech_research",
  "category": "nextjs_i18n_performance",
  "title": "Instant language switching in Next.js — 5 approaches",
  "content": {
    "problem": "...",
    "solutions": [
      {
        "approach": "Client-side dictionary preloading",
        "code_snippet": "...",
        "pros": ["instant", "no server round-trip"],
        "cons": ["larger initial bundle"],
        "source_url": "...",
        "applicability_to_aci": "HIGH — directly solves the slow language switch"
      }
    ],
    "recommendation": "..."
  },
  "summary": "5 módszer a nyelvváltás gyorsítására...",
  "relevance_score": 0.95
}
```

---

#### DRÓN 2: Iparági Adat Gyűjtő ("Industry Scout")

**Idő:** ~60 perc
**Cél:** Az ACI-ba beépíthető iparági tudásbázis

**Feladatok:**

1. **OEE benchmark adatok** — Iparág-specifikus átlagok
   - Autóipar, elektronika, élelmiszer, gyógyszer, fém/műanyag
   - World-class OEE, átlagos OEE, minimális OEE szektoronként
   - **Output:** Strukturált JSON táblázat

2. **Termelési KPI katalógus**
   - MTBF, MTTR, FPY (First Pass Yield), Cycle Time, Takt Time
   - Definíciók, képletek, iparági benchmark értékek
   - **Output:** Teljes KPI adatbázis JSON-ban

3. **ISA-95 / MESA modell összefoglaló**
   - A gyártási szintek (Level 0-4) leírása
   - Melyik szinten van az ACI és hova akar eljutni
   - **Output:** Strukturált modell leírás + ACI pozícionálás

4. **Magyar és EU jogszabályok gyártáshoz**
   - Munkaidő törvény, bérszámfejtési szabályok
   - ISO 9001, IATF 16949 (autóipar) követelmények
   - GDPR a gyártási adatokra
   - **Output:** Jogszabály összefoglaló + compliance checklist

5. **Gyártási termelési típusok taxonómiája**
   - Kézi gyártás, félautomata, full automata
   - Perc-alapú vs darab-alapú teljesítménymérés
   - Batch vs folyamatos gyártás
   - **Output:** Kategória rendszer amit az ACI modul rendszerébe be lehet építeni

**Elvárt output:**
```json
{
  "drone_type": "industry_data",
  "category": "oee_benchmarks",
  "title": "OEE benchmarks by industry sector (2024-2025)",
  "content": {
    "sectors": [
      {
        "name": "Automotive",
        "world_class_oee": 85,
        "average_oee": 60,
        "availability_avg": 90,
        "performance_avg": 80,
        "quality_avg": 99,
        "source": "MESA International 2024"
      }
    ]
  }
}
```

---

#### DRÓN 3: Versenytárs Elemző ("Competitor Scout")

**Idő:** ~60 perc
**Cél:** Tudni kik vagyunk, kik ők, és hol a rés

**Feladatok:**

1. **Feature mátrix** — Az ACI vs top 10 versenytárs
   - Katana, MRPeasy, Odoo Manufacturing, SAP B1, Plex, Prodsmart, SFactrix
   - + kisebb: Manufacturo, Fishbowl, Tulip
   - Feature-ök: OEE, scheduling, inventory, quality, maintenance, PLC, reporting, AI
   - **Output:** Összehasonlító mátrix JSON + MD

2. **Pricing összehasonlítás**
   - Havi/éves díjak, user-alapú vs modul-alapú
   - Free tier van-e, demo elérhető-e
   - **Output:** Ár táblázat + ACI pozícionálási javaslat

3. **Piaci rés elemzés** — Amit a válaszaidban mondtál
   - "piaci rés keresése de nem olyan rés ami azért rés mert nincs rá igény"
   - Mi az amit SENKI nem csinál JÓL a magyar/CEE piacon?
   - **Output:** Top 5 piaci rés lehetőség indoklással

4. **G2/Capterra review elemzés**
   - A versenytársak leggyakoribb panaszai → ACI lehetőségek
   - Mit szeretnek a felhasználók → ACI-nak is kell
   - **Output:** Sentiment összefoglaló + feature javaslatok

5. **Versenytárs UI/UX screenshot elemzés**
   - Dashboard layout-ok, navigáció, color scheme
   - **Output:** Design referenciák + "steal this" lista

---

## 4. DRÓN ARCHITEKTÚRA — TECHNIKAI TERV

### 4.1 Fájl struktúra

```
ainova-cloud-core/
├── drones/                          # Drón rendszer (Python, RunPod-on fut)
│   ├── README.md                    # Hogyan használd
│   ├── requirements.txt             # Python függőségek
│   ├── setup.sh                     # RunPod init script
│   ├── config.py                    # Supabase credentials, modell config
│   ├── core/
│   │   ├── __init__.py
│   │   ├── llm_client.py           # vLLM API kliens (OpenAI-kompatibilis)
│   │   ├── scraper.py              # Web scraping engine (Playwright + trafilatura)
│   │   ├── storage.py              # Supabase feltöltés + lokális JSON mentés
│   │   └── orchestrator.py         # Drón feladatok ütemezése és futtatása
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── tech_scout.py           # Technológiai kutató drón
│   │   ├── industry_scout.py       # Iparági adat gyűjtő drón
│   │   └── competitor_scout.py     # Versenytárs elemző drón
│   ├── prompts/
│   │   ├── tech_scout_system.md    # System prompt a tech kutatónak
│   │   ├── industry_scout_system.md
│   │   └── competitor_scout_system.md
│   ├── output/                      # Lokális output (git-be megy)
│   │   ├── tech/
│   │   ├── industry/
│   │   └── competitor/
│   └── run.py                       # Fő belépési pont: python run.py
│
├── docs/hun/plan/
│   ├── DRONE_STRATEGY_QUESTIONS.md  # Kitöltött kérdőív
│   └── DRONE_STRATEGY_PLAN.md       # EZ A DOKUMENTUM
```

### 4.2 Működési logika

```
┌─────────────────────────────────────────────────────┐
│                   RunPod GPU Pod                      │
│                                                       │
│  ┌──────────┐     ┌──────────────┐     ┌──────────┐ │
│  │ vLLM     │◄────│ Orchestrator │────►│ Scraper  │ │
│  │ Server   │     │ (run.py)     │     │ (Playw.) │ │
│  │ Llama 70B│     └──────┬───────┘     └────┬─────┘ │
│  └──────────┘            │                   │       │
│                          │                   │       │
│                    ┌─────▼─────┐      ┌─────▼─────┐ │
│                    │ Agent 1   │      │ Web       │ │
│                    │ Agent 2   │      │ tartalom  │ │
│                    │ Agent 3   │      │ letöltés  │ │
│                    └─────┬─────┘      └───────────┘ │
│                          │                           │
└──────────────────────────┼───────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │ (drone_results tábla)
                    │  + JSON     │ (lokális output/ mappa)
                    │  + Git push │
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Cascade    │ "Mutasd az eredményeket"
                    │  (Windsurf) │ → Elemzés → ACI integrálás
                    └─────────────┘
```

### 4.3 Drón működés részletesen

Minden drón ugyanazt a ciklust követi:

```
1. FELADAT MEGKAPÁS (orchestrator → agent)
   "Keresd meg hogyan lehet Next.js-ben instant nyelvváltást csinálni"

2. KERESÉSI TERV KÉSZÍTÉS (LLM)
   A modell eldönti milyen kereséseket csináljon:
   - "next.js i18n instant switch without reload"
   - "react-i18next vs next-intl performance"
   - "client side translation preloading next.js"

3. WEB SCRAPING (Playwright/trafilatura)
   - Headless Chrome megnyitja a keresési eredményeket
   - Letölti a releváns oldal tartalmakat
   - GitHub repo-kat clone-oz ha kód kell

4. FELDOLGOZÁS (LLM)
   A modell elemzi a letöltött tartalmakat:
   - Kiszűri a releváns részeket
   - Strukturálja JSON formátumba
   - Értékeli mennyire alkalmazható az ACI-ra
   - Magyar összefoglalót ír

5. MENTÉS
   - JSON → output/ mappa (git push-ra kész)
   - JSON → Supabase drone_results tábla
   - MD összefoglaló → output/ mappa
```

---

## 5. SUPABASE ADATSTRUKTÚRA

### 5.1 Új táblák

```sql
-- A drón eredmények tábla
CREATE TABLE public.drone_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  drone_type TEXT NOT NULL CHECK (drone_type IN ('tech_research', 'industry_data', 'competitor_analysis')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  summary TEXT,
  source_urls TEXT[],
  relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
  applied_to_aci BOOLEAN DEFAULT FALSE,
  applied_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session tracking
CREATE TABLE public.drone_sessions (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  model_used TEXT NOT NULL,
  gpu_config TEXT,
  total_results INTEGER DEFAULT 0,
  cost_usd FLOAT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  notes TEXT
);

-- Index a gyors kereséshez
CREATE INDEX idx_drone_results_type ON public.drone_results(drone_type);
CREATE INDEX idx_drone_results_category ON public.drone_results(category);
CREATE INDEX idx_drone_results_session ON public.drone_results(session_id);
CREATE INDEX idx_drone_results_score ON public.drone_results(relevance_score DESC);

-- RLS (Row Level Security) — csak authenticated users
ALTER TABLE public.drone_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_sessions ENABLE ROW LEVEL SECURITY;

-- Service role hozzáférés (a drónok service key-t használnak)
CREATE POLICY "Service role full access on drone_results"
  ON public.drone_results
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on drone_sessions"
  ON public.drone_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 5.2 Supabase konfiguráció

A RunPod drónok **Supabase service_role key**-t használnak (nem anon key-t):

```python
# config.py
SUPABASE_URL = "https://[project-id].supabase.co"
SUPABASE_SERVICE_KEY = "eyJ..."  # .env-ből, SOHA nem hardcoded
```

> **FONTOS:** A service_role key SOHA nem kerül git-be. A RunPod-on environment variable-ként adjuk meg.

---

## 6. KÖLTSÉGKALKULÁCIÓ

### Mai session:

| Tétel | Költség |
|-------|---------|
| RunPod 2x RTX PRO 6000, 4 óra | ~$15.12 |
| Supabase free tier | $0 |
| Git push | $0 |
| Cascade/Windsurf | $0 (előfizetésben) |
| **Összesen** | **~$15** |

### Ami marad: ~$1-10 (a feltöltéstől függően)

### Havi fenntartás (későbbi fázis):
| Tétel | Költség |
|-------|---------|
| Supabase Pro (ha kell) | $25/hó |
| RunPod eseti session (5 óra) | ~$19/alkalom |
| Vercel free tier | $0 |
| **Havi minimum** | **$0-25** |

---

## 7. AZONNALI TEENDŐK (MA)

### Lépés 1: Cascade előkészítés (MOST, 0 költség)
- [ ] Supabase táblákat létrehozni (SQL fentebb)
- [ ] `drones/` mappa struktúra létrehozása az ainova-cloud-core-ban
- [ ] Python scriptek megírása (setup.sh, config.py, run.py, agents)
- [ ] System promptok megírása a drónoknak
- [ ] RunPod indítási útmutató elkészítése (copy-paste parancsok)

### Lépés 2: RunPod session indítása
- [ ] RunPod pod indítása (2x RTX PRO 6000)
- [ ] SSH csatlakozás vagy Jupyter notebook megnyitása
- [ ] setup.sh futtatása
- [ ] Modell betöltés megvárása (~5-10 perc)

### Lépés 3: Drónok futtatása
- [ ] `python run.py --drone tech_scout` (60 perc)
- [ ] `python run.py --drone industry_scout` (60 perc)
- [ ] `python run.py --drone competitor_scout` (60 perc)

### Lépés 4: Eredmények feldolgozása
- [ ] Supabase-en ellenőrizni az adatokat
- [ ] output/ mappa tartalmát git-be push-olni
- [ ] Cascade-del átbeszélni az eredményeket
- [ ] RunPod pod LEÁLLÍTÁSA (NE FELEJSD EL!)

### Lépés 5: ACI javítások megkezdése (Cascade-del, ingyen)
- [ ] Nyelvváltás performance fix (a tech drón eredményei alapján)
- [ ] Design javítások
- [ ] Az iparági adatok beépítése az AI asszisztensbe

---

## 8. JÖVŐBELI FÁZISOK (NEM MA)

### Fázis 2 (1-2 hét múlva): AI Asszisztens Self-Hosting
- OpenAI lecserélése self-hosted modellre
- Supabase Edge Functions → LLM API proxy
- Vagy: Vercel-en futó kisebb modell (Llama 3.1 8B quantized)

### Fázis 3 (1 hónap): Beépített Drón Rendszer
- ACI superadmin felületen "Drón küldés" gomb
- Előre definiált drón feladatok (versenytárs frissítés, piackutatás)
- Eredmények a dashboardon megjelennek

### Fázis 4 (2-3 hónap): Fine-tuned Ainova Modell
- Ainova-specifikus modell ami:
  - Érti az ACI architektúrát
  - Érti a gyártási kontextust
  - Tud magyar nyelven
  - Beépített asszisztensként működik
  - Security monitoring, anomália detekció
  - Push/email riasztások

### Fázis 5 (3-6 hónap): Automata Drón Ciklus
- Olcsó GPU megoldás (Vast.ai, Lambda, spot instance)
- Heti automatikus futás → Supabase → ACI frissítés
- Bryan és a feleséged is látja az eredményeket
- Folyamatos versenytárs monitoring

---

## 9. KOCKÁZATOK & MEGOLDÁSOK

| Kockázat | Valószínűség | Megoldás |
|----------|-------------|---------|
| RunPod session timeout | Közepes | Rendszeres mentés Supabase-re, ne 1 nagy batch |
| Modell letöltés lassú | Alacsony | Network Volume létrehozás (első session-nél $0.07/GB) |
| Scraping blokkolás | Közepes | Randomizált user-agent, delays, több forrás |
| $16 nem elég | Alacsony | 70B helyett 8B modell → 2x gyorsabb → kevesebb idő |
| Supabase free limit | Alacsony | 500MB DB, 1GB storage — bőven elég kezdetnek |
| Eredmények nem hasznosak | Közepes | Precíz system promptok, relevance scoring |

---

## 10. DÖNTÉSEK AMIKET NEKED KELL MEGHOZNOD

Mielőtt elkezdjük a kódolást, ezekre kell válasz:

### 10.1 Supabase projekt URL és service_role key
> Kell hogy a drónok oda írjanak. Hol találom?
> Supabase Dashboard → Settings → API → `service_role` key (secret!)

### 10.2 A RunPod-on melyik régiót használod?
> EU (Amsterdam) vagy US (Texas)?
> Ez befolyásolja a scraping sebességet.

### 10.3 Van-e Hugging Face account-od?
> A Llama 3.1 70B letöltéséhez kell HuggingFace token (ingyenes).
> Ha nincs: https://huggingface.co/settings/tokens

### 10.4 Elkezdjük?
> Ha igennel válaszolsz, megírom az összes Python scriptet és a teljes setup-ot step-by-step.

---

> **Összefoglalva:** A terv az, hogy $15-ért 3 drón agent gyűjt adatot 4 óra alatt a RunPod-on, MIKÖZBEN Cascade párhuzamosan javítja az ACI-t. Az eredmények Supabase-re és Git-be mennek. Utána együtt dolgozzuk fel és építjük be az ACI-ba. Ez a LEGHATÉKONYABB módja a korlátozott erőforrásaid kihasználásának.
