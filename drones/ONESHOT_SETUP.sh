#!/bin/bash
# ============================================================
# AINOVA DRONE SYSTEM — AUTOMATED SETUP (RunPod)
# No secrets in this file — reads from environment variables.
# Can be used as Container Start Command or run manually.
# ============================================================
set +e

echo "============================================"
echo "  AINOVA DRONE SYSTEM — SETUP"
echo "============================================"

DIR=/workspace/ainova-cloud-core/drones
LOG=/workspace/drone_progress.log

# 0. Wait for GPU driver to be ready (RunPod sometimes needs a moment)
echo ">>> [0/6] Waiting for GPU..."
GPUWAIT=0
while ! nvidia-smi > /dev/null 2>&1; do
    sleep 5
    GPUWAIT=$((GPUWAIT + 5))
    if [ $GPUWAIT -ge 120 ]; then
        echo "ERROR: GPU not available after 120s"
        echo "$(date '+%H:%M') | ERROR: GPU driver not ready" > $LOG
        sleep infinity
        exit 1
    fi
done
echo "  GPU OK: $(nvidia-smi -L | head -1)"

# 1. Clone / update code
echo ">>> [1/6] Code..."
cd /workspace
if [ -d "ainova-cloud-core" ]; then
    cd ainova-cloud-core && git pull 2>/dev/null && cd /workspace
else
    git clone https://github.com/timetolife1989-cloud/ainova-cloud-core.git 2>/dev/null
fi

# 2. Create .env from RunPod environment variables
echo ">>> [2/6] Environment..."
cd $DIR
cat > .env << EOF
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
HF_TOKEN=${HF_TOKEN:-}
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=${VLLM_MODEL:-meta-llama/Llama-3.1-70B-Instruct}
EOF

# 3. Install dependencies (use --no-deps for vllm to avoid torch conflicts)
echo ">>> [3/6] Python packages..."
pip install -q httpx rich supabase trafilatura playwright click python-dotenv beautifulsoup4 lxml pydantic 2>&1 | tail -3
pip install -q vllm --no-build-isolation 2>&1 | tail -3
playwright install chromium 2>&1 | tail -1

# 4. HuggingFace login
echo ">>> [4/6] HuggingFace..."
if [ -n "$HF_TOKEN" ]; then
    pip install -q huggingface-hub 2>/dev/null
    huggingface-cli login --token "$HF_TOKEN" 2>/dev/null || true
fi

# 5. Start vLLM
echo ">>> [5/6] vLLM server..."
if [ -f $DIR/.vllm_pid ]; then kill $(cat $DIR/.vllm_pid) 2>/dev/null; sleep 2; fi

MODEL=${VLLM_MODEL:-meta-llama/Llama-3.1-70B-Instruct}
GPU_COUNT=$(nvidia-smi -L 2>/dev/null | wc -l)
GPU_COUNT=${GPU_COUNT:-2}

nohup python -m vllm.entrypoints.openai.api_server \
    --model "$MODEL" \
    --tensor-parallel-size $GPU_COUNT \
    --gpu-memory-utilization 0.90 \
    --max-model-len 32768 \
    --dtype auto \
    --port 8000 \
    > $DIR/vllm.log 2>&1 &
echo $! > $DIR/.vllm_pid

# 6. Background drone runner — survives terminal close
echo ">>> [6/6] Drone autorun (background)..."
cat > /workspace/_drone_runner.sh << 'RUNEOF'
#!/bin/bash
cd /workspace/ainova-cloud-core/drones
LOG=/workspace/drone_progress.log
echo "$(date '+%H:%M') | Waiting for model..." > $LOG

# Wait for vLLM to be ready (max 30 min)
WAITED=0
while [ $WAITED -lt 1800 ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "$(date '+%H:%M') | MODEL READY — starting ALL drones" >> $LOG

        # Run all 4 drones sequentially
        echo "$(date '+%H:%M') | === DRONE 1/4: tech_scout ===" >> $LOG
        python run.py --drone tech_scout >> $LOG 2>&1

        echo "$(date '+%H:%M') | === DRONE 2/4: industry_scout ===" >> $LOG
        python run.py --drone industry_scout >> $LOG 2>&1

        echo "$(date '+%H:%M') | === DRONE 3/4: competitor_scout ===" >> $LOG
        python run.py --drone competitor_scout >> $LOG 2>&1

        echo "$(date '+%H:%M') | === DRONE 4/4: translation_scout ===" >> $LOG
        python run.py --drone translation_scout >> $LOG 2>&1

        echo "" >> $LOG
        echo "$(date '+%H:%M') | ============================================" >> $LOG
        echo "$(date '+%H:%M') | ALL 4 DRONES FINISHED" >> $LOG
        echo "$(date '+%H:%M') | Results: output/ folder + Supabase" >> $LOG
        echo "$(date '+%H:%M') | ============================================" >> $LOG
        echo "" >> $LOG
        echo "$(date '+%H:%M') | Pod stays alive. You can:" >> $LOG
        echo "  - SSH in and run more: python run.py --drone tech_scout" >> $LOG
        echo "  - Check results: ls output/" >> $LOG
        echo "  - Stop pod when done to save credit" >> $LOG

        # Keep alive for manual interaction
        sleep infinity
        exit 0
    fi
    sleep 15
    WAITED=$((WAITED + 15))
    echo "$(date '+%H:%M') | Loading model... (${WAITED}s)" >> $LOG
done
echo "$(date '+%H:%M') | ERROR: model did not start in 30 minutes" >> $LOG
echo "Check: cat /workspace/ainova-cloud-core/drones/vllm.log" >> $LOG
sleep infinity
RUNEOF

chmod +x /workspace/_drone_runner.sh
nohup bash /workspace/_drone_runner.sh > /dev/null 2>&1 &
disown 2>/dev/null

echo ""
echo "============================================"
echo "  RUNNING IN BACKGROUND!"
echo "  You can close this terminal."
echo ""
echo "  Progress: cat /workspace/drone_progress.log"
echo "  vLLM log: cat /workspace/ainova-cloud-core/drones/vllm.log"
echo "  Supabase: check drone_results table"
echo "============================================"
