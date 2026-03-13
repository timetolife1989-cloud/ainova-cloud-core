"""
Ainova Drone System — Storage
Saves results to Supabase + local JSON/MD files.
"""

import json
import os
from datetime import datetime, timezone

from rich.console import Console

from config import Config

console = Console()


def _safe_json(obj):
    """Ensure an object is JSON-serializable by round-tripping through json.dumps."""
    return json.loads(json.dumps(obj, default=str, ensure_ascii=False))


class Storage:
    """Handles saving drone results to Supabase and local files."""

    def __init__(self):
        self.supabase = None
        try:
            from supabase import create_client
            if Config.SUPABASE_SERVICE_KEY:
                self.supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
        except Exception as e:
            console.print(f"[yellow]Supabase client init failed: {e}. Local-only mode.[/yellow]")
        self.session_id = Config.SESSION_ID
        self._ensure_output_dirs()

    def _ensure_output_dirs(self):
        """Create output directories if they don't exist."""
        for subdir in ["tech", "industry", "competitor"]:
            path = os.path.join(Config.OUTPUT_DIR, subdir)
            os.makedirs(path, exist_ok=True)

    def start_session(self, model_used: str, gpu_config: str = "2x RTX PRO 6000"):
        """Record the start of a drone session."""
        if not self.supabase:
            console.print(f"[yellow]Session started (local only): {self.session_id}[/yellow]")
            return
        try:
            self.supabase.table("drone_sessions").insert({
                "id": self.session_id,
                "model_used": model_used,
                "gpu_config": gpu_config,
                "status": "running",
            }).execute()
            console.print(f"[green]Session started: {self.session_id}[/green]")
        except Exception as e:
            console.print(f"[yellow]Failed to record session start: {e}[/yellow]")

    def end_session(self, total_results: int, cost_usd: float | None = None):
        """Record the end of a drone session."""
        if not self.supabase:
            console.print(f"[yellow]Session ended (local only): {self.session_id} ({total_results} results)[/yellow]")
            return
        try:
            self.supabase.table("drone_sessions").update({
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "total_results": total_results,
                "cost_usd": cost_usd,
                "status": "completed",
            }).eq("id", self.session_id).execute()
            console.print(f"[green]Session ended: {self.session_id} ({total_results} results)[/green]")
        except Exception as e:
            console.print(f"[yellow]Failed to record session end: {e}[/yellow]")

    def save_result(
        self,
        drone_type: str,
        category: str,
        title: str,
        content: dict,
        summary: str = "",
        source_urls: list[str] | None = None,
        relevance_score: float = 0.5,
    ) -> bool:
        """Save a single drone result to both Supabase and local file."""
        result_data = {
            "session_id": self.session_id,
            "drone_type": drone_type,
            "category": category,
            "title": title,
            "content": content,
            "summary": summary,
            "source_urls": source_urls or [],
            "relevance_score": relevance_score,
        }

        success = True

        # Save to Supabase
        if self.supabase:
            try:
                sb_data = {**result_data, "content": _safe_json(result_data["content"])}
                self.supabase.table("drone_results").insert(sb_data).execute()
                console.print(f"  [green]Supabase OK[/green] — {title[:60]}")
            except Exception as e:
                console.print(f"  [red]Supabase FAIL[/red] — {e}")
                success = False
        else:
            console.print(f"  [dim]Supabase skipped (local only)[/dim]")

        # Save to local JSON
        try:
            subdir_map = {
                "tech_research": "tech",
                "industry_data": "industry",
                "competitor_analysis": "competitor",
            }
            subdir = subdir_map.get(drone_type, drone_type)
            filename = f"{category}_{datetime.now().strftime('%H%M%S')}.json"
            filepath = os.path.join(Config.OUTPUT_DIR, subdir, filename)

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2, default=str)
            console.print(f"  [green]Local OK[/green] — {filepath}")
        except Exception as e:
            console.print(f"  [red]Local FAIL[/red] — {e}")
            success = False

        return success

    def save_markdown_report(self, drone_type: str, filename: str, content: str):
        """Save a markdown summary report to local output."""
        subdir_map = {
            "tech_research": "tech",
            "industry_data": "industry",
            "competitor_analysis": "competitor",
        }
        subdir = subdir_map.get(drone_type, drone_type)
        filepath = os.path.join(Config.OUTPUT_DIR, subdir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        console.print(f"[green]Report saved: {filepath}[/green]")

    def get_result_count(self) -> int:
        """Get total results for current session."""
        if not self.supabase:
            return 0
        try:
            resp = (
                self.supabase.table("drone_results")
                .select("id", count="exact")
                .eq("session_id", self.session_id)
                .execute()
            )
            return resp.count or 0
        except Exception:
            return 0
