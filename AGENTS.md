# AGENTS.md instructions for C:\Projects\VisaDesk AI

remember the history for this project

- how do I do USE THIS for the MD?

## Reusable templates

- **Tauri desktop wrapper** for any Vercel/web-hosted app (Windows .exe via WebView2):
  `C:\Projects\tauri-desktop-wrapper-recipe.md` — search-and-replace placeholders
  (APP_NAME, APP_URL, BUNDLE_ID, etc.), drop into repo, push, download .exe from CI artifact.

- **Desktop app framework decision guide** (Electron vs Tauri vs PWA):
  `C:\Projects\desktop-app-framework-decision.md` — read this BEFORE starting any
  new desktop wrapper. TL;DR: paid/commercial apps → Electron; tiny personal utility → Tauri.

## Apify scraping (global)

`APIFY_API_TOKEN` is set as a Windows user environment variable — available in every
Bash / PowerShell tool call across all projects. No per-project `.env` copy needed.
Plan: **Starter** ($29/month cap, pay-per-event billing). Check usage before big runs:
`curl -s -H "Authorization: Bearer $APIFY_API_TOKEN" https://api.apify.com/v2/users/me/limits`.

**Actors that worked well (validated 2026-04-25 on Lofty Villas Phuket scrape):**
- `compass/crawler-google-places` — Google Maps listings + reviews. Input: `{"searchStringsArray":["..."],"maxCrawledPlacesPerSearch":N,"maxReviews":N,"reviewsSort":"newest","language":"en"}`. ~$0.003/result.
- `maxcopell/tripadvisor` — TripAdvisor hotels/villas. Input: `{"startUrls":[{"url":"..."}],"includeHotels":true,"includeVacationRentals":true,"currency":"USD"}`. Note: `includeTags` is BOOLEAN-per-flag (includeHotels, includeRestaurants, etc.), not an array.
- `tri_angle/airbnb-rooms-urls-scraper` — Airbnb by room URL. Input: `{"startUrls":[{"url":"https://www.airbnb.com/rooms/ID"}],"currency":"USD","locale":"en-US"}`. ~$0.003/listing. Dedupes across runs. `host` field is null in output — verify host identity by curl-grepping the raw HTML for host ID.
- `tri_angle/airbnb-scraper` (location search) — for broad Phuket-style scrapes. **Warning: limit `maxListings` aggressively — scraping "all of Phuket" burned through 882 listings = $1.76 before I aborted.**

**Standard pattern for async runs:**
```bash
# Start run (returns run ID + dataset ID)
curl -s -X POST -H "Authorization: Bearer $APIFY_API_TOKEN" -H "Content-Type: application/json" \
  --data '{...}' "https://api.apify.com/v2/acts/USERNAME~ACTOR/runs"

# Poll status
curl -s -H "Authorization: Bearer $APIFY_API_TOKEN" "https://api.apify.com/v2/actor-runs/RUN_ID"

# Pull dataset when SUCCEEDED
curl -s -H "Authorization: Bearer $APIFY_API_TOKEN" "https://api.apify.com/v2/datasets/DATASET_ID/items?format=json"
```

Caveats: no `python3` in this environment — use `node -e` for JSON parsing. Bash `/tmp`
maps to `C:\Users\philg\AppData\Local\Temp\` so pass Windows paths to Node.

## Firecrawl scraping (global)

`FIRECRAWL_API_KEY` is set as a Windows user environment variable — available in every
shell across all projects. Free plan: 500 credits + 300 bonus available.
Check remaining: `curl -s -H "Authorization: Bearer $FIRECRAWL_API_KEY" https://api.firecrawl.dev/v2/team/credit-usage`.

**When to pick Firecrawl vs Apify:**
- **Firecrawl** — fast, clean markdown output of individual pages or small crawls. Best for: research reports where you want LLM-ready content; sites that need JS rendering but don't need a full actor; quick one-off scrapes; search-then-scrape workflows. 1 credit per page.
- **Apify** — better for structured data from platform-specific sources (Google Maps, TripAdvisor, Airbnb, LinkedIn, Instagram) where dedicated actors already know the selectors. Also better for high-volume crawls (thousands of pages) where per-credit cost matters less than having the right extractor.

**Key endpoints:**
```bash
# Scrape a single page → markdown (JS-rendered, cached 2h by default)
curl -s -X POST -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown"]}' \
  https://api.firecrawl.dev/v2/scrape

# Crawl (multi-page) — returns a job ID, then poll
curl -s -X POST -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","limit":20,"scrapeOptions":{"formats":["markdown"]}}' \
  https://api.firecrawl.dev/v2/crawl
curl -s -H "Authorization: Bearer $FIRECRAWL_API_KEY" https://api.firecrawl.dev/v2/crawl/JOB_ID

# Search (web search + auto-scrape results)
curl -s -X POST -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \
  -d '{"query":"...","limit":5,"scrapeOptions":{"formats":["markdown"]}}' \
  https://api.firecrawl.dev/v2/search

# Extract structured data via LLM (schema-driven)
curl -s -X POST -H "Authorization: Bearer $FIRECRAWL_API_KEY" -H "Content-Type: application/json" \
  -d '{"urls":["..."],"prompt":"Extract product name and price","schema":{...}}' \
  https://api.firecrawl.dev/v2/extract
```

**Useful options:** `"onlyMainContent":true` strips nav/footer · `"waitFor":2000` for slow JS · `"actions":[{"type":"click","selector":"..."}]` to click/type before scraping · `"proxy":"stealth"` for anti-bot sites (costs extra credits).

**Claim +300 bonus credits (one-time)** — run in any folder outside a real project to avoid scattered skill files:
```powershell
mkdir "$env:USERPROFILE\.Codex\firecrawl-init" -Force
cd "$env:USERPROFILE\.Codex\firecrawl-init"
npx -y firecrawl-cli@latest init --all -k $env:FIRECRAWL_API_KEY
```
