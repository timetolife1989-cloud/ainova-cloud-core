"""
Ainova Drone System — Translation Scout Agent
Crawls into ACI's own repo, compares hu/en/de i18n JSON files,
finds missing/broken translations, and generates fixes via LLM.
"""

import json
import os
import httpx
from rich.console import Console

from core.llm_client import LLMClient
from core.scraper import WebScraper
from core.storage import Storage

console = Console()

# Load system prompt
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "translation_scout_system.md")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

# ACI repo — raw file URLs for i18n JSONs
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/timetolife1989-cloud/ainova-cloud-core/main"
I18N_FILES = {
    "hu": f"{GITHUB_RAW_BASE}/lib/i18n/fallback/hu.json",
    "en": f"{GITHUB_RAW_BASE}/lib/i18n/fallback/en.json",
    "de": f"{GITHUB_RAW_BASE}/lib/i18n/fallback/de.json",
}

# Process keys in batches to stay within LLM token limits
BATCH_SIZE = 80


class TranslationScout:
    """Crawls ACI's own i18n files, finds gaps, generates translations via LLM."""

    def __init__(self, llm: LLMClient, scraper: WebScraper, storage: Storage):
        self.llm = llm
        self.scraper = scraper  # not used — direct HTTP fetch
        self.storage = storage
        self.results_count = 0

    async def run(self) -> int:
        """Execute translation audit + generation. Returns number of results saved."""
        console.print("[bold cyan]Translation Scout starting — fetching ACI i18n files[/bold cyan]")

        # Step 1: Fetch all JSON files from repo
        translations = await self._fetch_i18n_files()
        if not translations:
            console.print("[red]Could not fetch i18n files. Aborting.[/red]")
            return 0

        hu_keys = set(translations.get("hu", {}).keys())
        en_keys = set(translations.get("en", {}).keys())
        de_keys = set(translations.get("de", {}).keys())
        all_keys = hu_keys | en_keys | de_keys

        console.print(f"  HU: {len(hu_keys)} keys | EN: {len(en_keys)} keys | DE: {len(de_keys)} keys")
        console.print(f"  Total unique keys: {len(all_keys)}")

        # Step 2: Find missing keys per language
        missing = {
            "hu": sorted(all_keys - hu_keys),
            "en": sorted(all_keys - en_keys),
            "de": sorted(all_keys - de_keys),
        }
        total_missing = sum(len(v) for v in missing.values())
        console.print(f"  Missing — HU: {len(missing['hu'])} | EN: {len(missing['en'])} | DE: {len(missing['de'])}")

        if total_missing == 0:
            console.print("[bold green]All translations are complete! Running quality check only...[/bold green]")

        # Step 3: Generate missing translations in batches
        generated_translations: dict[str, dict[str, str]] = {"hu": {}, "en": {}, "de": {}}

        for lang, missing_keys in missing.items():
            if not missing_keys:
                continue

            console.print(f"\n[bold]Generating {len(missing_keys)} missing {lang.upper()} translations...[/bold]")

            for batch_start in range(0, len(missing_keys), BATCH_SIZE):
                batch_keys = missing_keys[batch_start:batch_start + BATCH_SIZE]
                batch_num = (batch_start // BATCH_SIZE) + 1
                total_batches = (len(missing_keys) + BATCH_SIZE - 1) // BATCH_SIZE
                console.print(f"  Batch {batch_num}/{total_batches} ({len(batch_keys)} keys)...")

                # Build context: show each missing key with its values in other languages
                context_lines = []
                for key in batch_keys:
                    existing = {}
                    for other_lang in ["hu", "en", "de"]:
                        if other_lang != lang and key in translations.get(other_lang, {}):
                            existing[other_lang] = translations[other_lang][key]
                    context_lines.append(f"  \"{key}\": existing={json.dumps(existing, ensure_ascii=False)}")

                context_text = "\n".join(context_lines)

                result = self.llm.chat_json(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": (
                                f"Generate {lang.upper()} translations for these missing keys.\n"
                                f"Each key has its values in other languages shown for context.\n\n"
                                f"Missing keys for {lang.upper()}:\n{context_text}\n\n"
                                f"Return a JSON object with ONLY the key-value pairs:\n"
                                f'{{"key.name": "translation", "key.name2": "translation2"}}\n\n'
                                f"Rules:\n"
                                f"- Use proper manufacturing/industrial B2B terminology\n"
                                f"- Preserve placeholders like {{count}}, {{name}}, @{{username}} exactly\n"
                                f"- Match the register and style of existing ACI translations"
                            ),
                        },
                    ],
                    max_tokens=4096,
                )

                if isinstance(result, dict):
                    generated_translations[lang].update(result)
                    console.print(f"    Generated {len(result)} translations")

        # Step 4: Quality check on existing translations
        console.print("\n[bold]Running quality check on existing translations...[/bold]")
        quality_issues = await self._quality_check(translations)

        # Step 5: Save results
        all_generated = {lang: vals for lang, vals in generated_translations.items() if vals}
        total_generated = sum(len(v) for v in all_generated.values())

        result_data = {
            "stats": {
                "total_keys": len(all_keys),
                "hu_keys": len(hu_keys),
                "en_keys": len(en_keys),
                "de_keys": len(de_keys),
                "missing_hu": len(missing["hu"]),
                "missing_en": len(missing["en"]),
                "missing_de": len(missing["de"]),
                "generated_total": total_generated,
            },
            "generated_translations": all_generated,
            "quality_issues": quality_issues,
            "missing_keys": {lang: keys for lang, keys in missing.items() if keys},
        }

        self.storage.save_result(
            drone_type="translation_audit",
            category="i18n_completeness",
            title=f"ACI Translation Audit — {total_missing} missing, {total_generated} generated",
            content=result_data,
            summary=f"Found {total_missing} missing translations, generated {total_generated}. Quality issues: {len(quality_issues)}",
            source_urls=[I18N_FILES["hu"], I18N_FILES["en"], I18N_FILES["de"]],
            relevance_score=1.0,
        )
        self.results_count += 1

        # Step 6: Save generated translations as separate JSON files for easy merge
        for lang, new_translations in all_generated.items():
            if new_translations:
                # Merge with existing
                full = {**translations.get(lang, {}), **new_translations}
                sorted_full = dict(sorted(full.items()))
                self.storage.save_markdown_report(
                    drone_type="translation_audit",
                    filename=f"{lang}_complete.json",
                    content=json.dumps(sorted_full, ensure_ascii=False, indent=2),
                )
                # Also save just the new keys for review
                self.storage.save_markdown_report(
                    drone_type="translation_audit",
                    filename=f"{lang}_new_keys.json",
                    content=json.dumps(dict(sorted(new_translations.items())), ensure_ascii=False, indent=2),
                )

        # Step 7: Generate report
        self._generate_report(result_data)

        console.print(f"\n[bold green]Translation Scout finished — {self.results_count} results[/bold green]")
        console.print(f"  Generated {total_generated} new translations")
        console.print(f"  Quality issues found: {len(quality_issues)}")
        return self.results_count

    async def _fetch_i18n_files(self) -> dict[str, dict[str, str]]:
        """Fetch hu.json, en.json, de.json from GitHub raw."""
        translations: dict[str, dict[str, str]] = {}

        async with httpx.AsyncClient(timeout=30) as client:
            for lang, url in I18N_FILES.items():
                try:
                    console.print(f"  Fetching {lang}.json from GitHub...")
                    resp = await client.get(url)
                    resp.raise_for_status()
                    translations[lang] = resp.json()
                    console.print(f"    [green]{lang}.json — {len(translations[lang])} keys[/green]")
                except Exception as e:
                    console.print(f"    [red]Failed to fetch {lang}.json: {e}[/red]")

        return translations

    async def _quality_check(self, translations: dict[str, dict[str, str]]) -> list[dict]:
        """Check existing translations for quality issues."""
        issues = []

        # Automated checks (no LLM needed)
        for lang, data in translations.items():
            for key, value in data.items():
                # Empty values
                if not value or not value.strip():
                    issues.append({"lang": lang, "key": key, "issue": "empty_value", "value": value})

                # Value same as key (untranslated placeholder)
                if value == key:
                    issues.append({"lang": lang, "key": key, "issue": "key_as_value", "value": value})

                # Placeholder mismatch vs Hungarian source
                if lang != "hu" and key in translations.get("hu", {}):
                    hu_val = translations["hu"][key]
                    hu_ph = self._extract_placeholders(hu_val)
                    val_ph = self._extract_placeholders(value)
                    if hu_ph and hu_ph != val_ph:
                        issues.append({
                            "lang": lang, "key": key, "issue": "placeholder_mismatch",
                            "expected": list(hu_ph), "found": list(val_ph),
                        })

        # LLM spot-check on a sample of 30 keys
        sample_keys = sorted(translations.get("hu", {}).keys())[:30]
        if sample_keys:
            sample_data = {}
            for key in sample_keys:
                sample_data[key] = {
                    lang: translations[lang].get(key, "MISSING")
                    for lang in ["hu", "en", "de"]
                }

            console.print(f"  LLM quality check on {len(sample_keys)} sample keys...")
            llm_result = self.llm.chat_json(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Check these existing ACI translations for quality issues.\n"
                            f"Look for: wrong register, wrong technical term, inconsistency, "
                            f"machine-translation artifacts, placeholder errors.\n\n"
                            f"Translations:\n{json.dumps(sample_data, ensure_ascii=False, indent=2)}\n\n"
                            f"Return a JSON object:\n"
                            f'{{"issues": [{{"key": "...", "lang": "...", "problem": "...", "suggestion": "..."}}]}}\n'
                            f"If all translations look good, return: {{\"issues\": []}}"
                        ),
                    },
                ],
                max_tokens=2048,
            )

            if isinstance(llm_result, dict) and llm_result.get("issues"):
                for issue in llm_result["issues"]:
                    issues.append({
                        "lang": issue.get("lang", "?"), "key": issue.get("key", "?"),
                        "issue": "quality", "problem": issue.get("problem", ""),
                        "suggestion": issue.get("suggestion", ""),
                    })

        return issues

    @staticmethod
    def _extract_placeholders(text: str) -> set[str]:
        """Extract {placeholder} and @{placeholder} patterns from text."""
        result = set()
        i = 0
        while i < len(text):
            # Check for @{ or {
            start = -1
            if text[i] == '{':
                start = i
            elif text[i] == '@' and i + 1 < len(text) and text[i + 1] == '{':
                start = i
                i += 1  # skip to {

            if start != -1:
                end = text.find('}', i)
                if end != -1:
                    result.add(text[start:end + 1])
                    i = end
            i += 1
        return result

    def _generate_report(self, data: dict):
        """Generate a summary report."""
        stats = data.get("stats", {})
        issues = data.get("quality_issues", [])

        report = "# Translation Scout Report\n\n"
        report += "## Summary\n\n"
        report += f"- Total unique keys: **{stats.get('total_keys', 0)}**\n"
        report += f"- HU: {stats.get('hu_keys', 0)} keys\n"
        report += f"- EN: {stats.get('en_keys', 0)} keys\n"
        report += f"- DE: {stats.get('de_keys', 0)} keys\n\n"
        report += "## Missing Translations\n\n"
        report += f"- HU missing: **{stats.get('missing_hu', 0)}**\n"
        report += f"- EN missing: **{stats.get('missing_en', 0)}**\n"
        report += f"- DE missing: **{stats.get('missing_de', 0)}**\n"
        report += f"- Total generated: **{stats.get('generated_total', 0)}**\n\n"

        if issues:
            report += "## Quality Issues\n\n"
            for issue in issues:
                report += f"- `{issue.get('key')}` ({issue.get('lang')}): {issue.get('issue')}"
                if issue.get("problem"):
                    report += f" — {issue['problem']}"
                if issue.get("suggestion"):
                    report += f" → {issue['suggestion']}"
                report += "\n"

        report += "\n## Output Files\n\n"
        report += "- `{lang}_complete.json` — Full merged translation file (existing + generated)\n"
        report += "- `{lang}_new_keys.json` — Only the newly generated keys (for review)\n"
        report += "\n## How to Apply\n\n"
        report += "1. Review `*_new_keys.json` files in `output/translation_audit/`\n"
        report += "2. Copy approved translations into `lib/i18n/fallback/{lang}.json`\n"
        report += "3. Or replace whole file with `*_complete.json` if all looks good\n"

        self.storage.save_markdown_report(
            drone_type="translation_audit",
            filename="TRANSLATION_SCOUT_REPORT.md",
            content=report,
        )
