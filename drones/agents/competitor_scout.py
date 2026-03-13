"""
Ainova Drone System — Competitor Scout Agent
Analyzes competing manufacturing software products.
"""

import os
from rich.console import Console

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage

console = Console()

PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "competitor_scout_system.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


COMPETITORS = [
    # === WESTERN MES/MOM ===
    {
        "name": "Katana MRP",
        "website": "katana.com",
        "queries": [
            "Katana MRP tech stack architecture cloud infrastructure",
            "Katana MRP API documentation integrations features",
            "Katana MRP manufacturing features OEE production tracking",
        ],
    },
    {
        "name": "MRPeasy",
        "website": "mrpeasy.com",
        "queries": [
            "MRPeasy features manufacturing modules inventory production",
            "MRPeasy MRP software technology stack cloud",
            "MRPeasy API integration manufacturing workflow",
        ],
    },
    {
        "name": "Odoo Manufacturing",
        "website": "odoo.com",
        "queries": [
            "Odoo Manufacturing module architecture open source code",
            "Odoo MRP IoT integration PLC implementation",
            "Odoo manufacturing dashboard UI features 2025",
        ],
    },
    {
        "name": "Tulip",
        "website": "tulip.co",
        "queries": [
            "Tulip no-code manufacturing app platform architecture",
            "Tulip MES edge computing IoT connector features",
            "Tulip manufacturing analytics dashboard design",
        ],
    },
    {
        "name": "SFactrix",
        "website": "sfactrix.com",
        "queries": [
            "SFactrix cloud MES features OEE real-time monitoring",
            "SFactrix manufacturing execution system architecture",
        ],
    },
    {
        "name": "Prodsmart (Autodesk)",
        "website": "prodsmart.com",
        "queries": [
            "Prodsmart Autodesk Fusion Operations manufacturing features",
            "Prodsmart MES shop floor tracking IoT architecture",
        ],
    },
    # === EASTERN / ASIAN COMPETITORS (rapidly growing) ===
    {
        "name": "Supcon MES (China)",
        "website": "supcon.com",
        "queries": [
            "Supcon MES manufacturing execution system China features",
            "Chinese MES software market growth Europe expansion",
            "Supcon industrial automation software capabilities",
        ],
    },
    {
        "name": "Aegis Software (now global)",
        "website": "aiscorp.com",
        "queries": [
            "Aegis FactoryLogix MES features smart manufacturing",
            "Aegis software factory logistics traceability IIoT",
            "Aegis MES competitor analysis cloud vs on-premise",
        ],
    },
    {
        "name": "Doruk MES (Turkey)",
        "website": "doruk.com",
        "queries": [
            "Doruk MES Turkey manufacturing software features",
            "Turkish MES software manufacturers Eastern Europe",
            "Doruk ProManage MES OEE production tracking",
        ],
    },
    # === CEE DIRECT COMPETITORS ===
    {
        "name": "Aimtec (Czech Republic)",
        "website": "aimtec.cz",
        "queries": [
            "Aimtec DCIx MES manufacturing software Czech Republic",
            "Aimtec automotive supply chain manufacturing solution",
            "Czech manufacturing software companies MES ERP",
        ],
    },
    {
        "name": "ANT Solutions (Poland)",
        "website": "antsolutions.eu",
        "queries": [
            "ANT Solutions MES Poland smart factory features",
            "Polish MES software manufacturing OEE monitoring",
            "ANT MES system architecture cloud on-premise",
        ],
    },
    {
        "name": "Productivist / CEE MES Market",
        "website": "",
        "queries": [
            "Central Eastern Europe MES software market size growth",
            "Hungarian manufacturing digitalization Ipar 4.0 software",
            "Romania Poland Czech manufacturing software adoption",
            "CEE manufacturing Industry 4.0 investment trends 2025",
        ],
    },
]

MARKET_ANALYSIS_QUERIES = [
    "manufacturing MES software technology trends 2025 AI IoT cloud",
    "MES MOM software features SMB manufacturers need most",
    "manufacturing software open source vs commercial comparison",
    "best manufacturing software features small medium business 2025",
    "manufacturing SaaS technology stack architecture patterns",
    "MES software UI UX design trends modern manufacturing",
    # Eastern market growth
    "Chinese manufacturing software companies expanding Europe 2025",
    "Asian MES software market disruption pricing strategy",
    "Industry 4.0 software adoption Eastern Europe CEE 2025",
    # New revenue models
    "manufacturing software pricing model flat rate vs per user comparison",
    "SaaS manufacturing vertical software revenue models",
    # Access control & physical integration
    "manufacturing access control RFID NFC badge reader software integration",
    "employee time tracking badge reader manufacturing system",
    # ESG & energy
    "manufacturing ESG reporting software energy monitoring requirements EU",
    "carbon footprint tracking manufacturing software features 2025",
]


class CompetitorScout:
    """Analyzes competing manufacturing software products."""

    def __init__(self, llm: LLMClient, scraper: WebScraper, storage: Storage):
        self.llm = llm
        self.scraper = scraper
        self.storage = storage
        self.results_count = 0

    async def run(self) -> int:
        """Analyze all competitors + market gaps."""
        console.print(f"[bold cyan]Competitor Scout starting — {len(COMPETITORS)} competitors + market analysis[/bold cyan]")

        # Phase 1: Individual competitor analysis
        for i, comp in enumerate(COMPETITORS):
            console.print(f"\n[bold]Competitor {i+1}/{len(COMPETITORS)}: {comp['name']}[/bold]")
            try:
                await self._analyze_competitor(comp)
            except Exception as e:
                console.print(f"[red]Failed: {e}[/red]")
                continue

        # Phase 2: Market gap analysis
        console.print(f"\n[bold]Market Gap Analysis[/bold]")
        try:
            await self._market_gap_analysis()
        except Exception as e:
            console.print(f"[red]Market analysis failed: {e}[/red]")

        # Phase 3: Feature comparison matrix
        console.print(f"\n[bold]Feature Comparison Matrix[/bold]")
        try:
            await self._feature_matrix()
        except Exception as e:
            console.print(f"[red]Feature matrix failed: {e}[/red]")

        self._generate_report()
        console.print(f"\n[bold green]Competitor Scout finished — {self.results_count} results[/bold green]")
        return self.results_count

    async def _analyze_competitor(self, comp: dict):
        """Analyze a single competitor."""
        all_content = []

        for query in comp["queries"]:
            results = await self.scraper.search_and_extract(query, max_pages=3)
            for r in results:
                if r.get("content"):
                    all_content.append({
                        "title": r["title"],
                        "url": r["url"],
                        "content": r["content"][:3000],
                    })

        if not all_content:
            console.print(f"  [yellow]No content found for {comp['name']}[/yellow]")
            return

        console.print(f"  Analyzing {len(all_content)} sources with LLM...")

        content_text = ""
        for item in all_content[:6]:
            content_text += f"\n--- Source: {item['url']} ---\n"
            content_text += f"Title: {item['title']}\n"
            content_text += item["content"][:2500] + "\n"

        analysis = self.llm.chat_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Analyze this competitor: {comp['name']} ({comp['website']})\n\n"
                        f"Here is the web content I collected about them:\n{content_text}\n\n"
                        f"Produce a detailed competitor analysis JSON following the "
                        f"'Per Competitor' format in your system prompt. "
                        f"Be specific about features, pricing, strengths, weaknesses, "
                        f"and what ACI can learn from them."
                    ),
                },
            ],
            max_tokens=4096,
        )

        source_urls = list(set(item["url"] for item in all_content))

        self.storage.save_result(
            drone_type="competitor_analysis",
            category=f"competitor_{comp['name'].lower().replace(' ', '_')}",
            title=f"Competitor Analysis: {comp['name']}",
            content=analysis,
            summary=analysis.get("aci_opportunity", ""),
            source_urls=source_urls,
            relevance_score=0.85,
        )
        self.results_count += 1

    async def _market_gap_analysis(self):
        """Identify market gaps and opportunities."""
        all_content = []

        for query in MARKET_ANALYSIS_QUERIES:
            results = await self.scraper.search_and_extract(query, max_pages=3)
            for r in results:
                if r.get("content"):
                    all_content.append({
                        "title": r["title"],
                        "url": r["url"],
                        "content": r["content"][:3000],
                    })

        if not all_content:
            return

        console.print(f"  Analyzing {len(all_content)} sources for market gaps...")

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
                        f"Perform a MARKET GAP ANALYSIS for manufacturing MES/MOM software.\n\n"
                        f"Context: ACI is a Hungarian-developed modular manufacturing platform "
                        f"targeting SMB manufacturers (50-500 employees) in Hungary/CEE.\n\n"
                        f"Key question: What are the gaps in the market that ACI can fill? "
                        f"Focus on gaps that exist because of REAL DEMAND, not because nobody wants it.\n\n"
                        f"Here is market research content:\n{content_text}\n\n"
                        f"Produce a JSON with a 'gaps' array following the 'Market Gap Analysis' "
                        f"format in your system prompt. Include at least 5 specific gaps."
                    ),
                },
            ],
            max_tokens=4096,
        )

        source_urls = list(set(item["url"] for item in all_content))

        self.storage.save_result(
            drone_type="competitor_analysis",
            category="market_gap_analysis",
            title="Market Gap Analysis — Manufacturing MES/MOM",
            content=analysis,
            summary="Market gaps and opportunities for ACI",
            source_urls=source_urls,
            relevance_score=0.95,
        )
        self.results_count += 1

    async def _feature_matrix(self):
        """Generate a feature comparison matrix using all collected data."""
        analysis = self.llm.chat_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Based on your knowledge of manufacturing MES/MOM software, "
                        "create a comprehensive FEATURE COMPARISON MATRIX.\n\n"
                        "Compare these products: Katana MRP, MRPeasy, Odoo Manufacturing, "
                        "Tulip, SFactrix, Prodsmart, Aegis FactoryLogix, Doruk MES, "
                        "Aimtec DCIx, ANT Solutions MES, and ACI (Ainova Cloud Intelligence).\n\n"
                        "ACI features: production planning, inventory, quality, maintenance, OEE, "
                        "PLC/IoT connector, AI assistant, reporting, SAP integration, digital twin, "
                        "shift management, workforce tracking, fleet management, multi-language (HU/EN/DE), "
                        "on-premise + cloud, modular licensing, flat-rate pricing (not per-user).\n\n"
                        "Produce a JSON with:\n"
                        "1. 'matrix' — array of products with feature booleans\n"
                        "2. 'aci_advantages' — features ACI has that others lack\n"
                        "3. 'aci_missing' — critical features ACI should add\n"
                        "4. 'must_have_features' — features ALL competitors have (table stakes)\n"
                        "5. 'differentiator_features' — features almost nobody has (opportunity)\n"
                        "6. 'cee_market_specific' — features specifically important for Central-Eastern Europe\n"
                        "7. 'eastern_threat_assessment' — how Chinese/Turkish/Asian competitors threaten the CEE market"
                    ),
                },
            ],
            max_tokens=4096,
        )

        self.storage.save_result(
            drone_type="competitor_analysis",
            category="feature_comparison_matrix",
            title="Feature Comparison Matrix — ACI vs Competitors",
            content=analysis,
            summary="Comprehensive feature comparison across MES/MOM platforms",
            relevance_score=0.95,
        )
        self.results_count += 1

    def _generate_report(self):
        """Generate a markdown summary report."""
        report = f"# Competitor Scout Report — {self.results_count} findings\n\n"
        report += "## Competitors Analyzed\n\n"
        for comp in COMPETITORS:
            report += f"- **{comp['name']}** ({comp['website']})\n"
        report += "\n## Additional Analyses\n\n"
        report += "- **Market Gap Analysis** — Identifying real market opportunities\n"
        report += "- **Feature Comparison Matrix** — ACI vs all competitors\n\n"
        report += "## Key Outputs\n\n"
        report += "- Individual competitor profiles (features, pricing, strengths, weaknesses)\n"
        report += "- Market gaps with demand evidence\n"
        report += "- Feature must-haves vs differentiators\n"
        report += "- ACI advantages and missing features\n"

        self.storage.save_markdown_report(
            drone_type="competitor_analysis",
            filename="COMPETITOR_SCOUT_REPORT.md",
            content=report,
        )
