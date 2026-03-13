#!/bin/bash
# ============================================================
# AINOVA DRONE SYSTEM — TELJES AUTOMATIKUS SETUP
# Egyetlen copy-paste a RunPod terminálba.
# Minden háttérben fut — bezárhatod a terminált!
# ============================================================
set +e
DIR=/workspace/ainova-cloud-core/drones
LOG=$DIR/drone_progress.log

echo "============================================"
echo "  AINOVA DRONE SYSTEM — SETUP INDUL"
echo "============================================"

# 1. Kód
echo ">>> [1/5] Kód..."
cd /workspace
if [ -d "ainova-cloud-core" ]; then
    cd ainova-cloud-core && git pull 2>/dev/null && cd /workspace
else
    git clone https://github.com/timetolife1989-cloud/ainova-cloud-core.git
fi
cd $DIR

# 2. Env
echo ">>> [2/5] .env..."
cat > .env << 'ENVEOF'
SUPABASE_URL=https://nfancsrufcvmulrxnfxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYW5jc3J1ZmN2bXVscnhuZnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzODY3OCwiZXhwIjoyMDg4ODE0Njc4fQ.evReuIHoo52FOIrlVnxeeFUubmqpM8C7U0E5601xxr4
HF_TOKEN=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
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=meta-llama/Llama-3.1-70B-Instruct
ENVEOF

# 3. Csomagok
echo ">>> [3/5] Python csomagok..."
pip install -q vllm httpx rich supabase trafilatura playwright click python-dotenv 2>&1 | tail -1
playwright install chromium 2>&1 | tail -1

# 4. HuggingFace
echo ">>> [4/5] HuggingFace login..."
huggingface-cli login --token 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 2>/dev/null || true

# 5. Előző processek leállítása ha vannak
echo ">>> [5/5] vLLM + drónok indítása háttérben..."
if [ -f .vllm_pid ]; then kill $(cat .vllm_pid) 2>/dev/null; sleep 2; fi

# vLLM háttérben
nohup python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 32768 \
    --dtype auto \
    --port 8000 \
    > $DIR/vllm.log 2>&1 &
echo $! > $DIR/.vllm_pid

# Háttér script — megvárja a modellt, futtatja a drónokat
# TÚLÉLI A TERMINÁL BEZÁRÁST!
cat > $DIR/_autorun.sh << 'AUTOEOF'
#!/bin/bash
cd /workspace/ainova-cloud-core/drones
LOG=/workspace/ainova-cloud-core/drones/drone_progress.log
echo "$(date '+%H:%M') | Modell betöltés indult..." > $LOG

WAITED=0
while [ $WAITED -lt 1800 ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "$(date '+%H:%M') | MODELL KÉSZ — tech_scout indul" >> $LOG
        python run.py --drone tech_scout >> $LOG 2>&1
        echo "$(date '+%H:%M') | tech_scout KÉSZ — industry_scout indul" >> $LOG
        python run.py --drone industry_scout >> $LOG 2>&1
        echo "$(date '+%H:%M') | industry_scout KÉSZ — competitor_scout indul" >> $LOG
        python run.py --drone competitor_scout >> $LOG 2>&1
        echo "$(date '+%H:%M') | MIND A 3 DRÓN KÉSZ" >> $LOG
        echo "$(date '+%H:%M') | Git push..." >> $LOG
        cd /workspace/ainova-cloud-core
        git add drones/output/ 2>/dev/null
        git commit -m "data: drone results $(date +%Y-%m-%d_%H%M)" 2>/dev/null
        git push 2>/dev/null
        echo "" >> $LOG
        echo "========================================" >> $LOG
        echo "  MINDEN KÉSZ — ÁLLÍTSD LE A PODOT!" >> $LOG
        echo "========================================" >> $LOG
        exit 0
    fi
    sleep 15
    WAITED=$((WAITED + 15))
    echo "$(date '+%H:%M') | Modell tölt... (${WAITED}s)" >> $LOG
done
echo "$(date '+%H:%M') | HIBA: modell 30 perc után sem indult el!" >> $LOG
echo "Nézd: cat /workspace/ainova-cloud-core/drones/vllm.log" >> $LOG
AUTOEOF

chmod +x $DIR/_autorun.sh
nohup bash $DIR/_autorun.sh > /dev/null 2>&1 &
disown 2>/dev/null

echo ""
echo "============================================"
echo "  KÉSZ! MINDEN A HÁTTÉRBEN FUT."
echo "  BEZÁRHATOD A TERMINÁLT!"
echo ""
echo "  Eredmények ÉLŐBEN itt:"
echo "  https://supabase.com/dashboard/project/nfancsrufcvmulrxnfxx"
echo "  -> Table Editor -> drone_results"
echo ""
echo "  Ha visszajössz, állapot:"
echo "  cat /workspace/ainova-cloud-core/drones/drone_progress.log"
echo ""
echo "  ~2 óra múlva: STOP gomb a RunPod-on!"
echo "============================================"
