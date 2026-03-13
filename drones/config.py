"""
Ainova Drone System — Configuration
Loads environment variables and provides typed config.
"""

import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://nfancsrufcvmulrxnfxx.supabase.co")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # HuggingFace
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")

    # vLLM Server (local on RunPod)
    VLLM_BASE_URL: str = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")
    VLLM_MODEL: str = os.getenv("VLLM_MODEL", "meta-llama/Llama-3.1-70B-Instruct")

    # Session
    SESSION_ID: str = os.getenv("SESSION_ID", f"session_{datetime.now().strftime('%Y-%m-%d_%H%M')}")

    # Output
    OUTPUT_DIR: str = os.path.join(os.path.dirname(__file__), "output")

    # Scraping
    MAX_PAGES_PER_QUERY: int = 5
    REQUEST_DELAY_SEC: float = 2.0
    USER_AGENTS: list = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    ]

    # LLM
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.3

    @classmethod
    def validate(cls) -> list[str]:
        """Check that all required config values are set. Returns list of errors."""
        errors = []
        if not cls.SUPABASE_SERVICE_KEY:
            errors.append("SUPABASE_SERVICE_KEY is not set")
        if not cls.HF_TOKEN:
            errors.append("HF_TOKEN is not set")
        return errors
