#!/bin/bash
# ============================================================
# AINOVA DRONE SYSTEM — Start vLLM Model Server
# ============================================================
# Starts Llama 3.1 70B on 2x GPUs.
# This takes 5-10 minutes for initial model download + loading.
#
# Usage: bash start_model.sh
# ============================================================

set -e

# Load .env
if [ -f .env ]; then
    set +e
    export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null
    set -e
fi

MODEL="${VLLM_MODEL:-meta-llama/Llama-3.1-70B-Instruct}"
PORT=8000

echo "============================================"
echo "  Starting vLLM Server"
echo "  Model: $MODEL"
echo "  GPUs: 2 (tensor parallel)"
echo "  Port: $PORT"
echo "============================================"
echo ""
echo "This will take 5-10 minutes for first download..."
echo "Watch for 'Uvicorn running on http://0.0.0.0:$PORT'"
echo ""

# Start vLLM with OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
    --model "$MODEL" \
    --tensor-parallel-size 2 \
    --max-model-len 32768 \
    --gpu-memory-utilization 0.85 \
    --port $PORT \
    --trust-remote-code \
    2>&1 | tee vllm_server.log &

VLLM_PID=$!
echo "vLLM PID: $VLLM_PID"
echo $VLLM_PID > .vllm_pid

# Wait for server to be ready
echo ""
echo "Waiting for model to load..."
MAX_WAIT=600  # 10 minutes max
WAITED=0
while ! curl -s http://localhost:$PORT/health > /dev/null 2>&1; do
    sleep 10
    WAITED=$((WAITED + 10))
    echo "  Still loading... (${WAITED}s)"
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "ERROR: vLLM failed to start within ${MAX_WAIT}s"
        echo "Check vllm_server.log for errors"
        exit 1
    fi
done

echo ""
echo "============================================"
echo "  vLLM Server READY!"
echo "  API: http://localhost:$PORT/v1"
echo "  Health: http://localhost:$PORT/health"
echo "============================================"
echo ""
echo "You can now run the drones:"
echo "  python run.py"
echo ""
echo "To stop the server later:"
echo "  kill \$(cat .vllm_pid)"
