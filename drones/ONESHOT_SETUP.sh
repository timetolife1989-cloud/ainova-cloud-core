#!/bin/bash
# ============================================================
# AINOVA DRONE SYSTEM — EGYETLEN COPY-PASTE SETUP
# Másold be ezt az EGÉSZET a RunPod Web Terminálba!
# ============================================================

cd /workspace

echo ">>> 1/5 — Kód letöltése..."
git clone https://github.com/timetolife1989-cloud/ainova-cloud-core.git
cd ainova-cloud-core/drones

echo ">>> 2/5 — .env létrehozása..."
cat > .env << 'ENVEOF'
SUPABASE_URL=https://nfancsrufcvmulrxnfxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYW5jc3J1ZmN2bXVscnhuZnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzODY3OCwiZXhwIjoyMDg4ODE0Njc4fQ.evReuIHoo52FOIrlVnxeeFUubmqpM8C7U0E5601xxr4
HF_TOKEN=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
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=meta-llama/Llama-3.1-70B-Instruct
ENVEOF

echo ">>> 3/5 — Python csomagok telepítése..."
pip install -q vllm httpx rich supabase trafilatura playwright click
playwright install chromium

echo ">>> 4/5 — HuggingFace login..."
huggingface-cli login --token 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 2>/dev/null || true

echo ">>> 5/5 — vLLM szerver indítása (háttérben)..."
nohup python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 32768 \
    --dtype auto \
    --port 8000 \
    > vllm.log 2>&1 &

echo $! > .vllm_pid
echo ""
echo "============================================"
echo "  SETUP KÉSZ! Modell betöltés indult."
echo "  Most automatikusan várok amíg kész lesz..."
echo "  Ez 5-15 percet vesz igénybe."
echo "  NE ZÁRD BE A TERMINÁLT!"
echo "============================================"
echo ""

# Automatikus várakozás a modellre
MAX_WAIT=1200
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo ""
        echo "============================================"
        echo "  MODELL KÉSZ! Drónok indulnak..."
        echo "============================================"
        echo ""
        python run.py --all
        echo ""
        echo "============================================"
        echo "  DRÓNOK KÉSZ!"
        echo "  Eredmények mentése Git-be..."
        echo "============================================"
        cd /workspace/ainova-cloud-core
        git add drones/output/ 2>/dev/null
        git commit -m "data: drone results $(date +%Y-%m-%d_%H%M)" 2>/dev/null
        git push 2>/dev/null
        echo ""
        echo "============================================"
        echo "  MINDEN KÉSZ!"
        echo "  ÁLLÍTSD LE A POD-OT A RUNPOD OLDALON!"
        echo "============================================"
        exit 0
    fi
    sleep 15
    WAITED=$((WAITED + 15))
    MINS=$((WAITED / 60))
    SECS=$((WAITED % 60))
    echo "  Várakozás... (${MINS}m ${SECS}s)"
done

echo "HIBA: A modell 20 perc után sem indult el."
echo "Nézd a logot: cat /workspace/ainova-cloud-core/drones/vllm.log"
