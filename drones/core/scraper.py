"""
Ainova Drone System — Web Scraper
Headless browser scraping with Playwright + trafilatura for content extraction.
"""

import asyncio
import random
import time
from urllib.parse import quote_plus

import trafilatura
from playwright.async_api import async_playwright
from rich.console import Console

from config import Config

console = Console()


class WebScraper:
    """Headless web scraper using Playwright + trafilatura."""

    def __init__(self):
        self._browser = None
        self._playwright = None

    async def start(self):
        """Initialize the headless browser."""
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        console.print("[green]Browser started[/green]")

    async def stop(self):
        """Close the browser."""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        console.print("[yellow]Browser stopped[/yellow]")

    def _random_ua(self) -> str:
        return random.choice(Config.USER_AGENTS)

    async def search_google(self, query: str, num_results: int = 5) -> list[dict]:
        """Search Google and return a list of {title, url, snippet}."""
        results = []
        context = await self._browser.new_context(
            user_agent=self._random_ua(),
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        try:
            search_url = f"https://www.google.com/search?q={quote_plus(query)}&num={num_results + 5}&hl=en"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(random.randint(1000, 2500))

            # Extract search results
            items = await page.query_selector_all("div.g")
            for item in items[:num_results]:
                try:
                    title_el = await item.query_selector("h3")
                    link_el = await item.query_selector("a")
                    snippet_el = await item.query_selector("div[data-sncf], div.VwiC3b")

                    title = await title_el.inner_text() if title_el else ""
                    url = await link_el.get_attribute("href") if link_el else ""
                    snippet = await snippet_el.inner_text() if snippet_el else ""

                    if url and url.startswith("http"):
                        results.append({"title": title, "url": url, "snippet": snippet})
                except Exception:
                    continue
        except Exception as e:
            console.print(f"[red]Google search error for '{query}': {e}[/red]")
        finally:
            await context.close()

        return results

    async def fetch_page_content(self, url: str) -> str | None:
        """Fetch a page and extract its main text content using trafilatura."""
        context = await self._browser.new_context(
            user_agent=self._random_ua(),
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(random.randint(500, 1500))
            html = await page.content()

            # Use trafilatura to extract clean text
            text = trafilatura.extract(
                html,
                include_links=True,
                include_tables=True,
                favor_recall=True,
            )
            return text
        except Exception as e:
            console.print(f"[yellow]Failed to fetch {url}: {e}[/yellow]")
            return None
        finally:
            await context.close()
            # Polite delay
            await asyncio.sleep(Config.REQUEST_DELAY_SEC)

    async def search_and_extract(self, query: str, max_pages: int | None = None) -> list[dict]:
        """
        Search Google, then extract content from top results.
        Returns list of {title, url, snippet, content}.
        """
        max_pages = max_pages or Config.MAX_PAGES_PER_QUERY
        console.print(f"[cyan]Searching: {query}[/cyan]")

        search_results = await self.search_google(query, num_results=max_pages)
        console.print(f"  Found {len(search_results)} results")

        enriched = []
        for i, result in enumerate(search_results):
            console.print(f"  [{i+1}/{len(search_results)}] Fetching: {result['url'][:80]}...")
            content = await self.fetch_page_content(result["url"])
            enriched.append({
                **result,
                "content": content[:8000] if content else None,  # Limit content size
            })

        return enriched

    async def fetch_github_readme(self, repo_url: str) -> str | None:
        """Fetch README content from a GitHub repository."""
        # Convert github.com URL to raw README URL
        if "github.com" in repo_url:
            raw_url = repo_url.replace("github.com", "raw.githubusercontent.com")
            for branch in ["main", "master"]:
                readme_url = f"{raw_url}/{branch}/README.md"
                content = await self.fetch_page_content(readme_url)
                if content:
                    return content
        return None
