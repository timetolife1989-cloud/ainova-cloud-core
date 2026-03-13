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
    --gpu-memory-utilization 0.90 \
    --max-model-len 8192 \
    --dtype auto \
    --port 8000 \
    > vllm.log 2>&1 &

echo $! > .vllm_pid
echo ""
echo "============================================"
echo "  SETUP KÉSZ!"
echo "  A modell most töltődik be (5-15 perc)."
echo ""
echo "  Nézd a modell állapotát:"
echo "    tail -f vllm.log"
echo ""
echo "  Ha látod: 'Uvicorn running on' → KÉSZ!"
echo "  Utána nyomj Ctrl+C és írd be:"
echo "    python run.py --all"
echo "============================================"
