# Ainova Drone System

Automated AI agents that collect and process data from the internet to accelerate ACI development.

## Quick Start

See **[RUNPOD_GUIDE.md](./RUNPOD_GUIDE.md)** for the full step-by-step guide.

## Architecture

```
drones/
├── run.py              # Main entry point
├── config.py           # Configuration (loads .env)
├── setup.sh            # RunPod initial setup
├── start_model.sh      # Start vLLM server (Llama 3.1 70B)
├── core/
│   ├── llm_client.py   # vLLM API client (OpenAI-compatible)
│   ├── scraper.py      # Web scraping (Playwright + trafilatura)
│   ├── storage.py      # Supabase + local JSON/MD storage
│   └── orchestrator.py # Drone coordination and execution
├── agents/
│   ├── tech_scout.py       # Technical research (Next.js, performance, UI)
│   ├── industry_scout.py   # Industry data (OEE, KPIs, standards)
│   └── competitor_scout.py # Competitor analysis (features, pricing, gaps)
├── prompts/            # System prompts for each drone
├── sql/                # Supabase table setup SQL
└── output/             # Local results (JSON + MD reports)
```

## Drones

| Drone | Purpose | Output |
|-------|---------|--------|
| **Tech Scout** | Next.js performance, i18n fixes, UI patterns, PLC code | Code snippets, implementation guides |
| **Industry Scout** | OEE benchmarks, KPIs, standards, regulations | Structured data for ACI modules |
| **Competitor Scout** | Feature comparison, pricing, market gaps | Competitive intelligence reports |

## Requirements

- RunPod pod with 2x GPU (48GB+ VRAM each)
- Supabase project with `drone_sessions` and `drone_results` tables
- HuggingFace token with Llama 3.1 access

## Usage

```bash
python run.py                          # Run all drones
python run.py --drone tech_scout       # Run specific drone
python run.py --check                  # Health check only
```
