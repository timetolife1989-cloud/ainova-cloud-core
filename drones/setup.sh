#!/bin/bash
# ============================================================
# AINOVA DRONE SYSTEM — RunPod Setup Script
# ============================================================
# This script sets up everything needed on a fresh RunPod pod.
# Run this ONCE when you start a new pod.
#
# Usage: bash setup.sh
# ============================================================

set -e

echo "============================================"
echo "  AINOVA DRONE SYSTEM — Setup"
echo "============================================"
echo ""

# ----------------------------------------------------------
# 1. Install Python dependencies
# ----------------------------------------------------------
echo "[1/4] Installing Python dependencies..."
pip install -q \
    vllm \
    supabase \
    httpx \
    playwright \
    trafilatura \
    beautifulsoup4 \
    lxml \
    pydantic \
    rich \
    click \
    python-dotenv

echo "  Done."

# ----------------------------------------------------------
# 2. Install Playwright browser (Chromium)
# ----------------------------------------------------------
echo "[2/4] Installing Playwright Chromium browser..."
playwright install chromium
playwright install-deps chromium 2>/dev/null || true
echo "  Done."

# ----------------------------------------------------------
# 3. Create .env file if it doesn't exist
# ----------------------------------------------------------
echo "[3/4] Checking .env file..."
if [ ! -f .env ]; then
    echo "  .env not found. Creating from template..."
    cp .env.example .env
    echo ""
    echo "  !! IMPORTANT: Edit .env and fill in your credentials !!"
    echo "  Required:"
    echo "    SUPABASE_SERVICE_KEY=eyJ..."
    echo "    HF_TOKEN=hf_..."
    echo ""
    echo "  Run: nano .env"
    echo ""
else
    echo "  .env already exists."
fi

# ----------------------------------------------------------
# 4. Login to HuggingFace (needed for Llama download)
# ----------------------------------------------------------
echo "[4/4] Logging in to HuggingFace..."
# Source .env if it exists (so HF_TOKEN is available)
if [ -f .env ]; then
    set +e
    export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null
    set -e
fi
if [ -n "$HF_TOKEN" ]; then
    huggingface-cli login --token "$HF_TOKEN" 2>/dev/null || \
    python -c "from huggingface_hub import login; login(token='$HF_TOKEN')" 2>/dev/null || \
    echo "  HF login via CLI failed, vLLM will use HF_TOKEN env var directly."
else
    echo "  HF_TOKEN not set in environment. Set it in .env file."
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit .env with your credentials (if not done):"
echo "     nano .env"
echo ""
echo "  2. Start the vLLM server:"
echo "     bash start_model.sh"
echo ""
echo "  3. Run the drones:"
echo "     python run.py              # All drones"
echo "     python run.py --check      # Health check only"
echo "     python run.py --drone tech_scout"
echo ""
