# AINOVA Drone System — RunPod Futtatási Útmutató

> **Ez a dokumentum step-by-step elmondja mit kell csinálnod a RunPod-on.**
> Minden parancsot COPY-PASTE-elni tudsz.

---

## ELŐKÉSZÍTÉS (Mielőtt RunPod-ot indítasz)

### 1. lépés: Supabase táblák létrehozása

1. Nyisd meg: https://supabase.com/dashboard/project/nfancsrufcvmulrxnfxx/sql/new
2. Másold be az `sql/supabase_setup.sql` fájl TELJES tartalmát
3. Kattints **Run** gombra
4. Alul látnod kell: `drone_sessions | 0` és `drone_results | 0`

### 2. lépés: Git push (hogy a kód fent legyen GitHub-on)

A lokális gépeden (Windsurf terminál):
```bash
cd C:\Projects\ainova-cloud-core
git add drones/
git commit -m "feat: add drone system for automated data collection"
git push
```

---

## RUNPOD SESSION

### 3. lépés: RunPod Pod indítása

1. Menj: https://www.runpod.io/console/pods
2. Kattints: **+ Deploy**
3. Beállítások:
   - **GPU:** 2x RTX PRO 6000 (48GB each)
   - **Container Image:** `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04`
   - **Container Disk:** 100 GB
   - **Volume Disk:** 0 GB (nincs szükség most)
   - **Expose HTTP Ports:** 8888, 8000
   - **Expose TCP Ports:** 22
4. Kattints: **Deploy On-Demand**
5. Várj amíg a pod `Running` állapotba kerül (~1-2 perc)

### 4. lépés: Csatlakozás a Pod-hoz

**Opció A: Web Terminal (legegyszerűbb)**
1. A pod kártyáján kattints: **Connect** → **Start Web Terminal**
2. Megnyílik egy böngésző terminál

**Opció B: Jupyter (ha inkább azt szereted)**
1. A pod kártyáján kattints: **Connect** → **Connect to Jupyter Lab**
2. Nyiss egy Terminal tabot

### 5. lépés: Kód letöltése a Pod-ra

```bash
# A GitHub repód klónozása
cd /workspace
git clone https://github.com/YOURUSERNAME/ainova-cloud-core.git
cd ainova-cloud-core/drones
```

> **FONTOS:** Cseréld ki `YOURUSERNAME`-et a saját GitHub felhasználónevedre!

### 6. lépés: .env fájl létrehozása

```bash
cp .env.example .env
nano .env
```

A nano szerkesztőben írd be a valós értékeket:

```
SUPABASE_URL=https://nfancsrufcvmulrxnfxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYW5jc3J1ZmN2bXVscnhuZnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzODY3OCwiZXhwIjoyMDg4ODE0Njc4fQ.evReuIHoo52FOIrlVnxeeFUubmqpM8C7U0E5601xxr4
HF_TOKEN=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
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=meta-llama/Llama-3.1-70B-Instruct
```

Mentés: `Ctrl+O` → `Enter` → `Ctrl+X`

### 7. lépés: Setup futtatása

```bash
bash setup.sh
```

Ez telepíti a Python csomagokat és a Playwright böngészőt (~3-5 perc).

### 8. lépés: Modell indítása

```bash
bash start_model.sh
```

> **Ez a leghosszabb lépés!** A Llama 3.1 70B modell letöltése és betöltése **5-15 percet** vesz igénybe az első alkalommal.
>
> Akkor kész, amikor ezt látod:
> ```
> ============================================
>   vLLM Server READY!
>   API: http://localhost:8000/v1
> ============================================
> ```

### 9. lépés: Drónok futtatása

**Nyiss egy ÚJ terminál tabot** (a vLLM az elsőben fut!), majd:

```bash
cd /workspace/ainova-cloud-core/drones

# Először: Health check
python run.py --check

# Ha minden OK → futtasd az összeset:
python run.py

# VAGY egyesével:
python run.py --drone tech_scout        # ~30-60 perc
python run.py --drone industry_scout    # ~30-60 perc
python run.py --drone competitor_scout  # ~30-60 perc
```

### 10. lépés: Eredmények mentése

A drónok automatikusan mentik az eredményeket:
- **Supabase** → `drone_results` tábla (automatikus)
- **Lokális fájlok** → `output/` mappa

Ha kész, push-old a lokális eredményeket Git-be:
```bash
cd /workspace/ainova-cloud-core
git add drones/output/
git commit -m "data: drone session results $(date +%Y-%m-%d)"
git push
```

### 11. lépés: POD LEÁLLÍTÁSA !!!

> **NAGYON FONTOS! Ha nem állítod le, fizeted az időt!**

1. Menj: https://www.runpod.io/console/pods
2. A pod kártyáján: **Stop** (vagy **Terminate** ha végleg nem kell)

---

## HIBAELHÁRÍTÁS

### "vLLM failed to start"
- Lehet hogy kevés a VRAM → próbáld `--gpu-memory-utilization 0.80` értékkel
- Vagy válts kisebb modellre: módosítsd a `.env`-ben: `VLLM_MODEL=meta-llama/Llama-3.1-8B-Instruct` és a `start_model.sh`-ban: `--tensor-parallel-size 1`

### "Supabase connection failed"
- Ellenőrizd a `.env`-ben a `SUPABASE_SERVICE_KEY`-t
- A Supabase project aktív-e? (https://supabase.com/dashboard)

### "Google search blocked"
- Normális, ha sokszor keresünk → a drón automatikusan próbálkozik újra
- Ha tartósan blokkol: a drón továbblép a következő feladatra

### "Out of GPU memory"
- Állítsd le a vLLM-et: `kill $(cat .vllm_pid)`
- Indítsd újra kisebb modellel (8B) vagy alacsonyabb memory utilization-nel

### "ModuleNotFoundError"
- Futtasd újra: `pip install -r requirements.txt`

---

## IDŐBEOSZTÁS (ajánlott)

| Idő | Feladat | Költség |
|-----|---------|---------|
| 0:00 - 0:05 | Pod indítás, git clone, .env | ~$0.30 |
| 0:05 - 0:10 | setup.sh futtatás | ~$0.30 |
| 0:10 - 0:25 | start_model.sh (modell betöltés) | ~$0.95 |
| 0:25 - 0:30 | Health check + teszt | ~$0.30 |
| 0:30 - 1:15 | Tech Scout drón | ~$2.85 |
| 1:15 - 2:00 | Industry Scout drón | ~$2.85 |
| 2:00 - 2:45 | Competitor Scout drón | ~$2.85 |
| 2:45 - 3:00 | Git push + pod leállítás | ~$0.95 |
| **Összesen** | **~3 óra** | **~$11.35** |

> Ez a $16-os budgetbe belefér, és marad is ~$5 tartalékra.

---

## UTÁNA (visszajössz a Windsurf-be)

1. `git pull` a lokális gépen hogy megkapd az eredményeket
2. Nyisd meg a Cascade-et (engem)
3. Mondd: "Megvannak a drón eredmények, nézzük át!"
4. Együtt feldolgozzuk az adatokat és elkezdjük az ACI javítását
