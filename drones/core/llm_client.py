"""
Ainova Drone System — LLM Client
Communicates with the local vLLM server (OpenAI-compatible API).
"""

import json
import httpx
from rich.console import Console

from config import Config

console = Console()


class LLMClient:
    """Client for the local vLLM server running Llama 3.1 70B."""

    def __init__(self):
        self.base_url = Config.VLLM_BASE_URL
        self.model = Config.VLLM_MODEL
        self.client = httpx.Client(timeout=120.0)

    def chat(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> str:
        """Send a chat completion request to the vLLM server."""
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or Config.LLM_TEMPERATURE,
            "max_tokens": max_tokens or Config.LLM_MAX_TOKENS,
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            response = self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            console.print(f"[red]LLM HTTP error: {e.response.status_code}[/red]")
            console.print(f"[red]{e.response.text[:500]}[/red]")
            raise
        except Exception as e:
            console.print(f"[red]LLM error: {e}[/red]")
            raise

    def chat_json(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict:
        """Send a chat request and parse the response as JSON."""
        raw = self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=True,
        )
        # Try to extract JSON from the response
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Try to find JSON block in the response
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(raw[start:end])
            raise ValueError(f"Could not parse JSON from LLM response: {raw[:200]}")

    def is_healthy(self) -> bool:
        """Check if the vLLM server is running and healthy."""
        try:
            resp = self.client.get(f"{self.base_url.replace('/v1', '')}/health")
            return resp.status_code == 200
        except Exception:
            return False

    def close(self):
        self.client.close()
