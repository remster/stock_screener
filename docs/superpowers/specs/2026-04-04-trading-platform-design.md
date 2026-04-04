# Trading Management Platform - Spec 1: UI Shell + Strategy Engine + Fundamentals Scoring

**Date:** 2026-04-04
**Scope:** First of three specs. This one covers the new UI, strategy engine, and fundamentals scoring. Future specs cover IBKR integration and risk dashboard.

---

## 1. Overview

A personal trading management platform for weekly use. Log in once or twice a week, see stock picks from multiple configurable strategies, review fundamentals, and identify new entries. Read-only — no trade execution.

**Tech stack:**
- Next.js 15 (App Router) with TypeScript
- Tailwind CSS + shadcn/ui
- lightweight-charts (candlestick charts)
- yahoo-finance2 (npm package, data source)
- File-based caching (existing pattern)

**Replaces:** The current Create React App + Express proxy setup. All Express proxy logic migrates into Next.js API routes. Single process, single `npm start`.

---

## 2. Project Structure

```
stock-screener/
├── app/
│   ├── layout.tsx              # Shell: sidebar nav, dark/light mode
│   ├── page.tsx                # Dashboard
│   ├── strategies/
│   │   ├── page.tsx            # List all strategies, run them
│   │   └── [slug]/
│   │       ├── page.tsx        # Strategy results view
│   │       └── config/
│   │           └── page.tsx    # Edit thresholds for this strategy
│   ├── stock/
│   │   └── [symbol]/
│   │       └── page.tsx        # Stock detail (chart + fundamentals)
│   ├── glossary/
│   │   └── page.tsx            # Searchable fundamentals glossary
│   └── api/
│       ├── holdings/[ticker]/route.ts
│       ├── history/[symbol]/route.ts
│       ├── fundamentals/[symbol]/route.ts
│       └── screen/route.ts
├── lib/
│   ├── indicators/
│   │   ├── sma.ts
│   │   ├── rsi.ts
│   │   ├── support-resistance.ts
│   │   └── slope.ts
│   ├── fundamentals/
│   │   ├── score.ts            # Scoring model + thresholds
│   │   └── ratings.ts          # Green/yellow/red classification
│   ├── strategies/
│   │   ├── registry.ts         # Auto-discovers and lists all strategies
│   │   ├── types.ts            # Strategy interface
│   │   ├── elliots.ts          # Elliot's screen
│   │   └── sector-breakout.ts  # Sector breakout strategy
│   ├── cache.ts                # File-based caching + pruning
│   └── yahoo.ts                # Yahoo Finance wrapper
├── components/
│   ├── price-chart.tsx         # lightweight-charts (migrated)
│   ├── fundamentals-card.tsx   # Scored fundamentals display
│   ├── strategy-results-table.tsx
│   ├── progress-bar.tsx        # SSE-driven scan progress
│   └── nav.tsx                 # Sidebar navigation
```

---

## 3. Strategy Engine

### 3.1 Strategy Interface

Every strategy is a TS file that exports:

```ts
interface Strategy {
  slug: string;            // URL-friendly ID, e.g. "sector-breakout"
  name: string;            // Display name
  description: string;     // What this strategy looks for
  sectors: string[];       // Which ETFs to scan (e.g. ["XLK", "XLE"] or all)
  params: StrategyParam[]; // Configurable thresholds
  filter: (stock: StockData, params: Record<string, number>) => Record<string, boolean>;
  sort: (a: StockData, b: StockData) => number;
}

interface StrategyParam {
  key: string;             // e.g. "minMcap"
  label: string;           // e.g. "Min Market Cap ($B)"
  default: number;
  min?: number;
  max?: number;
  step?: number;
}
```

### 3.2 How It Works

1. Each strategy file exports a `Strategy` object.
2. `registry.ts` imports all strategy files and exposes them as a list.
3. The UI reads the registry to show available strategies with their configurable params.
4. When you run a strategy, the UI sends the slug + current param values to `/api/screen`.
5. The API route loads the strategy from the registry, iterates through ETF holdings, fetches price/fundamentals data (with caching), applies the filter, and streams results back via SSE.
6. The filter function returns a `Record<string, boolean>` — each key is a named condition, so you can see which filters passed/failed per stock.

### 3.3 Example — Elliot's Strategy

```ts
export const elliots: Strategy = {
  slug: "elliots",
  name: "Elliot's Screen",
  description: "Month-high breakouts with momentum confirmation",
  sectors: ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"],
  params: [
    { key: "minMcap", label: "Min Market Cap ($B)", default: 2, min: 0.5, step: 0.5 },
    { key: "maxRsi", label: "Max RSI(14)", default: 73, min: 30, max: 90 },
    { key: "monthDays", label: "Month High Lookback (days)", default: 30, min: 10, max: 90 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock, params) => ({
    monthHigh: monthHigh(stock.candles, params.monthDays),
    mcap: stock.summaryDetail.marketCap > params.minMcap * 1e9,
    rsi: stock.last.rsi14 <= params.maxRsi,
    fundamentals: stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: closestToSma(50, true),
};
```

### 3.4 Example — Sector Breakout Strategy

```ts
export const sectorBreakout: Strategy = {
  slug: "sector-breakout",
  name: "Sector Breakout",
  description: "Find top performers in sectors where the sector ETF's 50SMA is rising, volume is up, and individual stocks are breaking resistance",
  sectors: ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"],
  params: [
    { key: "smaWindow", label: "SMA Period", default: 50, min: 20, max: 200 },
    { key: "minSlopeAngle", label: "Min SMA Slope", default: 5, min: 0, max: 45 },
    { key: "volumeMultiplier", label: "Volume vs Avg Multiplier", default: 1.2, min: 1.0, step: 0.1 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock, params) => ({
    smaRising: smaSlope(stock.candles, params.smaWindow) > params.minSlopeAngle,
    volumeUp: stock.last.volume > params.volumeMultiplier * stock.summaryDetail.averageVolume10days,
    resistanceBreak: breaksResistance(stock),
    mrsiPositive: stock.last.rsi14 > 50,
    fundamentals: stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: (a, b) => smaSlope(b.candles, 50) - smaSlope(a.candles, 50),
};
```

### 3.5 Adding New Strategies

Create one new TS file in `lib/strategies/`, export a `Strategy` object, add it to the registry. The UI auto-generates the config form from the `params` array.

---

## 4. Fundamentals Scorecard

### 4.1 Data Source

Yahoo Finance `quoteSummary` with modules: `summaryDetail`, `financialData`, `price`, `defaultKeyStatistics`, `earningsTrend`.

### 4.2 Scoring Model

10 metrics, each scored 0-10 continuously (not bucketed), weighted into a composite score of 0-10.

| Category | Metric | Green (8-10) | Yellow (4-7) | Red (0-3) | Weight |
|---|---|---|---|---|---|
| Valuation | Forward P/E | < 15 | 15-30 | > 30 | 15% |
| Valuation | PEG Ratio | < 1.0 | 1.0-2.0 | > 2.0 | 10% |
| Valuation | Price/Book | < 3 | 3-8 | > 8 | 5% |
| Profitability | Profit Margin | > 20% | 10-20% | < 10% | 10% |
| Profitability | Return on Equity | > 20% | 10-20% | < 10% | 10% |
| Growth | Revenue Growth YoY | > 15% | 5-15% | < 5% | 10% |
| Growth | Earnings Growth YoY | > 15% | 5-15% | < 5% | 10% |
| Financial Health | Debt/Equity | < 0.5 | 0.5-1.5 | > 1.5 | 10% |
| Financial Health | Current Ratio | > 2.0 | 1.0-2.0 | < 1.0 | 10% |
| Dividend | Dividend Yield | > 2% | 0.5-2% | 0 or > 8% | 10% |

**Thresholds are configurable** in a settings file — tune them as you learn what matters.

### 4.3 Missing Data

If a metric is unavailable (e.g., newly listed stock), it scores 5 (neutral) and shows a grey indicator. The composite score adjusts weights to exclude missing metrics.

### 4.4 Sector-Relative Scoring

The scorecard also shows sector percentile for each metric (e.g., "this stock's P/E is in the 30th percentile for Technology"). Prevents blanket filtering of high-P/E sectors like tech.

### 4.5 Glossary

Every metric has a plain-English description: what it is, why it matters, what good/bad looks like. Accessible via:
- Info popup (click) next to each metric in the fundamentals card
- Dedicated searchable `/glossary` page

Glossary content lives in code alongside the scoring definitions — one source of truth.

### 4.6 As a Strategy Filter

Any strategy can include `minFundamentalsScore` as a configurable param to filter out fundamentally weak stocks. Individual metrics can also be used as filter conditions.

---

## 5. UI & Pages

### 5.1 Shell Layout

Sidebar navigation (collapsible) + main content area. Dark/light mode toggle.

**Sidebar:**
- Dashboard
- Strategies (expandable to show individual strategies)
- Glossary

### 5.2 Dashboard (`/`)

On app launch, all strategies begin running automatically with last-used params.

- One card per strategy
- Each card starts in "scanning" state — muted/grey with progress bar
- As a strategy completes, its card turns green and shows result count (e.g., "7 picks")
- Click the card to see results
- 0 matches → card turns yellow with "No picks"
- Space reserved for future IBKR portfolio/risk panel (Spec 2)

### 5.3 Strategies List (`/strategies`)

- Card per strategy: name, description, last run date, number of results
- "Run" button on each card
- "Run Side by Side" — select 2+ strategies, runs them, shows results in parallel columns
- "Configure" link to threshold editor

### 5.4 Strategy Config (`/strategies/[slug]/config`)

- Auto-generated form from strategy's `params` array
- Slider + number input per threshold
- "Reset to defaults" button
- Params persist to localStorage between sessions

### 5.5 Strategy Results (`/strategies/[slug]`)

- Progress bar (SSE-driven) while scanning
- Results table: symbol, name, price, sector, fundamentals score, per-filter pass/fail (colored dots)
- Click row to navigate to stock detail
- Sortable columns
- Filter breakdown at top (e.g., "482 scanned, 12 matched — mcap: 340, rsi: 180, monthHigh: 28, all: 12")

### 5.6 Side-by-Side View (`/strategies/compare`)

- Two or three strategy result panels next to each other
- Stocks appearing in multiple strategies get highlighted
- High-conviction picks visible at a glance

### 5.7 Stock Detail (`/stock/[symbol]`)

- Price chart (lightweight-charts): candles, volume, SMAs, support/resistance lines
- Fundamentals scorecard: all 10 metrics, color-coded, info popup per metric, composite score
- External links: Yahoo Finance, TradingView, Finviz, Tradevision
- Basic info: sector, market cap, 52-week range

### 5.8 Glossary (`/glossary`)

- Searchable list of all fundamental metrics with plain-English descriptions
- Also accessible via info popups on fundamentals cards

---

## 6. Data Flow & Caching

### 6.1 Strategy Run Flow

```
App launches → all strategies begin running with last-used params
        │
        ▼
For each strategy:
  POST /api/screen with { slug, params, sectors }
        │
        ▼
  API route opens SSE stream back to UI
        │
        ▼
  For each sector ETF:
    ├── Fetch holdings (cached, 1 week TTL)
    │       │
    │       ▼
    │   For each stock in holdings:
    │     ├── Fetch price history (cached per day per stock)
    │     ├── Fetch fundamentals (cached per stock, 24h TTL)
    │     ├── Compute indicators (SMA, RSI, slope, support/resistance)
    │     ├── Compute fundamentals score
    │     ├── Run strategy filter
    │     ├── SSE → progress update to UI
    │     └── If passes all filters → SSE → send result to UI
        │
        ▼
  SSE → "done" event with summary stats
```

### 6.2 Cache Rules

| Data | Cache key | TTL | Storage |
|---|---|---|---|
| ETF holdings | `{ticker}.json` | 1 week | `.cache/` |
| Daily candles | `{symbol}/{date}.json` | Permanent | `.cache/` |
| Fundamentals | `{symbol}/fundamentals.json` | 24 hours | `.cache/` |
| Strategy params | per strategy slug | Permanent | localStorage |

### 6.3 Cache Pruning

On app startup, walk `.cache/` directory and delete files with mtime older than 6 months. Configurable via `CACHE_MAX_AGE` constant. Runs once, synchronously, before the server starts listening.

### 6.4 SSE Progress Events

```
event: progress
data: { "scanned": 45, "total": 482, "matches": 3 }

event: result
data: { "symbol": "NVDA", "name": "NVIDIA Corp", ... }

event: done
data: { "scanned": 482, "matches": 12, "filterBreakdown": { "mcap": 340, "rsi": 180, ... } }
```

Results appear in the UI as they are found — no waiting for the full scan.

---

## 7. Error Handling

### 7.1 Yahoo Finance Failures

- Single stock fetch fails → log, skip, continue. Progress event includes `skipped` count. Results table shows "X stocks skipped due to data errors."
- Rate limiting → exponential backoff (1s start, 30s max). 3 failures → skip stock.
- Connection/auth issues → error banner on dashboard: "Yahoo Finance connection issue" with raw error.

### 7.2 Missing Data

- No fundamentals data → score = N/A (grey), `minFundamentalsScore` filter passes by default.
- Candle history shorter than indicator period → indicator returns `null`, filter condition fails, stock skipped.
- ETF holdings fetch fails → entire sector skipped, error shown per-sector in progress.

### 7.3 Cache Corruption

- Malformed JSON in cache → delete file, re-fetch. No crash.

### 7.4 UI Edge Cases

- 0 results → card shows "No picks" in yellow, results page shows filter breakdown.
- Navigate away during scan → scan continues server-side, results lost. Re-run to see them.
- Browser tab closed → scan abandoned. Re-run.

---

## 8. Testing

Unit tests (Vitest) for:
- Indicator calculations: SMA, RSI, slope, support/resistance — pure functions with fixture data
- Fundamentals scoring: given metrics, verify score and color ratings
- Strategy filters: given mock stock data, verify pass/fail per condition
- Cache pruning: verify old files are deleted

No E2E or integration tests for now. Personal tool — value is in correct math, not UI rendering.

---

## 9. Future Specs (Out of Scope)

- **Spec 2:** IBKR Client Portal API integration — portfolio positions, P&L, stop-loss verification, risk calculations (position/sector/portfolio level, both entry-to-stop and current-to-stop)
- **Spec 3:** Dashboard portfolio panel — IBKR positions and risk display alongside strategy picks

---

## 10. Migration Notes

This spec replaces the existing codebase:
- React (CRA) frontend → Next.js 15
- Express proxy (`holdings_per_eft/proxy.js`) → Next.js API routes
- `Screener.js` logic → `lib/strategies/` + `lib/indicators/`
- `PriceChart.js` → `components/price-chart.tsx`
- `sectors.js` → stays as-is, imported by strategies
- File-based cache pattern → preserved, enhanced with pruning
