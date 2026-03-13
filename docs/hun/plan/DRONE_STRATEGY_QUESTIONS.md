# AINOVA Adatgyűjtő Drón Rendszer — Stratégiai Kérdéslista

> **Cél:** Ezeket a kérdéseket megválaszolva tudjuk megtervezni a drón agentek pontos működését, az adatgyűjtési stratégiát, a modellválasztást és a RunPod erőforrások hatékony kihasználását.
>
> **Kérés:** Válaszolj minden kérdésre röviden de lényegre törően. Ha valamire nem tudod a választ, írd hogy "nem tudom / még nincs eldöntve". Ha egy kérdés több válaszlehetőséget ad, választhatsz többet is.
>
> **Készítette:** Cascade AI (2026-03-13)

---

## 1. ÜZLETI CÉLOK & PRIORITÁSOK

### 1.1 Mi a legfontosabb rövid távú cél az Ainova projekttel?
> Válassz egyet vagy többet, és rangsorold (1 = legfontosabb):
> - [ ] Első fizető ügyfél szerzése
> - [x ] Demo környezet tökéletesítése (demo.ainova.hu)
> - [ x] Technológiai előny kiépítése (AI/ML funkciók)
> - [ ] Marketing indítás (landing page, tartalom, SEO)
> - [ x] Kódbázis stabilizálása és tesztelése
> - [ ] Egyéb: egyediség, kinézetbe, kódstruktura a lehető leggyorsabb rendszer ui szinten nyelválaasztáskor stb és kva gyors adatfeldolgozás

**Válaszod:**


### 1.2 Mi a legfontosabb hosszú távú cél (6-12 hónap)?
> - [ ] SaaS üzemeltetés (Vercel + Supabase)
> - [ ] On-premise értékesítés magyar KKV-knak
> - [ ] Nemzetközi terjeszkedés (DE/EN piac)
> - [ ] Platformmá válás (marketplace, partner API)
> - [ ] AI-first gyártásmenedzsment (prediktív analitika fókusz)
> - [ ] Egyéb: nem tudom melyik az a pálya ahol szüksg van de a konkurenciát lenyomhatjuk. piaci rés keresése de nem olyan rés ami azért rés mert nincs rá igény

**Válaszod:**


### 1.3 Van-e már konkrét ügyfeled, pilot partnered, vagy érdeklődő céged?
> Ha igen, milyen iparágban vannak, hány fős cégek, mit használnak most (Excel, SAP, más szoftver)?

**Válaszod:**
semmi konkrét ügyfél

### 1.4 A LAC (saját gyár / referencia) milyen szinten használja az Ainovát?
> - [ ] Éles használatban van
> - [ ] Tesztelés alatt
> - [ ] Még nem indult el
> - [x ] LAC nem releváns / más a helyzet

**Válaszod:**
én  a gyárban ahol dolgozom termelési részlegvezetőknt a Lac területet vezetem, de annak ellenére hogy nagy multi cég, van sap,mes ariba stb még mindig minden adat excel alapú, hiányos és kautikus adatok vannak. én használtam a programot de továbbterjesztésénél falakba ütköztem. it nem ért rám,programozók aztmondták átveszik ha akarom...nyilván nem. sap api-t nem kaptam. ellehetlenítettek. sap rendszerünk fasza, de tul komlikált és magától nem dolgozza fel az adatot.

---

## 2. DRÓN AGENTEK — PRIORITÁS & FÓKUSZ

### 2.1 Az alábbi 5 drón típusból melyik a legfontosabb neked? (Rangsorolj 1-5)

| # | Drón típus | Te mit kapnál belőle | Rangsor |
|---|-----------|----------------------|---------|
| A | **Versenytárs Elemző** | Feature gap analízis, pricing validáció, marketing ammo | |
| B | **Technológiai Kutató** | Kód minták, best practice, Next.js/React optimalizáció |x |
| C | **Iparági Adat Gyűjtő** | OEE benchmarkok, KPI szabványok, ISA-95 tudás |x |
| D | **AI/ML Modell Tréner** | Prediktív karbantartás, anomália detekció modellek | x|
| E | **Tartalom Generáló** | Blog posztok, marketing szöveg, API dokumentáció | |

**Válaszod:**
olyan modulásris progi kell, ami nekem mint fejlesztőnek a beüemelési időt sokkal gyorsabban végzem mint a konkurens cégek. azaz minden kész, csak joinolnom kell minden ahogy a megrendelőnek szüksége van rá. join táblás megoldás mint a sap de kompatibilitási problémák nélkül és egyszerűen.mindenre felkészülve. ha sap van akkor azt használom, ha van saját szerverük azt ha nincs én szolgáltatom, (nagyon nagyon nehéz leírnom az igényeimet, mert ami a fejemben van nem tudom kifejezni,amiről nincs tudásom meg nem is tudom kigondolni)

### 2.2 Van-e más drón típus ami szerinted kellene, de nem szerepel a listán?
> Pl. jogszabály/compliance kutató, pályázatfigyelő, GitHub repo elemző, stb.

**Válaszod:**
jogszabály, autóipar, full automatizálás, beépített beléptető rendszer, pl kocsiba rakható pl c n keresztül menetidő fogyasztás de nem csak kocsi hanem minden de ugy h nem feltétlen kell h legyen a cégnek beléptető rendszere. egyszer invesztell valami kártyaolvasóba és a programom kezeli mert olyan része is van.

### 2.3 A drónok által gyűjtött adatot milyen formában szeretnéd megkapni?
> - [ x] JSON fájlok (strukturált, programozottan feldolgozható)
> - [ x] Markdown dokumentumok (ember által olvasható)
> - [ ] Közvetlenül az ACI adatbázisba (új táblák, API-n keresztül)
> - [ ] Excel/CSV fájlok
> - [ ] Mindegyik, attól függően melyik drón
> - [ ] Egyéb: ___

**Válaszod:**
nekem is értenem kell mint ember. az adatokat nem kell késztermékké tenniuk a drónoknak de olyan formába kell hogy egy erős modell, mint pl te tudja értelmezni, átlátni és implantálni velem tervezve

---

## 3. RUNPOD & INFRASTRUKTÚRA

### 3.1 A RunPod-ot már használtad korábban?
> - [ ] Igen, van tapasztalatom vele
> - [ x] Igen, de csak minimálisan
> - [ ] Nem, ez lesz az első alkalom

**Válaszod:**
minden beállítást neked kell elmondani. nincs csatolva storage, van superbase-m oda kellene küldjék az adatokat strukturáltan szelektáltan, ebben is kell a segítséged és a terv.

### 3.2 Van-e már valami a RunPod Network Volume-on?
> A képeken láttam, hogy Network Volume opció elérhető. Van rajta mentett modell, adat, vagy üres?

**Válaszod:**
nincs network volume


### 3.3 Milyen gyakran tervezed futtatni a drónokat?
> - [ ] Hetente egyszer (3-5 óra session)
> - [ ] Kéthetente
> - [ ] Havonta egyszer
> - [x ] Eseti alapon, amikor szükség van rá
> - [ ] Folyamatosan (nem RunPod, hanem olcsóbb megoldás)
> - [ ] Egyéb: ___

**Válaszod:**
most van rajt 16 dollárom és kifogytam, de később egy automatizáló olcsó megoldás szóba jöhet amikor is a superbasera teszi az adatokat és pl windsorf vagy github copilot amik hozzá vannak csatolva a vercelem,supabase és github fiókomhoz alapból tudjanak mihez nyulni ha csak referenciaként is

### 3.4 Van-e költségvetési korlát a RunPod használatára?
> Pl. max $X/hónap, vagy max Y session/hónap. A jelenlegi setup ~$3.78/hr, tehát 5 óra = ~$19.

**Válaszod:**
most az egyszer 25 dollárig feltöltöm ha kell.

### 3.5 A RunPod-on kívül van-e más GPU erőforrásod?
> Pl. saját gép GPU-val, Google Colab Pro, AWS/Azure kredit, stb.

**Válaszod:**
semmim nincs sajnos. már az agent költségek is nagyon megterhelőek, hamar elfogy a token és még nincs profitom se.

### 3.6 A RunPod session-ök között az adatok hogyan maradjanak meg?
> - [ ] Network Volume-ra mentés (perzisztens, de fizetős: $0.07/GB/hó)
> - [ ] Letöltés a saját gépre (manuális, de ingyenes)
> - [ ] Feltöltés cloud storage-ra (S3, GCS, stb.)
> - [ x] Git repo-ba push-olás
> - [ ] Egyéb: ___

**Válaszod:**
meg ugye van superbasem free licenses, de havi 10-20 usd belefér ha csomag kell mindenképpen

---

## 4. AI MODELLEK & TECHNOLÓGIA

### 4.1 Van-e OpenAI API kulcsod?
> Az `assistant.ts`-ben GPT-4o-mini van bekötve. A drón orchestráláshoz is hasznos lenne.
> - [ ] Igen, van aktív API kulcsom
> - [ ] Igen, de korlátozott budget-tel
> - [ x] Nincs, de szereznék
> - [ ] Nem akarok OpenAI-t használni, inkább open-source

**Válaszod:**
nagyon szeretnék, de én lokálisan nem tudok modelleket telepíteni mert nincs erőforrása a gépemnek. gépem sincs ez is céges laptop. open ai-t meg nem akarok mert it security és alapból is a legfontosabb része a szolgáltatásomnak az adatbiztonság és az adatok elvesztése vagy manipulálása,illetéktelen szerveztek hozzájutásának megakadályozása

### 4.2 Open-source modellekkel kapcsolatos preferenciád?
> A 192GB VRAM-mal akár 70B+ paraméterű modelleket is futtathatunk. Melyik érdekel?
> - [ ] **Llama 3.1 70B** — Általános célú, kiváló minőség
> - [ ] **Qwen2.5-72B** — Jó többnyelvű támogatás (magyar is)
> - [ ] **DeepSeek-Coder-V2** — Kód generálás/elemzés fókusz
> - [ ] **Mixtral 8x22B** — Vegyes feladatok, MoE architektúra
> - [ ] **Mistral Large** — Erős általános modell
> - [ x] Nem tudom, te dönts a feladat alapján
> - [ ] Egyéb: ___

**Válaszod:**
nem kell h magyar legyen. a leírást le tudom fordittatni. én nem tudok programozni au-t használok ugyis

### 4.3 Szeretnél-e saját fine-tuned modellt az Ainova számára?
> Ez egy Ainova-specifikus modell lenne, ami érti a gyártásmenedzsmentet, az ACI architektúrát, és a magyar nyelvet.
> - [x ] Igen, ez lenne az álom
> - [ ] Talán később, most a gyors eredmény a fontos
> - [ ] Nem, a generic modellek elégek
> - [ ] Nem tudom mit jelent ez pontosan

**Válaszod:**
egy beépített agent aki mindent tud a rendszerről a modulokról mindent is tud! akár megnyitni egy kimutatást, nyomtatóra küldeni,értelmezésben segíteni, jelezni automatikusan push vagy email ha gáz van, tudná csekkolni a programot, illetéktelen behatolások nonstop running modell

### 4.4 Az AI asszisztens (lib/ai/assistant.ts) jövője?
> Jelenleg OpenAI GPT-4o-mini-t hív. Szeretnéd-e lecserélni/kiegészíteni?
> - [ ] Maradjon OpenAI (megbízható, gyors)
> - [ ] Legyen self-hosted alternatíva is (RunPod-on futó modell → API)
> - [ ] Legyen fallback: ha OpenAI nem elérhető → lokális modell
> - [x ] Teljesen self-hosted legyen (nincs OpenAI függőség)
> - [ ] Egyéb: ___

**Válaszod:**


---

## 5. ADATGYŰJTÉS — KONKRÉT IGÉNYEK

### 5.1 A versenytárs elemzésnél mely cégek/szoftverek a legfontosabbak?
> A MARKET_ANALYSIS.md-ben már vannak felsorolva. Ezeken kívül van-e más?
> - Katana MRP
> - MRPeasy
> - Odoo
> - SAP Business One
> - Plex (Rockwell)
> - Prodsmart
> - SFactrix
> - Egyéb: ___

**Válaszod:**
nem tudom milyen szinten van az ainova így azt sem h kik a releváns versentársak 

### 5.2 Milyen technológiai területeken kellene kutatni?
> Válassz többet:
> - [ ] Next.js 16 App Router best practice-ek, performance
> - [ ] React 19 Server Components pattern-ek
> - [ ] Multi-tenant SaaS architektúra (DB per tenant vs row-level)
> - [ ] PLC kommunikáció implementáció (S7, Modbus, OPC-UA valódi kód)
> - [ ] SAP RFC/OData integráció kód minták
> - [ ] OEE kalkuláció és vizualizáció best practice
> - [ ] Real-time dashboard (WebSocket vs SSE vs polling trade-off)
> - [ ] Prediktív karbantartás ML pipeline
> - [ ] Edge computing / IoT gateway architektúra
> - [ ] Playwright / E2E testing Next.js alkalmazásokhoz
> - [ ] Monorepo (Turborepo/Nx) migráció
> - [ ] Egyéb: ___

**Válaszod:**
ez a legmindenebb. ez a kulcs sztem, hogy minden. (ha lehetséges)

### 5.3 Az iparági adatgyűjtésnél milyen KPI-k/benchmark-ok kellenek?
> - [ ] OEE iparági átlagok (autóipar, elektronika, élelmiszer, stb.)
> - [ ] Selejt arány benchmark-ok szektoronként
> - [ ] MTBF/MTTR (meghibásodási idők) referencia értékek
> - [ ] Termelési hatékonyság KPI-k
> - [ ] Készletforgás iparági átlagok
> - [ ] Energiahatékonysági mutatók
> - [ ] ISA-95 / MESA modell részletes leírás
> - [ ] Egyéb: ___

**Válaszod:**
kézi,félautómata,full automata, minden ami termelés és hozzá kapcsolódik. álmom a hr és adminisztratív melók lefedése is, kifizetések számolásának automatizálása, jogszabályok folyamatos monitorozása stb

### 5.4 A tartalomgenerálásnál milyen típusú tartalom kell?
> - [ ] Blog posztok (SEO optimalizált, magyar nyelvű)
> - [ ] Landing page szövegek (feature leírások, value proposition)
> - [ ] Ügyfél email sablonok (cold outreach, follow-up)
> - [ ] Social media posztok (LinkedIn)
> - [ ] Pályázati szövegek / digitalizációs projekt leírások
> - [ ] Felhasználói dokumentáció (user manual)
> - [ ] API dokumentáció (OpenAPI/Swagger generálás)
> - [ ] Értékesítési prezentáció szöveg
> - [ ] Egyéb: ___

**Válaszod:**
még nem tudom. van egy társam de még nagyon kezdő. ő foglalkozik a branchmarketingel, de jelenleg az a legfontosabb h tudja mi az az ainova, mindne olyan infó ami kell neki a brench kiépítéséhez és a célközönség felkutatásában. ő is ai-t használ de nagyon bután. tanítanom kell. Bryan. ő angol. vs aszisztensként hirdette magát, de attol az iránytól elszakadnék, sokkal komolyabb szerepet szánnék neki. a titulusát nem tudom a cégemen belül, de még a sajátomat sem.

---

## 6. KÓDBÁZIS & FEJLESZTÉS

### 6.1 A drón rendszer hol éljen a kódbázisban?
> - [ ] Az ainova-cloud-core részeként (pl. `scripts/drones/` vagy `lib/drones/`)
> - [ ] Külön projekt / repo (pl. `ainova-drones/`)
> - [ ] A RunPod-on maradjon, nincs köze a fő kódbázishoz
> - [ x] Nem tudom, te dönts

**Válaszod:**
nekem mint üzemeltetőnek jó lenne ha a programból mint superadmin a beépített agenten keresztül ki tudnék küldeni drónokat. pl új versenytársak, piackutatás, az aiova hogy áll, vélemények keresése lehetőséges tb

### 6.2 Milyen nyelven íródjanak a drón scriptek?
> A RunPod container Python 3.11-es, de a fő projekt TypeScript.
> - [ ] Python (természetes választás ML/scraping-hez, RunPod natív)
> - [ ] TypeScript/Node.js (konzisztencia a fő projekttel)
> - [ ] Vegyes: Python a GPU-intenzív részekhez, TS az orchestráláshoz
> - [ x] Nem számít, ami a leghatékonyabb

**Válaszod:**


### 6.3 Van-e specifikus fejlesztési feladat amiben a drónok segíthetnének?
> Pl.:
> - [ ] A PLC connector driver stubs-ok valódi implementációjához kód minták gyűjtése
> - [ ] Az i18n hardcoded stringek automatikus kiszedése és fordítása
> - [ ] Unit tesztek generálása a meglévő API route-okhoz
> - [ ] A SYSTEM_PROMPT (AI asszisztens) bővítése iparági tudással
> - [ ] Típusdefiníciók javítása / kiegészítése
> - [ ] Biztonsági audit (dependency vulnerability, OWASP top 10)
> - [ ] Egyéb: ___

**Válaszod:**
minden!

### 6.4 A jelenlegi kódbázis mely részein érzed a legnagyobb hiányosságot?
> Ahol a drónok segítségével a legtöbb előrelépést tudnánk elérni.

**Válaszod:**
jelenleg lassú. a nyelvkezelés nagyon szar, a design kritikán aluli. mondtam már h kva lassú? még ha magyarrol angolra váltok kkor is másodpercek míg átáll. a kódstruktura a lehető leggyorsabb rendszer ui szinten nyelválaasztáskor stb és kva gyors adatfeldolgozás kell. de ehhez te is nagyon kellessz, mert bár már ai implantációnál meg ilyenekről beszélünk de a kezdeti lépések se készek,tanácstalan vagyok

---

## 7. PREDIKTÍV ANALITIKA & ML

### 7.1 Szeretnél-e valódi ML modelleket beépíteni az ACI-ba?
> - [ ] Igen, ez lenne a fő versenyelőny
> - [ ] Igen, de csak később (most más a prioritás)
> - [ ] Nem biztos, először ügyfeleket kell szerezni
> - [ ] Nem tudom, ez mennyire reális

**Válaszod:**
szerintem ilyen már sokaknak van, ahol nincs ott meg nagyon félnek az aitól. nem feltétlenül kell látniuk az ai-t ahogy dolgozik.

### 7.2 Ha igen, milyen ML funkciókat szeretnél?
> - [ ] **Prediktív karbantartás** — "Ez a gép 12 napon belül meghibásodhat"
> - [ ] **OEE előrejelzés** — "Holnap várhatóan 72% OEE, mert..."
> - [ ] **Anomália detekció** — "Szokatlan mintázat a 3-as gép hőmérsékletében"
> - [ ] **Készlet optimalizálás** — "Rendelj most, mert 5 nap múlva kifogy"
> - [ ] **Minőség előrejelzés** — "Ez a batch nagyobb valószínűséggel hibás"
> - [ ] **Termelés ütemezés optimalizálás** — "Optimális gyártási sorrend"
> - [ ] **NLP / természetes nyelvű lekérdezés** — Az AI asszisztens fejlesztése
> - [ ] Egyéb: ___

**Válaszod:**
mind. és közbe tanuljon is az ai hogy egyre hatékonyabb legyen.

### 7.3 Van-e valódi gyártási adatod a modell tréninghez?
> - [ ] Igen, a LAC-tól van valós adat (milyen formátumban? Excel, CSV, DB dump?)
> - [ ] Nem, szintetikus adatot kell generálnunk
> - [ ] Vegyes: van egy kis valós adat + szintetikus kiegészítés kell
> - [ ] Egyéb: ___

**Válaszod:**
vannak valós adataim a termelésből de az manuális gyártás leginkább. perc alapú teljesítmény számolás, de sok helyen van db alapú is. beslő céges adatokat nem használok. a jelenlegi demoba is csak generált adatok vannak.

---

## 8. BIZTONSÁG & ETIKA

### 8.1 A web scraping-nél van-e korlátozás?
> - [ ] Csak publikus, szabadon elérhető adatokat gyűjtsünk
> - [ ] robots.txt-t mindig tartsuk be
> - [ ] Kerüljük a GDPR-érzékeny adatokat (személyes adatok)
> - [ ] Csak API-kon keresztül gyűjtsünk (nincs scraping)
> - [ ] Mindegy, amit lehet, azt gyűjtsük
> - [ ] Egyéb: ___

**Válaszod:**
gátlástalan modellekk kellenek, kiherélt de nem inteligencia fosztott, és a lehető legprofibb szisztempromtal. semmi ne akadályozza, ne legyen lelkiismerete vagy kérdése, ne kopogjon, menjen és ne hagyjon nyomot.

### 8.2 Az AI által generált tartalom hogyan legyen jelölve?
> - [ ] Legyen jelölve hogy AI generálta (transzparens)
> - [ ] Nem kell jelölni
> - [ x] Csak belső használatra (nem publikus)
> - [ ] Egyéb: ___

**Válaszod:**


### 8.3 A fine-tuned modellek és gyűjtött adatok szellemi tulajdon kérdése?
> - [x ] Minden maradjon privát (nem publikus, nem open-source)
> - [ ] A modellek lehetnek nyíltak, az adatok nem
> - [ ] Nem gondolkodtam rajta
> - [ ] Egyéb: ___

**Válaszod:**


---

## 9. WORKFLOW & EGYÜTTMŰKÖDÉS

### 9.1 Hogyan szeretnéd a drón eredményeket áttekinteni?
> - [ x] Cascade mutatja meg nekem és megbeszéljük
> - [ ] Dashboard / webes felületen (ACI-n belül)
> - [ ] Email összefoglaló
> - [ x] Markdown riport a docs/ mappában
> - [ ] Egyéb: ___

**Válaszod:**


### 9.2 Ki dolgozik még a projekten?
> A HELYZETKEP.md-ben "Bryan" van megemlítve (landing page). Van-e más fejlesztő/csapattag?
> - Ki csinálja a kódot? (Te egyedül / van fejlesztő csapat?)
> - Ki csinálja a marketinget?
> - Ki csinálja az értékesítést?
> - Van-e technikai tanácsadó?

**Válaszod:**
Bryan csak egy srác akit bírok és ki akarom rángatni a nyomorból, most még sokra nem megyek vele, de inteligens ha tanul majd segít. azért vettem be, mert a világ még nem nyitottt arra h egy ember egy kézben ai val mindent le tud fedni- feleségem könyvelő, a megfelelő fázisnál bevonom jobban. de ennyi

### 9.3 Milyen időhorizontban gondolkozol a drón rendszer felépítésében?
> - [ ] Most azonnal (mai/holnapi session-ben futtatni akarom)
> - [ ] Ezen a héten elkészülni
> - [ ] 1-2 héten belül felépíteni és tesztelni
> - [ ] Iteratívan, hétről hétre fejleszteni
> - [ ] Egyéb: ___

**Válaszod:**
a drónokat ma akarom kiküldeni

---

## 10. EGYÉB / SZABAD GONDOLATOK
a kitöltési útmutatót a kérőív végére tetted. azt az elején kellett volna :D
### 10.1 Van-e bármi más ami szerinted fontos és nem kérdeztem meg?


### 10.2 Mi az a "dream scenario" ami a drón rendszerből kijönne?
> Képzeld el a legjobb esetet — mit látsz magad előtt 1 hónap múlva?


### 10.3 Mi az amitől a legjobban tartasz / ami a legnagyobb kockázat?


---

## KITÖLTÉSI ÚTMUTATÓ

1. **Másolod ezt a fájlt** vagy szerkeszted közvetlenül
2. A `**Válaszod:**` sorok után írd be a válaszodat
3. A checkbox-oknál `[ ]` → `[x]` jelöléssel válassz
4. Ha egy kérdésre nem tudsz válaszolni: "Még nem tudom / Később döntök"
5. **Ha kész vagy, szólj nekem és a válaszaid alapján elkészítem a végleges stratégiai tervet + implementációs tervet**

---

> **Következő lépés:** A válaszaid megérkezése után készítek egy `DRONE_STRATEGY_PLAN.md` dokumentumot, ami tartalmazza:
> - A konkrét drón architektúrát
> - A RunPod session forgatókönyvet (percre lebontva)
> - A modell választást indoklással
> - Az adatgyűjtési pipeline-t
> - A kód struktúrát (fájlok, mappák, scriptek)
> - Az első session TODO listáját
