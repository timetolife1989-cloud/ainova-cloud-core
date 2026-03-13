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


# Research tasks — code, UI, architecture, frameworks, everything for building ACI
RESEARCH_TASKS = [
    # === ROUND 1: Critical ACI fixes ===
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
        "title": "Modern manufacturing dashboard UI/UX patterns",
        "queries": [
            "manufacturing dashboard UI design modern 2024 2025",
            "MES software user interface best practices",
            "industrial SaaS dashboard layout patterns tailwind",
            "react dashboard template manufacturing production",
            "shadcn ui dashboard components data tables charts",
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
    # === ROUND 2: Real-time & IoT ===
    {
        "category": "plc_communication",
        "title": "PLC/IoT communication in Node.js",
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
            "supabase realtime subscriptions react dashboard",
        ],
    },
    # === ROUND 3: UI Components & Design System ===
    {
        "category": "react_component_patterns",
        "title": "React component architecture for enterprise SaaS",
        "queries": [
            "react compound component pattern enterprise",
            "react headless ui pattern reusable components",
            "react design system architecture scalable",
            "storybook component library manufacturing SaaS",
        ],
    },
    {
        "category": "tailwind_industrial_ui",
        "title": "Tailwind CSS industrial/manufacturing UI designs",
        "queries": [
            "tailwind css dashboard design system dark mode",
            "tailwind industrial monitoring UI components",
            "tremor react dashboard components charts tailwind",
            "recharts vs visx vs nivo react chart library comparison 2025",
        ],
    },
    {
        "category": "data_table_patterns",
        "title": "Advanced data tables for manufacturing data",
        "queries": [
            "tanstack table react advanced filtering sorting pagination",
            "react data grid manufacturing large dataset performance",
            "ag-grid vs tanstack table comparison features",
            "virtual scrolling large tables react performance",
        ],
    },
    # === ROUND 4: Database & API Architecture ===
    {
        "category": "supabase_advanced",
        "title": "Supabase advanced patterns for SaaS",
        "queries": [
            "supabase edge functions typescript patterns",
            "supabase database triggers automation",
            "supabase storage file uploads manufacturing documents",
            "supabase auth custom claims multi-tenant",
            "postgresql materialized views manufacturing reporting",
        ],
    },
    {
        "category": "api_design_patterns",
        "title": "API design patterns for manufacturing SaaS",
        "queries": [
            "next.js api routes best practices rate limiting validation",
            "REST API design manufacturing ERP integration patterns",
            "tRPC vs REST vs GraphQL next.js comparison 2025",
            "API versioning strategy SaaS application",
        ],
    },
    # === ROUND 5: Testing & Quality ===
    {
        "category": "testing_strategy",
        "title": "Testing strategy for Next.js SaaS applications",
        "queries": [
            "playwright end to end testing next.js application",
            "vitest unit testing react components best practices",
            "testing manufacturing software critical paths",
            "CI CD pipeline github actions next.js deployment",
        ],
    },
    {
        "category": "error_handling",
        "title": "Error handling and monitoring patterns",
        "queries": [
            "sentry error monitoring next.js setup best practices",
            "react error boundary patterns production",
            "structured logging next.js application pino winston",
            "manufacturing software audit trail implementation",
        ],
    },
    # === ROUND 6: Advanced Features ===
    {
        "category": "workflow_automation",
        "title": "No-code workflow automation engine patterns",
        "queries": [
            "no-code workflow builder react implementation",
            "rule engine javascript manufacturing automation",
            "n8n workflow automation self hosted architecture",
            "zapier like automation builder open source react",
        ],
    },
    {
        "category": "report_generation",
        "title": "Report generation and PDF export in React",
        "queries": [
            "react pdf generation manufacturing reports",
            "puppeteer pdf generation server side next.js",
            "excel export large dataset react manufacturing",
            "scheduled report generation node.js cron",
        ],
    },
    {
        "category": "ai_assistant_patterns",
        "title": "AI assistant integration patterns for SaaS",
        "queries": [
            "AI chat assistant integration react SaaS application",
            "function calling local LLM manufacturing data queries",
            "RAG retrieval augmented generation next.js implementation",
            "text to SQL natural language database query",
        ],
    },
    # === ROUND 7: Security & Auth ===
    {
        "category": "auth_rbac",
        "title": "Authentication and RBAC for manufacturing SaaS",
        "queries": [
            "supabase auth role based access control implementation",
            "next.js middleware authentication authorization patterns",
            "RBAC permission system manufacturing software roles",
            "row level security postgresql multi-tenant SaaS",
        ],
    },
    {
        "category": "security_best_practices",
        "title": "Security best practices for SaaS applications",
        "queries": [
            "next.js security headers CSP CORS configuration",
            "input validation sanitization next.js api routes",
            "OWASP top 10 next.js mitigation strategies",
            "secrets management environment variables production",
        ],
    },
    # === ROUND 8: DevOps & Deployment ===
    {
        "category": "docker_deployment",
        "title": "Docker deployment for Next.js + database",
        "queries": [
            "next.js docker production deployment best practices",
            "docker compose next.js mssql supabase setup",
            "next.js standalone output docker image optimization",
            "nginx reverse proxy next.js production configuration",
        ],
    },
    {
        "category": "monitoring_observability",
        "title": "Monitoring and observability for manufacturing SaaS",
        "queries": [
            "next.js application performance monitoring APM",
            "prometheus grafana monitoring manufacturing software",
            "health check endpoint patterns node.js application",
            "uptime monitoring SaaS application best practices",
        ],
    },
    # === ROUND 9: Advanced Manufacturing Features ===
    {
        "category": "digital_twin",
        "title": "Digital twin implementation for manufacturing",
        "queries": [
            "digital twin manufacturing implementation web technology",
            "3D visualization react three.js manufacturing plant",
            "real-time equipment status dashboard react",
            "digital twin data model manufacturing equipment",
        ],
    },
    {
        "category": "predictive_analytics",
        "title": "Predictive analytics for manufacturing in browser",
        "queries": [
            "tensorflow.js browser machine learning manufacturing",
            "predictive maintenance web application implementation",
            "time series forecasting javascript manufacturing",
            "anomaly detection real-time manufacturing data",
        ],
    },
    {
        "category": "shift_workforce_management",
        "title": "Shift and workforce management system design",
        "queries": [
            "shift scheduling algorithm manufacturing typescript",
            "workforce management dashboard react implementation",
            "attendance tracking system web application design",
            "overtime calculation labor law compliance software",
        ],
    },
    # === ROUND 10: Integration & Interop ===
    {
        "category": "sap_integration",
        "title": "SAP integration patterns for web applications",
        "queries": [
            "SAP RFC BAPI integration node.js connector",
            "SAP IDoc processing node.js middleware",
            "ERP integration patterns manufacturing MES",
            "SAP S4HANA API integration REST OData",
        ],
    },
    {
        "category": "fleet_management",
        "title": "Fleet and vehicle tracking system architecture",
        "queries": [
            "fleet management system web application architecture",
            "vehicle GPS tracking real-time map react",
            "fuel consumption tracking system design",
            "leaflet mapbox react fleet tracking dashboard",
        ],
    },
    # === ROUND 11: Access Control & Physical Integration ===
    {
        "category": "access_control_badge",
        "title": "Badge reader / RFID / NFC access control integration",
        "queries": [
            "RFID NFC badge reader web application integration",
            "employee access control system API REST integration",
            "time attendance system badge reader node.js",
            "HID Global RFID reader SDK web integration",
            "manufacturing employee badge tracking real-time web",
        ],
    },
    {
        "category": "vehicle_telematics",
        "title": "Vehicle telematics and OBD-II integration",
        "queries": [
            "OBD-II vehicle data collection node.js web application",
            "fleet GPS telematics API integration react dashboard",
            "vehicle fuel consumption tracking CAN bus web",
            "company car tracking mileage reporting automated system",
        ],
    },
    # === ROUND 12: ESG & Energy Monitoring ===
    {
        "category": "esg_energy_monitoring",
        "title": "ESG reporting and energy monitoring for manufacturing",
        "queries": [
            "manufacturing ESG reporting software implementation",
            "energy consumption monitoring manufacturing plant web dashboard",
            "carbon footprint calculation manufacturing software",
            "EU CSRD sustainability reporting manufacturing requirements 2025",
            "electricity gas water metering integration IoT manufacturing",
        ],
    },
    # === ROUND 13: Multi-language & CEE Expansion ===
    {
        "category": "cee_localization",
        "title": "Multi-language SaaS for Central-Eastern Europe",
        "queries": [
            "i18n SaaS application Polish Czech Slovak Romanian localization",
            "manufacturing software localization strategy CEE market",
            "number date currency formatting Central Eastern Europe countries",
            "react i18n pluralization rules Slavic languages",
        ],
    },
    # === ROUND 14: Notification & Alert System ===
    {
        "category": "notification_system",
        "title": "Real-time notification and alert system for manufacturing",
        "queries": [
            "manufacturing alert notification system email SMS push architecture",
            "web push notification service worker react implementation",
            "threshold based alerting system manufacturing KPI node.js",
            "escalation workflow notification manufacturing critical events",
        ],
    },
    # === ROUND 15: Security Hardening & Edge Security ===
    {
        "category": "edge_security_breach_detection",
        "title": "Edge security, breach detection, and automatic lockdown",
        "queries": [
            "next.js middleware rate limiting bot protection implementation",
            "real-time breach detection web application immediate lockdown",
            "edge computing security manufacturing SaaS on-premise",
            "automatic IP blocking brute force detection node.js",
            "WAF web application firewall self-hosted open source",
        ],
    },
    {
        "category": "anti_scraping_data_protection",
        "title": "Anti-scraping, anti-bot, and customer data protection",
        "queries": [
            "anti-scraping protection web application techniques 2025",
            "bot detection fingerprinting browser javascript",
            "API rate limiting sliding window token bucket node.js",
            "customer data protection B2B SaaS best practices",
            "data exfiltration prevention web application monitoring",
        ],
    },
    # === ROUND 16: GDPR & 2026 Regulatory Compliance ===
    {
        "category": "gdpr_2026_compliance",
        "title": "GDPR 2026 changes and EU data protection compliance",
        "queries": [
            "GDPR 2026 changes new regulations European Union",
            "EU data protection regulation changes 2025 2026",
            "GDPR compliance SaaS application implementation checklist",
            "data processing agreement DPA template manufacturing SaaS",
            "EU AI Act 2025 2026 compliance requirements SaaS",
        ],
    },
    {
        "category": "labor_law_compliance_2026",
        "title": "EU labor law and workforce management compliance 2026",
        "queries": [
            "EU labor law changes 2025 2026 workforce management software",
            "working time directive compliance software implementation",
            "employee data protection GDPR HR manufacturing",
            "Hungarian labor law munkajog 2025 2026 changes digital",
            "German Arbeitszeitgesetz working time tracking software compliance",
        ],
    },
    {
        "category": "data_sovereignty_encryption",
        "title": "Data sovereignty, encryption at rest, and zero-trust",
        "queries": [
            "data sovereignty EU manufacturing SaaS requirements",
            "encryption at rest PostgreSQL Supabase implementation",
            "zero trust architecture manufacturing SaaS next.js",
            "data residency requirements EU GDPR SaaS application",
            "field level encryption sensitive data web application node.js",
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
        report += "Comprehensive technical research for building ACI.\n"
        report += "Each finding includes actionable patterns, code snippets, and architecture recommendations.\n\n"
        report += f"Results in Supabase `drone_results` table and `output/tech_research/` directory.\n\n"
        report += "## Research Categories\n\n"
        categories = [t["category"] for t in RESEARCH_TASKS]
        for i, cat in enumerate(categories, 1):
            report += f"{i}. `{cat}`\n"

        self.storage.save_markdown_report(
            drone_type="tech_research",
            filename="TECH_SCOUT_REPORT.md",
            content=report,
        )
