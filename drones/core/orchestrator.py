"""
Ainova Drone System — Orchestrator
Manages drone execution, coordinates agents, and tracks progress.
"""

import asyncio
import time
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage
from config import Config

console = Console()


class Orchestrator:
    """Coordinates drone agents, manages resources, and tracks execution."""

    def __init__(self):
        self.llm = LLMClient()
        self.scraper = WebScraper()
        self.storage = None
        self.total_results = 0
        self.start_time = None
        self.supabase_ok = False

    async def initialize(self):
        """Start all services and verify they are working."""
        console.print(Panel("[bold cyan]AINOVA DRONE SYSTEM — Initializing[/bold cyan]"))

        # Check vLLM
        console.print("Checking vLLM server...", end=" ")
        if not self.llm.is_healthy():
            console.print("[red]FAILED[/red]")
            console.print("[red]vLLM server is not running! Run setup.sh first.[/red]")
            raise RuntimeError("vLLM server not available")
        console.print("[green]OK[/green]")

        # Init storage
        console.print("Initializing storage...", end=" ")
        self.storage = Storage()
        console.print("[green]OK[/green]")

        # Check Supabase connectivity
        console.print("Checking Supabase...", end=" ")
        if self.storage.supabase:
            try:
                self.storage.supabase.table("drone_sessions").select("id").limit(1).execute()
                self.supabase_ok = True
                console.print("[green]OK[/green]")
            except Exception as e:
                console.print(f"[red]FAILED — {e}[/red]")
                console.print("[yellow]Will save locally only.[/yellow]")
                self.supabase_ok = False
        else:
            console.print("[yellow]Not configured — local-only mode[/yellow]")

        # Start browser
        console.print("Starting browser...", end=" ")
        await self.scraper.start()
        console.print("[green]OK[/green]")

        # Record session
        self.storage.start_session(model_used=Config.VLLM_MODEL)
        self.start_time = time.time()

        console.print(Panel(
            f"[bold green]READY[/bold green]\n"
            f"Session: {Config.SESSION_ID}\n"
            f"Model: {Config.VLLM_MODEL}\n"
            f"Output: {Config.OUTPUT_DIR}",
            title="Drone System Active"
        ))

    async def run_drone(self, drone_name: str):
        """Run a specific drone agent by name."""
        console.print(Panel(f"[bold yellow]Starting drone: {drone_name}[/bold yellow]"))
        drone_start = time.time()

        if drone_name == "tech_scout":
            from agents.tech_scout import TechScout
            agent = TechScout(self.llm, self.scraper, self.storage)
        elif drone_name == "industry_scout":
            from agents.industry_scout import IndustryScout
            agent = IndustryScout(self.llm, self.scraper, self.storage)
        elif drone_name == "competitor_scout":
            from agents.competitor_scout import CompetitorScout
            agent = CompetitorScout(self.llm, self.scraper, self.storage)
        else:
            console.print(f"[red]Unknown drone: {drone_name}[/red]")
            return

        try:
            results_count = await agent.run()
            self.total_results += results_count
            elapsed = time.time() - drone_start
            console.print(Panel(
                f"[bold green]Drone {drone_name} completed[/bold green]\n"
                f"Results: {results_count}\n"
                f"Time: {elapsed/60:.1f} min",
                title=f"{drone_name} — Done"
            ))
        except Exception as e:
            console.print(f"[red]Drone {drone_name} FAILED: {e}[/red]")
            import traceback
            traceback.print_exc()

    async def run_all(self, drones: list[str] | None = None):
        """Run all specified drones sequentially."""
        if drones is None:
            drones = ["tech_scout", "industry_scout", "competitor_scout"]

        console.print(Panel(
            f"[bold cyan]Running {len(drones)} drones:[/bold cyan]\n" +
            "\n".join(f"  {i+1}. {d}" for i, d in enumerate(drones)),
            title="Execution Plan"
        ))

        for drone_name in drones:
            await self.run_drone(drone_name)
            # Brief pause between drones
            await asyncio.sleep(2)

        await self.finalize()

    async def finalize(self):
        """Clean up and save final reports."""
        elapsed = time.time() - self.start_time if self.start_time else 0
        hours = elapsed / 3600
        estimated_cost = hours * 3.78  # $3.78/hr for 2x RTX PRO 6000

        # End session in Supabase
        if self.storage:
            self.storage.end_session(
                total_results=self.total_results,
                cost_usd=round(estimated_cost, 2),
            )

        # Close browser
        try:
            await self.scraper.stop()
        except Exception:
            pass
        try:
            self.llm.close()
        except Exception:
            pass

        console.print(Panel(
            f"[bold green]ALL DRONES COMPLETED[/bold green]\n\n"
            f"Total results: {self.total_results}\n"
            f"Total time: {elapsed/60:.1f} min\n"
            f"Estimated cost: ${estimated_cost:.2f}\n\n"
            f"Results saved to:\n"
            f"  Supabase: drone_results table\n"
            f"  Local: {Config.OUTPUT_DIR}/\n\n"
            f"[yellow]REMEMBER: Stop the RunPod pod to save money![/yellow]",
            title="Session Complete",
            border_style="green",
        ))
