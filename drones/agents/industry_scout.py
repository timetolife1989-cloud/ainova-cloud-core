"""
Ainova Drone System — Industry Scout Agent
Collects manufacturing industry data, KPIs, benchmarks, and standards.
"""

import os
from rich.console import Console

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage

console = Console()

PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "industry_scout_system.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


RESEARCH_TASKS = [
    {
        "category": "oee_benchmarks",
        "title": "OEE benchmarks by industry sector",
        "queries": [
            "OEE benchmark by industry sector 2024 2025 world class",
            "overall equipment effectiveness average manufacturing",
            "OEE availability performance quality benchmarks automotive electronics food",
        ],
    },
    {
        "category": "manufacturing_kpis",
        "title": "Complete manufacturing KPI catalog",
        "queries": [
            "manufacturing KPI list complete catalog production quality maintenance",
            "key performance indicators manufacturing plant formulas",
            "MTBF MTTR FPY cycle time takt time definitions formulas",
            "inventory KPIs turnover ratio days of supply manufacturing",
        ],
    },
    {
        "category": "production_types",
        "title": "Production types and measurement methods",
        "queries": [
            "discrete vs process vs batch manufacturing comparison",
            "manual production performance measurement piece rate time based",
            "semi automated production line KPI measurement",
            "fully automated production monitoring metrics",
        ],
    },
    {
        "category": "isa95_mesa",
        "title": "ISA-95 and MESA model for manufacturing software",
        "queries": [
            "ISA-95 levels 0 1 2 3 4 manufacturing explained",
            "MESA model MES functions 11 activities",
            "ISA-95 MES ERP integration architecture",
        ],
    },
    {
        "category": "shift_workforce",
        "title": "Shift patterns and workforce management in manufacturing",
        "queries": [
            "manufacturing shift patterns 2 shift 3 shift continental",
            "workforce KPIs manufacturing absenteeism productivity overtime",
            "shift scheduling optimization manufacturing",
        ],
    },
    {
        "category": "quality_standards",
        "title": "Quality standards for manufacturing (ISO, IATF)",
        "queries": [
            "ISO 9001 requirements manufacturing software features",
            "IATF 16949 automotive quality management system requirements",
            "quality management software features manufacturing SPC",
        ],
    },
    {
        "category": "hungarian_regulations",
        "title": "Hungarian manufacturing and labor regulations",
        "queries": [
            "Hungary labor law working hours manufacturing munka törvénykönyve",
            "Hungarian manufacturing regulations EU compliance",
            "GDPR manufacturing workforce data Hungary",
            "Hungarian payroll calculation rules shift work overtime",
        ],
    },
    {
        "category": "predictive_maintenance_data",
        "title": "Predictive maintenance data patterns and models",
        "queries": [
            "predictive maintenance machine learning manufacturing data",
            "equipment failure prediction vibration temperature patterns",
            "MTBF prediction machine learning industrial",
            "NASA turbofan predictive maintenance dataset approach",
        ],
    },
]


class IndustryScout:
    """Collects manufacturing industry data and benchmarks."""

    def __init__(self, llm: LLMClient, scraper: WebScraper, storage: Storage):
        self.llm = llm
        self.scraper = scraper
        self.storage = storage
        self.results_count = 0

    async def run(self) -> int:
        """Execute all research tasks."""
        console.print(f"[bold cyan]Industry Scout starting — {len(RESEARCH_TASKS)} tasks[/bold cyan]")

        for i, task in enumerate(RESEARCH_TASKS):
            console.print(f"\n[bold]Task {i+1}/{len(RESEARCH_TASKS)}: {task['title']}[/bold]")
            try:
                await self._research_task(task)
            except Exception as e:
                console.print(f"[red]Task failed: {e}[/red]")
                continue

        self._generate_report()
        console.print(f"\n[bold green]Industry Scout finished — {self.results_count} results[/bold green]")
        return self.results_count

    async def _research_task(self, task: dict):
        """Research a single industry data task."""
        all_content = []

        for query in task["queries"]:
            results = await self.scraper.search_and_extract(query, max_pages=3)
            for r in results:
                if r.get("content"):
                    all_content.append({
                        "query": query,
                        "title": r["title"],
                        "url": r["url"],
                        "content": r["content"][:3000],
                    })

        if not all_content:
            console.print(f"  [yellow]No content found for {task['category']}[/yellow]")
            return

        console.print(f"  Analyzing {len(all_content)} sources with LLM...")

        content_text = ""
        for item in all_content[:8]:
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
                        f"Extract concrete data points, numbers, benchmarks, and formulas. "
                        f"Make it database-ready — structured arrays and objects."
                    ),
                },
            ],
            max_tokens=4096,
        )

        source_urls = list(set(item["url"] for item in all_content))

        self.storage.save_result(
            drone_type="industry_data",
            category=task["category"],
            title=analysis.get("title", task["title"]),
            content=analysis,
            summary=analysis.get("summary", ""),
            source_urls=source_urls,
            relevance_score=analysis.get("relevance_score", 0.8),
        )
        self.results_count += 1

    def _generate_report(self):
        """Generate a markdown summary report."""
        report = f"# Industry Scout Report — {self.results_count} findings\n\n"
        report += "## Data Categories Collected\n\n"
        report += "1. **OEE Benchmarks** — World-class, average, poor thresholds by sector\n"
        report += "2. **Manufacturing KPIs** — Complete catalog with formulas\n"
        report += "3. **Production Types** — Manual, semi-auto, full-auto measurement\n"
        report += "4. **ISA-95 / MESA** — Standards framework mapping\n"
        report += "5. **Shift & Workforce** — Patterns, KPIs, scheduling\n"
        report += "6. **Quality Standards** — ISO 9001, IATF 16949 features\n"
        report += "7. **Hungarian Regulations** — Labor law, GDPR, compliance\n"
        report += "8. **Predictive Maintenance** — ML data patterns\n\n"
        report += "## Integration Notes\n\n"
        report += "- OEE benchmarks → embed in OEE module as reference values\n"
        report += "- KPI catalog → seed data for reporting module\n"
        report += "- Production types → inform module configuration options\n"
        report += "- Standards → compliance checklist feature\n"
        report += "- Regulations → built-in legal compliance module\n"

        self.storage.save_markdown_report(
            drone_type="industry_data",
            filename="INDUSTRY_SCOUT_REPORT.md",
            content=report,
        )
