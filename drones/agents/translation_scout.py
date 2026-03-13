"""
Ainova Drone System — Translation Scout Agent
Searches GitHub for i18n JSON files in manufacturing/SaaS repos.
Extracts and analyzes translations to improve ACI's multi-language support.
"""

import os
from rich.console import Console

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage

console = Console()

# Load system prompt
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "translation_scout_system.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


# GitHub search queries to find i18n files in relevant repos
RESEARCH_TASKS = [
    # === ROUND 1: Manufacturing / MES i18n files ===
    {
        "category": "mes_translations",
        "title": "MES / Manufacturing Execution System translations",
        "queries": [
            "github MES manufacturing execution system i18n JSON translations",
            "site:github.com MES locales de.json manufacturing",
            "open source MES software multilingual German Hungarian translations",
            "manufacturing execution system open source i18n locale files",
        ],
    },
    {
        "category": "oee_quality_translations",
        "title": "OEE and quality management translations",
        "queries": [
            "github OEE overall equipment effectiveness i18n translations",
            "quality management SPC FMEA software localization files",
            "site:github.com quality control software locale json de hu",
            "manufacturing quality assurance open source translations German",
        ],
    },
    {
        "category": "cmms_maintenance_translations",
        "title": "CMMS / maintenance management translations",
        "queries": [
            "github CMMS maintenance management i18n locale JSON",
            "preventive maintenance software open source translations de en",
            "asset management system open source localization files",
            "TPM total productive maintenance software i18n translations",
        ],
    },
    # === ROUND 2: ERP / SAP related ===
    {
        "category": "erp_translations",
        "title": "ERP system translations (SAP, production, inventory)",
        "queries": [
            "open source ERP system i18n translations JSON German Hungarian",
            "github ERPNext locale translation manufacturing de hu",
            "site:github.com ERP locales production order material management",
            "odoo manufacturing module translations German Hungarian JSON",
        ],
    },
    {
        "category": "inventory_warehouse_translations",
        "title": "Inventory and warehouse management translations",
        "queries": [
            "warehouse management system WMS open source i18n JSON",
            "inventory management software locale translations de en",
            "supply chain management open source translations German",
            "stock management barcode scanning software localization",
        ],
    },
    # === ROUND 3: Enterprise SaaS UI patterns ===
    {
        "category": "saas_admin_ui_translations",
        "title": "Enterprise SaaS admin/dashboard UI translations",
        "queries": [
            "react admin dashboard i18n translations JSON de en hu",
            "github enterprise SaaS admin panel localization files",
            "site:github.com admin dashboard locale de.json en.json",
            "open source admin template multilingual German English JSON",
        ],
    },
    {
        "category": "rbac_auth_translations",
        "title": "RBAC, authentication, and user management translations",
        "queries": [
            "role based access control UI translations i18n JSON",
            "authentication login register form translations German",
            "user management admin panel locale files open source",
            "permissions roles users groups i18n translations de en",
        ],
    },
    {
        "category": "form_validation_error_translations",
        "title": "Form validation and error message translations",
        "queries": [
            "form validation error messages i18n German Hungarian JSON",
            "zod yup validation messages i18n locale translations",
            "common UI error messages translations de en multilingual",
            "react form validation localization patterns",
        ],
    },
    # === ROUND 4: Production & scheduling ===
    {
        "category": "production_planning_translations",
        "title": "Production planning and scheduling translations",
        "queries": [
            "production planning scheduling software i18n translations",
            "manufacturing planning open source locale de en JSON",
            "shift management workforce scheduling i18n translations",
            "capacity planning production order translations German",
        ],
    },
    {
        "category": "fleet_logistics_translations",
        "title": "Fleet management and logistics translations",
        "queries": [
            "fleet management open source software translations de en",
            "logistics tracking delivery management i18n JSON locale",
            "vehicle fleet tracking software localization German",
            "transport management system TMS i18n translations",
        ],
    },
    # === ROUND 5: CEE / Eastern European languages ===
    {
        "category": "polish_industrial_translations",
        "title": "Polish (pl) manufacturing and industrial translations",
        "queries": [
            "github open source software Polish pl.json manufacturing",
            "site:github.com locale pl.json production management",
            "Polish language industrial software i18n translations JSON",
            "MES ERP software Polish localization open source",
        ],
    },
    {
        "category": "czech_slovak_translations",
        "title": "Czech (cs) and Slovak (sk) industrial translations",
        "queries": [
            "github Czech cs.json manufacturing software translations",
            "Slovak sk.json industrial management open source locale",
            "Czech language ERP MES software i18n translations",
            "site:github.com locale cs.json sk.json enterprise SaaS",
        ],
    },
    {
        "category": "romanian_translations",
        "title": "Romanian (ro) industrial and enterprise translations",
        "queries": [
            "github Romanian ro.json manufacturing software translations",
            "Romanian language enterprise SaaS i18n locale JSON",
            "site:github.com locale ro.json production management",
            "open source software Romanian localization manufacturing",
        ],
    },
    # === ROUND 6: German industrial-specific ===
    {
        "category": "german_industrial_specific",
        "title": "German Industrie 4.0 and manufacturing terminology",
        "queries": [
            "Industrie 4.0 software i18n Deutsch Lokalisierung JSON",
            "Produktionsplanung Software Übersetzung i18n open source",
            "Fertigungssteuerung MES deutsche Übersetzungen locale",
            "Qualitätsmanagement Software i18n de.json open source",
        ],
    },
    # === ROUND 7: Reports and analytics ===
    {
        "category": "reporting_analytics_translations",
        "title": "Reporting, analytics, and KPI dashboard translations",
        "queries": [
            "reporting analytics dashboard i18n translations de en JSON",
            "KPI metrics dashboard open source locale translations",
            "data visualization chart analytics i18n German",
            "business intelligence dashboard translations multilingual",
        ],
    },
    # === ROUND 8: ESG and compliance ===
    {
        "category": "esg_compliance_translations",
        "title": "ESG, sustainability, and compliance translations",
        "queries": [
            "ESG sustainability reporting software i18n translations",
            "environmental compliance management translations de en",
            "carbon footprint energy monitoring i18n locale JSON",
            "CSRD sustainability reporting translations German",
        ],
    },
]


class TranslationScout:
    """Searches GitHub for i18n translation files relevant to ACI."""

    def __init__(self, llm: LLMClient, scraper: WebScraper, storage: Storage):
        self.llm = llm
        self.scraper = scraper
        self.storage = storage
        self.results_count = 0

    async def run(self) -> int:
        """Execute all research tasks. Returns number of results saved."""
        console.print(f"[bold cyan]Translation Scout starting — {len(RESEARCH_TASKS)} tasks[/bold cyan]")

        for i, task in enumerate(RESEARCH_TASKS):
            console.print(f"\n[bold]Task {i+1}/{len(RESEARCH_TASKS)}: {task['title']}[/bold]")
            try:
                await self._research_task(task)
            except Exception as e:
                console.print(f"[red]Task failed: {e}[/red]")
                continue

        # Generate summary report
        self._generate_report()

        console.print(f"\n[bold green]Translation Scout finished — {self.results_count} results[/bold green]")
        return self.results_count

    async def _research_task(self, task: dict):
        """Research a single task: search GitHub, extract i18n files, analyze with LLM."""
        all_content = []

        # Step 1: Search for repos with i18n files
        for query in task["queries"]:
            results = await self.scraper.search_and_extract(query, max_pages=3)
            for r in results:
                if r.get("content"):
                    all_content.append({
                        "query": query,
                        "title": r["title"],
                        "url": r["url"],
                        "content": r["content"][:4000],  # More content for translation extraction
                    })

        if not all_content:
            console.print(f"  [yellow]No content found for {task['category']}[/yellow]")
            return

        # Step 2: Have the LLM analyze and extract useful translations
        console.print(f"  Analyzing {len(all_content)} sources with LLM...")

        content_text = ""
        for item in all_content[:10]:  # More sources for translations
            content_text += f"\n--- Source: {item['url']} ---\n"
            content_text += f"Title: {item['title']}\n"
            content_text += item["content"][:3000] + "\n"

        analysis = self.llm.chat_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Research topic: {task['title']}\n"
                        f"Category: {task['category']}\n\n"
                        f"Here is the web content I collected from GitHub and related sites:\n{content_text}\n\n"
                        f"Analyze this content and find i18n translation files or translation patterns. "
                        f"Produce a structured JSON response following the output format in your system prompt. "
                        f"Focus on:\n"
                        f"1. Actual translation key-value pairs found (especially de/hu/en)\n"
                        f"2. Repository URL and license\n"
                        f"3. Quality assessment of the translations\n"
                        f"4. Specific keys/terms useful for ACI's manufacturing domain\n"
                        f"5. Any CEE language translations found (pl, cs, sk, ro)"
                    ),
                },
            ],
            max_tokens=4096,
        )

        # Step 3: Save result
        source_urls = list(set(item["url"] for item in all_content))
        quality = analysis.get("quality_score", 0.7) if isinstance(analysis, dict) else 0.7

        self.storage.save_result(
            drone_type="translation_research",
            category=task["category"],
            title=analysis.get("title", task["title"]) if isinstance(analysis, dict) else task["title"],
            content=analysis,
            summary=analysis.get("recommendation", "") if isinstance(analysis, dict) else "",
            source_urls=source_urls,
            relevance_score=quality,
        )
        self.results_count += 1

    def _generate_report(self):
        """Generate a markdown summary report of all translation findings."""
        report = f"# Translation Scout Report — {self.results_count} findings\n\n"
        report += "## Mission\n\n"
        report += "Find and extract high-quality i18n translations from open-source manufacturing/SaaS repos.\n"
        report += "Target languages: HU, EN, DE (primary) + PL, CS, SK, RO (CEE expansion).\n\n"
        report += "## Research Categories\n\n"
        categories = [t["category"] for t in RESEARCH_TASKS]
        for i, cat in enumerate(categories, 1):
            report += f"{i}. `{cat}` — {RESEARCH_TASKS[i-1]['title']}\n"
        report += f"\n## Output\n\n"
        report += f"Results in Supabase `drone_results` table and `output/translation_research/` directory.\n"
        report += "Use these findings to:\n"
        report += "- Fill missing translation keys\n"
        report += "- Improve manufacturing-specific terminology accuracy\n"
        report += "- Prepare PL/CS/SK/RO translations for CEE market launch\n"

        self.storage.save_markdown_report(
            drone_type="translation_research",
            filename="TRANSLATION_SCOUT_REPORT.md",
            content=report,
        )
