"""
Ainova Drone System — Main Entry Point
Usage:
    python run.py                          # Run all drones
    python run.py --drone tech_scout       # Run specific drone
    python run.py --drone industry_scout
    python run.py --drone competitor_scout
    python run.py --check                  # Check system health only
"""

import asyncio
import sys
import click
from rich.console import Console
from rich.panel import Panel

from config import Config
from core.orchestrator import Orchestrator

console = Console()


@click.command()
@click.option("--drone", type=click.Choice(["tech_scout", "industry_scout", "competitor_scout"]), default=None, help="Run a specific drone (default: all)")
@click.option("--check", is_flag=True, help="Only check system health, don't run drones")
def main(drone: str | None, check: bool):
    """Ainova Drone System — Automated data collection agents."""

    console.print(Panel(
        "[bold cyan]"
        "    _    ___ _   _  _____     ___    \n"
        "   / \\  |_ _| \\ | |/ _ \\ \\   / / \\   \n"
        "  / _ \\  | ||  \\| | | | \\ \\ / / _ \\  \n"
        " / ___ \\ | || |\\  | |_| |\\ V / ___ \\ \n"
        "/_/   \\_\\___|_| \\_|\\___/  \\_/_/   \\_\\\n"
        "[/bold cyan]\n"
        "[bold white]DRONE SYSTEM v1.0[/bold white]",
        title="Ainova Cloud Intelligence",
        border_style="cyan",
    ))

    # Validate config
    errors = Config.validate()
    if errors:
        for err in errors:
            console.print(f"[red]Config error: {err}[/red]")
        console.print("\n[yellow]Fix your .env file and try again.[/yellow]")
        console.print("Copy .env.example to .env and fill in your values.")
        sys.exit(1)

    console.print(f"[dim]Session: {Config.SESSION_ID}[/dim]")
    console.print(f"[dim]Model: {Config.VLLM_MODEL}[/dim]")
    console.print(f"[dim]Output: {Config.OUTPUT_DIR}[/dim]")
    console.print()

    # Run
    asyncio.run(_run(drone, check))


async def _run(drone: str | None, check: bool):
    orchestrator = Orchestrator()

    try:
        await orchestrator.initialize()

        if check:
            console.print("[bold green]All systems healthy![/bold green]")
            return

        if drone:
            await orchestrator.run_drone(drone)
            await orchestrator.finalize()
        else:
            await orchestrator.run_all()

    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user. Saving progress...[/yellow]")
        await orchestrator.finalize()
    except Exception as e:
        console.print(f"\n[red]Fatal error: {e}[/red]")
        import traceback
        traceback.print_exc()
        try:
            await orchestrator.finalize()
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
