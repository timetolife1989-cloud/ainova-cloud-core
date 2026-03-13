"""
Ainova Drone System — Tech Scout Agent
Researches technical solutions for ACI's current problems.
"""

import os
from rich.console import Console

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage

console = Console()

# Load system prompt
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "tech_scout_system.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


# Research tasks ordered by priority (most critical ACI problems first)
RESEARCH_TASKS = [
    {
        "category": "nextjs_i18n_performance",
        "title": "Instant language switching in Next.js",
        "queries": [
            "next.js app router i18n instant language switch without page reload",
            "react i18next client side language switch performance",
            "next-intl vs react-i18next performance comparison Next.js 14 15",
            "preload all translations client side next.js",
        ],
    },
    {
        "category": "nextjs_performance",
        "title": "Next.js App Router performance optimization",
        "queries": [
            "next.js app router slow performance optimization 2025",
            "react server components performance best practices",
            "next.js bundle size reduction techniques",
            "next.js dynamic import lazy loading components",
        ],
    },
    {
        "category": "manufacturing_dashboard_ui",
        "title": "Modern manufacturing dashboard UI/UX",
        "queries": [
            "manufacturing dashboard UI design modern 2024 2025",
            "MES software user interface best practices",
            "industrial SaaS dashboard layout patterns tailwind",
            "react dashboard template manufacturing production",
        ],
    },
    {
        "category": "multi_tenant_saas",
        "title": "Multi-tenant SaaS architecture in Next.js",
        "queries": [
            "multi-tenant next.js app architecture patterns",
            "supabase row level security multi-tenant",
            "next.js middleware tenant routing",
        ],
    },
    {
        "category": "plc_communication",
        "title": "PLC communication implementation in Node.js",
        "queries": [
            "node.js S7 protocol PLC communication node-snap7",
            "modbus tcp node.js implementation industrial",
            "node-opcua OPC-UA client example",
            "mqtt industrial IoT node.js PLC data collection",
        ],
    },
    {
        "category": "realtime_dashboard",
        "title": "Real-time dashboard updates (SSE/WebSocket)",
        "queries": [
            "next.js server sent events SSE real-time updates",
            "react real-time dashboard websocket vs SSE",
            "manufacturing real-time production monitoring architecture",
        ],
    },
]


class TechScout:
    """Researches technical solutions for ACI's critical problems."""

    def __init__(self, llm: LLMClient, scraper: WebScraper, storage: Storage):
        self.llm = llm
        self.scraper = scraper
        self.storage = storage
        self.results_count = 0

    async def run(self) -> int:
        """Execute all research tasks. Returns number of results saved."""
        console.print(f"[bold cyan]Tech Scout starting — {len(RESEARCH_TASKS)} tasks[/bold cyan]")

        for i, task in enumerate(RESEARCH_TASKS):
            console.print(f"\n[bold]Task {i+1}/{len(RESEARCH_TASKS)}: {task['title']}[/bold]")
            try:
                await self._research_task(task)
            except Exception as e:
                console.print(f"[red]Task failed: {e}[/red]")
                continue

        # Generate summary report
        self._generate_report()

        console.print(f"\n[bold green]Tech Scout finished — {self.results_count} results[/bold green]")
        return self.results_count

    async def _research_task(self, task: dict):
        """Research a single task: search, extract, analyze, save."""
        all_content = []

        # Step 1: Search and extract content for each query
        for query in task["queries"]:
            results = await self.scraper.search_and_extract(query, max_pages=3)
            for r in results:
                if r.get("content"):
                    all_content.append({
                        "query": query,
                        "title": r["title"],
                        "url": r["url"],
                        "content": r["content"][:3000],  # Limit per source
                    })

        if not all_content:
            console.print(f"  [yellow]No content found for {task['category']}[/yellow]")
            return

        # Step 2: Have the LLM analyze all collected content
        console.print(f"  Analyzing {len(all_content)} sources with LLM...")

        # Prepare content summary for LLM (keep within token limits)
        content_text = ""
        for item in all_content[:8]:  # Max 8 sources
            content_text += f"\n--- Source: {item['url']} ---\n"
            content_text += f"Title: {item['title']}\n"
            content_text += item["content"][:2000] + "\n"

        analysis = self.llm.chat_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Research topic: {task['title']}\n"
                        f"Category: {task['category']}\n\n"
                        f"Here is the web content I collected:\n{content_text}\n\n"
                        f"Analyze this content and produce a structured JSON response "
                        f"following the output format in your system prompt. "
                        f"Focus on actionable, implementable solutions for ACI."
                    ),
                },
            ],
            max_tokens=4096,
        )

        # Step 3: Save result
        source_urls = list(set(item["url"] for item in all_content))
        relevance = analysis.get("solutions", [{}])[0].get("applicability_score", 0.7) if analysis.get("solutions") else 0.7

        self.storage.save_result(
            drone_type="tech_research",
            category=task["category"],
            title=analysis.get("title", task["title"]),
            content=analysis,
            summary=analysis.get("recommendation", ""),
            source_urls=source_urls,
            relevance_score=relevance,
        )
        self.results_count += 1

    def _generate_report(self):
        """Generate a markdown summary report of all findings."""
        report = f"# Tech Scout Report — {self.results_count} findings\n\n"
        report += "## Summary\n\n"
        report += "This report contains technical research results for improving ACI.\n"
        report += "Each finding includes actionable code snippets and implementation recommendations.\n\n"
        report += f"Results saved to Supabase `drone_results` table and `output/tech/` directory.\n\n"
        report += "## Priority Actions\n\n"
        report += "1. **Fix i18n performance** — see `nextjs_i18n_performance` results\n"
        report += "2. **Optimize Next.js bundle** — see `nextjs_performance` results\n"
        report += "3. **Redesign dashboard UI** — see `manufacturing_dashboard_ui` results\n"
        report += "4. **Implement multi-tenant** — see `multi_tenant_saas` results\n"
        report += "5. **Real PLC drivers** — see `plc_communication` results\n"
        report += "6. **Real-time updates** — see `realtime_dashboard` results\n"

        self.storage.save_markdown_report(
            drone_type="tech_research",
            filename="TECH_SCOUT_REPORT.md",
            content=report,
        )
