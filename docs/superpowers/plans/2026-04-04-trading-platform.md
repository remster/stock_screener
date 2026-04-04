# Trading Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js trading management platform with configurable stock screening strategies and fundamentals scoring, replacing the existing CRA + Express setup.

**Architecture:** Monolithic Next.js 15 app (App Router) with API routes replacing Express. Strategy definitions are TS files with configurable thresholds. Fundamentals scoring is a shared module used by both strategy filters and a standalone scorecard view. File-based caching preserved from existing code.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, lightweight-charts, yahoo-finance2, Vitest

**Spec:** `docs/superpowers/specs/2026-04-04-trading-platform-design.md`

---

## File Map

### New Files (grouped by responsibility)

**Project root:**
- `next.config.ts` — Next.js configuration
- `tsconfig.json` — TypeScript config
- `tailwind.config.ts` — Tailwind config
- `vitest.config.ts` — Test runner config
- `lib/types.ts` — Shared data types (Candle, StockData, etc.)

**Indicators (`lib/indicators/`):**
- `sma.ts` — Simple moving average calculation + insertion into candle array
- `rsi.ts` — Relative strength index
- `support-resistance.ts` — Swing high/low detection with volume confirmation and clustering
- `slope.ts` — SMA slope calculation over N periods

**Fundamentals (`lib/fundamentals/`):**
- `score.ts` — Scoring model: metric definitions, thresholds, weights, composite score calculation
- `ratings.ts` — Green/yellow/red classification + glossary descriptions

**Strategies (`lib/strategies/`):**
- `types.ts` — Strategy and StrategyParam interfaces
- `registry.ts` — Imports and exports all strategies as a list
- `elliots.ts` — Elliot's screen strategy
- `sector-breakout.ts` — Sector breakout strategy

**Data layer (`lib/`):**
- `cache.ts` — File-based cache: read, write, TTL check, pruning
- `yahoo.ts` — Yahoo Finance wrapper: chart data, quote summary, holdings fetching
- `sectors.ts` — Sector ETF definitions (migrated from src/sectors.js)

**API routes (`app/api/`):**
- `holdings/[ticker]/route.ts` — ETF holdings endpoint
- `history/[symbol]/route.ts` — Price history endpoint
- `fundamentals/[symbol]/route.ts` — Fundamentals data + score endpoint
- `screen/route.ts` — Strategy screening with SSE streaming

**Components (`components/`):**
- `nav.tsx` — Sidebar navigation
- `price-chart.tsx` — lightweight-charts candlestick + volume + SMA + S/R
- `fundamentals-card.tsx` — Scored fundamentals display with info popups
- `strategy-results-table.tsx` — Sortable results table with filter pass/fail dots
- `progress-bar.tsx` — SSE-driven scan progress
- `ui/` — shadcn/ui components (installed via CLI)

**Pages (`app/`):**
- `layout.tsx` — Root layout with sidebar, dark/light mode
- `page.tsx` — Dashboard: auto-run strategies, status cards
- `strategies/page.tsx` — Strategy list with run/configure actions
- `strategies/[slug]/page.tsx` — Strategy results view
- `strategies/[slug]/config/page.tsx` — Threshold editor
- `strategies/compare/page.tsx` — Side-by-side comparison
- `stock/[symbol]/page.tsx` — Stock detail: chart + fundamentals
- `glossary/page.tsx` — Searchable fundamentals glossary

**Tests (`__tests__/`):**
- `indicators/sma.test.ts`
- `indicators/rsi.test.ts`
- `indicators/support-resistance.test.ts`
- `indicators/slope.test.ts`
- `fundamentals/score.test.ts`
- `fundamentals/ratings.test.ts`
- `strategies/elliots.test.ts`
- `strategies/sector-breakout.test.ts`
- `cache.test.ts`

---

## Milestone 1: Runnable Next.js Shell

Goal: A working Next.js app with navigation that you can `npm run dev` and click through. No data, no logic — just the shell.

### Task 1: Scaffold Next.js project

**Files:**
- Create: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Modify: `package.json`

- [ ] **Step 1: Initialize Next.js in the existing repo**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted about overwriting existing files, accept. This will create the Next.js scaffold alongside existing files. The old `src/` directory stays untouched for now.

- [ ] **Step 2: Verify it runs**

Run: `npm run dev`

Expected: Next.js dev server starts on http://localhost:3000, shows default Next.js page.

- [ ] **Step 3: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

This creates `components/ui/` and configures the project for shadcn components.

- [ ] **Step 4: Install shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button card slider input table badge tabs dialog separator scroll-area progress sheet tooltip
```

- [ ] **Step 5: Install lightweight-charts**

Run:
```bash
npm install lightweight-charts
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 with Tailwind, shadcn/ui, lightweight-charts"
```

---

### Task 2: Shell layout with sidebar navigation

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Create the sidebar navigation component**

Create `components/nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Strategies", href: "/strategies" },
  { label: "Glossary", href: "/glossary" },
];

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r bg-muted/40 transition-all ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-semibold">Stock Screener</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={collapsed ? "mx-auto" : "ml-auto"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? ">>" : "<<"}
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                pathname === item.href
                  ? "bg-accent font-medium"
                  : "text-muted-foreground"
              } ${collapsed ? "text-center" : ""}`}
            >
              {collapsed ? item.label[0] : item.label}
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Screener",
  description: "Trading management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen">
          <Nav />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update dashboard placeholder**

Replace `app/page.tsx` with:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Strategy results will appear here on launch.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify layout renders**

Run: `npm run dev`

Expected: Page shows sidebar with "Stock Screener" title, Dashboard/Strategies/Glossary links, and main content area with "Dashboard" heading. Sidebar collapses when clicking "<<".

- [ ] **Step 5: Commit**

```bash
git add components/nav.tsx app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: add shell layout with collapsible sidebar navigation"
```

---

### Task 3: Placeholder pages

**Files:**
- Create: `app/strategies/page.tsx`, `app/strategies/[slug]/page.tsx`, `app/strategies/[slug]/config/page.tsx`, `app/strategies/compare/page.tsx`, `app/stock/[symbol]/page.tsx`, `app/glossary/page.tsx`

- [ ] **Step 1: Create all placeholder pages**

Create `app/strategies/page.tsx`:
```tsx
export default function StrategiesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Strategies</h1>
      <p className="text-muted-foreground">Strategy cards will appear here.</p>
    </div>
  );
}
```

Create `app/strategies/[slug]/page.tsx`:
```tsx
export default function StrategyResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Strategy Results</h1>
      <p className="text-muted-foreground">Results table will appear here.</p>
    </div>
  );
}
```

Create `app/strategies/[slug]/config/page.tsx`:
```tsx
export default function StrategyConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Strategy Configuration</h1>
      <p className="text-muted-foreground">Threshold sliders will appear here.</p>
    </div>
  );
}
```

Create `app/strategies/compare/page.tsx`:
```tsx
export default function ComparePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Compare Strategies</h1>
      <p className="text-muted-foreground">Side-by-side results will appear here.</p>
    </div>
  );
}
```

Create `app/stock/[symbol]/page.tsx`:
```tsx
export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Stock Detail</h1>
      <p className="text-muted-foreground">Chart and fundamentals will appear here.</p>
    </div>
  );
}
```

Create `app/glossary/page.tsx`:
```tsx
export default function GlossaryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Glossary</h1>
      <p className="text-muted-foreground">Fundamental metrics definitions will appear here.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify all routes work**

Run: `npm run dev`

Navigate to each route and confirm it renders:
- `http://localhost:3000/` — Dashboard
- `http://localhost:3000/strategies` — Strategies
- `http://localhost:3000/strategies/elliots` — Strategy Results
- `http://localhost:3000/strategies/elliots/config` — Strategy Config
- `http://localhost:3000/strategies/compare` — Compare
- `http://localhost:3000/stock/NVDA` — Stock Detail
- `http://localhost:3000/glossary` — Glossary

- [ ] **Step 3: Commit**

```bash
git add app/strategies app/stock app/glossary
git commit -m "feat: add placeholder pages for all routes"
```

---

**CHECKPOINT: Milestone 1 complete.** You now have a running Next.js app with sidebar navigation and all routes. Run `npm run dev`, click through pages, and confirm Next.js feels right before continuing.

---

## Milestone 2: Core Library — Types, Cache, Yahoo Wrapper

Goal: Shared types, file-based caching with pruning, and Yahoo Finance data fetching — all migrated from the existing Express proxy.

### Task 4: Shared data types

**Files:**
- Create: `lib/types.ts`, `lib/sectors.ts`

- [ ] **Step 1: Create shared types**

Create `lib/types.ts`:

```ts
export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: string | number | undefined; // for dynamic SMA keys like sma50
}

export interface SupportResistanceLevel {
  level: number;
  type: "support" | "resistance";
  strength: number;
  totalVolume: number;
  significance: number;
  tests: Array<Candle & { level: number; type: string }>;
}

export interface StockLast {
  close: number;
  volume: number;
  date: string;
  sma50: number | null;
  sma100: number | null;
  sma150: number | null;
  rsi14: number | null;
  support: SupportResistanceLevel[];
  resistance: SupportResistanceLevel[];
}

export interface StockData {
  symbol: string;
  name: string;
  candles: Candle[];
  last: StockLast;
  summaryDetail: {
    marketCap: number;
    forwardPE: number;
    trailingPE: number;
    priceToBook: number;
    pegRatio: number;
    dividendYield: number;
    averageVolume10days: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekHigh: number;
  };
  financialData: {
    profitMargins: number;
    returnOnEquity: number;
    revenueGrowth: number;
    earningsGrowth: number;
    debtToEquity: number;
    currentRatio: number;
  };
  defaultKeyStatistics: {
    pegRatio: number;
    forwardEps: number;
    trailingEps: number;
  };
  fundamentalsScore: number | null;
}

export interface ETFHolding {
  ticker: string;
  name: string;
  weight: number;
}
```

- [ ] **Step 2: Create sectors definition**

Create `lib/sectors.ts`:

```ts
export const sectors: Record<string, string> = {
  XLK: "Technology (XLK)",
  XLF: "Financials (XLF)",
  XLV: "Health Care (XLV)",
  XLE: "Energy (XLE)",
  XLI: "Industrials (XLI)",
  XLY: "Consumer Discretionary (XLY)",
  XLP: "Consumer Staples (XLP)",
  XLU: "Utilities (XLU)",
  XLB: "Materials (XLB)",
  XLRE: "Real Estate (XLRE)",
  XLC: "Communication (XLC)",
  IWM: "Russell 2000 Small Caps",
  ITA: "Aerospace and Defence",
};

export const ALL_SECTOR_SYMBOLS = Object.keys(sectors);
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/sectors.ts
git commit -m "feat: add shared data types and sector definitions"
```

---

### Task 5: File-based cache with pruning

**Files:**
- Create: `lib/cache.ts`, `__tests__/cache.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Set up Vitest**

Run:
```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing cache tests**

Create `__tests__/cache.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { cacheRead, cacheWrite, isCacheFresh, pruneCache } from "@/lib/cache";

const TEST_CACHE_DIR = path.join(__dirname, "../.cache-test");

describe("cache", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  it("writes and reads JSON from cache", () => {
    const data = { symbol: "AAPL", close: 150 };
    cacheWrite(TEST_CACHE_DIR, "AAPL/2024-01-01.json", data);
    const result = cacheRead(TEST_CACHE_DIR, "AAPL/2024-01-01.json");
    expect(result).toEqual(data);
  });

  it("returns null for missing cache file", () => {
    const result = cacheRead(TEST_CACHE_DIR, "MISSING/file.json");
    expect(result).toBeNull();
  });

  it("returns null and deletes corrupt JSON", () => {
    const filePath = path.join(TEST_CACHE_DIR, "bad.json");
    fs.writeFileSync(filePath, "not json{{{");
    const result = cacheRead(TEST_CACHE_DIR, "bad.json");
    expect(result).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("checks TTL freshness", () => {
    cacheWrite(TEST_CACHE_DIR, "fresh.json", { a: 1 });
    expect(isCacheFresh(TEST_CACHE_DIR, "fresh.json", 60_000)).toBe(true);
    expect(isCacheFresh(TEST_CACHE_DIR, "missing.json", 60_000)).toBe(false);
  });

  it("prunes files older than maxAge", () => {
    const filePath = path.join(TEST_CACHE_DIR, "old.json");
    fs.writeFileSync(filePath, "{}");
    // Set mtime to 7 months ago
    const oldTime = new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(filePath, oldTime, oldTime);

    const freshPath = path.join(TEST_CACHE_DIR, "new.json");
    fs.writeFileSync(freshPath, "{}");

    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
    pruneCache(TEST_CACHE_DIR, sixMonthsMs);

    expect(fs.existsSync(filePath)).toBe(false);
    expect(fs.existsSync(freshPath)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/cache.test.ts`

Expected: FAIL — module `@/lib/cache` not found.

- [ ] **Step 4: Implement cache module**

Create `lib/cache.ts`:

```ts
import fs from "fs";
import path from "path";

const DEFAULT_CACHE_DIR = path.resolve(process.cwd(), ".cache");
const DEFAULT_MAX_AGE = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months

export function ensureCacheDir(cacheDir: string = DEFAULT_CACHE_DIR): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

export function cacheWrite(
  cacheDir: string,
  key: string,
  data: unknown
): void {
  const filePath = path.join(cacheDir, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function cacheRead(cacheDir: string, key: string): unknown | null {
  const filePath = path.join(cacheDir, key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.length) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    fs.unlinkSync(filePath);
    return null;
  }
}

export function isCacheFresh(
  cacheDir: string,
  key: string,
  ttlMs: number
): boolean {
  const filePath = path.join(cacheDir, key);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stats = fs.statSync(filePath);
  return Date.now() - stats.mtimeMs < ttlMs;
}

export function pruneCache(
  cacheDir: string,
  maxAgeMs: number = DEFAULT_MAX_AGE
): void {
  if (!fs.existsSync(cacheDir)) return;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        // Remove empty directories
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } else {
        const stats = fs.statSync(fullPath);
        if (Date.now() - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  };

  walk(cacheDir);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/cache.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/cache.ts __tests__/cache.test.ts vitest.config.ts package.json
git commit -m "feat: add file-based cache module with pruning and tests"
```

---

### Task 6: Yahoo Finance wrapper

**Files:**
- Create: `lib/yahoo.ts`

- [ ] **Step 1: Install yahoo-finance2 at project root**

Run:
```bash
npm install yahoo-finance2
```

- [ ] **Step 2: Create Yahoo Finance wrapper**

Create `lib/yahoo.ts`:

```ts
import YahooFinance from "yahoo-finance2";
import { cacheRead, cacheWrite, isCacheFresh, ensureCacheDir } from "./cache";
import { Candle, ETFHolding } from "./types";
import fs from "fs";
import path from "path";

const yahooFinance = new YahooFinance({});
const CACHE_DIR = path.resolve(process.cwd(), ".cache");

const TTL = {
  HOLDINGS: 7 * 24 * 60 * 60 * 1000,    // 1 week
  FUNDAMENTALS: 24 * 60 * 60 * 1000,      // 24 hours
};

ensureCacheDir(CACHE_DIR);

// --- Holdings ---

async function fetchSSGAHoldings(ticker: string): Promise<ETFHolding[]> {
  const key = `holdings/${ticker.toLowerCase()}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    return cacheRead(CACHE_DIR, key) as ETFHolding[];
  }

  const { default: fetch } = await import("node-fetch");
  const { default: XLSX } = await import("xlsx");
  const url = `https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-${ticker.toLowerCase()}.xlsx`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch SSGA holdings: ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(buffer));
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet).slice(3) as Record<string, string>[];

  let tickerKey = "";
  for (const k in jsonData[0]) {
    if (k.includes("Select Sector SPDR")) {
      tickerKey = k;
      break;
    }
  }

  const result: ETFHolding[] = jsonData
    .filter((row) => tickerKey in row && row[tickerKey] !== "-")
    .map((row) => ({
      name: row["Fund Name:"] || "",
      ticker: row[tickerKey].replace(".", "-"),
      weight: parseFloat(row["__EMPTY_2"]) || 0,
    }));

  cacheWrite(CACHE_DIR, key, result);
  return result;
}

async function fetchIsharesHoldings(ticker: string): Promise<ETFHolding[]> {
  const upper = ticker.toUpperCase();
  const key = `holdings/${upper}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    return cacheRead(CACHE_DIR, key) as ETFHolding[];
  }

  const { default: fetch } = await import("node-fetch");
  const { parse } = await import("csv-parse/sync");
  const csvUrl = `https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=${upper}_holdings&dataType=fund`;

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch iShares holdings: ${res.statusText}`);

  const text = await res.text();
  const csvData = text.split("\n \n")[1];
  const records = parse(csvData, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

  const result: ETFHolding[] = records
    .filter((r) => r["Ticker"] && r["Name"])
    .map((r) => ({
      ticker: r["Ticker"].trim(),
      name: r["Name"].trim(),
      weight: parseFloat(r["Weight (%)"]) || 0,
    }));

  cacheWrite(CACHE_DIR, key, result);
  return result;
}

const SSGA_TICKERS = ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"];

export async function fetchHoldings(ticker: string): Promise<ETFHolding[]> {
  if (SSGA_TICKERS.includes(ticker.toUpperCase())) {
    return fetchSSGAHoldings(ticker);
  }
  return fetchIsharesHoldings(ticker);
}

// --- Price History ---

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchHistory(symbol: string, days: number): Promise<Candle[]> {
  const symbolDir = `history/${symbol}`;
  ensureCacheDir(path.join(CACHE_DIR, symbolDir));

  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - Math.ceil((days * 2) / 30));

  // Build date list
  const allDates: string[] = [];
  for (const d = new Date(past); d <= now; d.setDate(d.getDate() + 1)) {
    allDates.push(formatDate(new Date(d)));
  }

  // Read cached candles
  let candles: Candle[] = [];
  let firstMissing = 0;
  for (; firstMissing < allDates.length; firstMissing++) {
    const cached = cacheRead(CACHE_DIR, `${symbolDir}/${allDates[firstMissing]}.json`);
    if (cached === null) break;
    if (typeof cached === "object" && cached !== null && "date" in cached) {
      candles.push(cached as Candle);
    }
  }

  const missingDates = allDates.slice(firstMissing);

  if (missingDates.length > 0) {
    const from = new Date(missingDates[0]);
    const missingSet = new Set(missingDates);

    const chartResult = await yahooFinance.chart(symbol, {
      period1: from,
      period2: now,
      interval: "1d",
    });

    if (chartResult?.quotes) {
      for (const quote of chartResult.quotes) {
        const candle: Candle = {
          date: quote.date.toISOString(),
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
        };
        const dateStr = candle.date.split("T")[0];
        missingSet.delete(dateStr);
        cacheWrite(CACHE_DIR, `${symbolDir}/${dateStr}.json`, candle);
        candles.push(candle);
      }
    }

    // Fill holes (weekends/holidays) with empty files
    for (const missing of missingSet) {
      const filePath = path.join(CACHE_DIR, symbolDir, `${missing}.json`);
      if (!fs.existsSync(filePath)) {
        fs.closeSync(fs.openSync(filePath, "w"));
      }
    }
  }

  candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // Remove dupes
  candles = candles.filter((c, i) => i === 0 || c.date !== candles[i - 1].date);

  return candles;
}

// --- Fundamentals ---

export async function fetchFundamentals(symbol: string): Promise<Record<string, unknown> | null> {
  const key = `fundamentals/${symbol}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.FUNDAMENTALS)) {
    return cacheRead(CACHE_DIR, key) as Record<string, unknown>;
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "summaryDetail",
        "financialData",
        "price",
        "defaultKeyStatistics",
      ],
    });
    cacheWrite(CACHE_DIR, key, summary);
    return summary as unknown as Record<string, unknown>;
  } catch (e) {
    console.error(`Failed to fetch fundamentals for ${symbol}:`, e);
    return null;
  }
}
```

- [ ] **Step 3: Install missing deps at root**

Run:
```bash
npm install node-fetch xlsx csv-parse
```

- [ ] **Step 4: Commit**

```bash
git add lib/yahoo.ts package.json package-lock.json
git commit -m "feat: add Yahoo Finance wrapper with holdings, history, and fundamentals fetching"
```

---

**CHECKPOINT: Milestone 2 complete.** Types, caching, and data fetching layer are in place. All data access goes through `lib/yahoo.ts` and `lib/cache.ts`.

---

## Milestone 3: Indicators

Goal: Pure functions for SMA, RSI, slope, and support/resistance — all TDD with Vitest.

### Task 7: SMA indicator

**Files:**
- Create: `lib/indicators/sma.ts`, `__tests__/indicators/sma.test.ts`

- [ ] **Step 1: Write failing SMA tests**

Create `__tests__/indicators/sma.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { insertSma } from "@/lib/indicators/sma";
import { Candle } from "@/lib/types";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  }));
}

describe("insertSma", () => {
  it("inserts sma3 values starting at index 2", () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    insertSma(candles, 3);
    expect(candles[0].sma3).toBeUndefined();
    expect(candles[1].sma3).toBeUndefined();
    expect(candles[2].sma3).toBeCloseTo(20);
    expect(candles[3].sma3).toBeCloseTo(30);
    expect(candles[4].sma3).toBeCloseTo(40);
  });

  it("does nothing if fewer candles than period", () => {
    const candles = makeCandles([10, 20]);
    insertSma(candles, 3);
    expect(candles[0].sma3).toBeUndefined();
    expect(candles[1].sma3).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/indicators/sma.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SMA**

Create `lib/indicators/sma.ts`:

```ts
import { Candle } from "@/lib/types";

export function insertSma(candles: Candle[], period: number): void {
  if (candles.length < period) return;

  const key = `sma${period}`;
  let sum = 0;
  let tailIdx = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i - tailIdx >= period) {
      sum -= candles[tailIdx].close;
      tailIdx++;
    }
    if (i - tailIdx + 1 === period) {
      candles[i][key] = sum / period;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/indicators/sma.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/indicators/sma.ts __tests__/indicators/sma.test.ts
git commit -m "feat: add SMA indicator with tests"
```

---

### Task 8: RSI indicator

**Files:**
- Create: `lib/indicators/rsi.ts`, `__tests__/indicators/rsi.test.ts`

- [ ] **Step 1: Write failing RSI tests**

Create `__tests__/indicators/rsi.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rsi } from "@/lib/indicators/rsi";
import { Candle } from "@/lib/types";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  }));
}

describe("rsi", () => {
  it("returns null if not enough candles", () => {
    const candles = makeCandles([10, 20, 30]);
    expect(rsi(candles, 14)).toBeNull();
  });

  it("returns 100 when all changes are positive", () => {
    const closes = Array.from({ length: 16 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    expect(rsi(candles, 14)).toBe(100);
  });

  it("returns a value between 0 and 100 for mixed data", () => {
    const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00];
    const candles = makeCandles(closes);
    const result = rsi(candles, 14);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/indicators/rsi.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement RSI**

Create `lib/indicators/rsi.ts`:

```ts
import { Candle } from "@/lib/types";

export function rsi(candles: Candle[], period: number): number | null {
  const len = candles.length;
  if (len < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = len - period - 1; i < len - 1; i++) {
    const change = candles[i + 1].close - candles[i].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const lastChange = candles[len - 1].close - candles[len - 2].close;
  const gain = lastChange > 0 ? lastChange : 0;
  const loss = lastChange < 0 ? -lastChange : 0;

  avgGain = (avgGain * (period - 1) + gain) / period;
  avgLoss = (avgLoss * (period - 1) + loss) / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/indicators/rsi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/indicators/rsi.ts __tests__/indicators/rsi.test.ts
git commit -m "feat: add RSI indicator with tests"
```

---

### Task 9: Slope indicator

**Files:**
- Create: `lib/indicators/slope.ts`, `__tests__/indicators/slope.test.ts`

- [ ] **Step 1: Write failing slope tests**

Create `__tests__/indicators/slope.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { smaSlope } from "@/lib/indicators/slope";
import { Candle } from "@/lib/types";
import { insertSma } from "@/lib/indicators/sma";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  }));
}

describe("smaSlope", () => {
  it("returns positive slope for rising SMA", () => {
    // 60 candles trending up
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    insertSma(candles, 10);
    const slope = smaSlope(candles, 10);
    expect(slope).toBeGreaterThan(0);
  });

  it("returns negative slope for falling SMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i);
    const candles = makeCandles(closes);
    insertSma(candles, 10);
    const slope = smaSlope(candles, 10);
    expect(slope).toBeLessThan(0);
  });

  it("returns 0 if SMA data is insufficient", () => {
    const candles = makeCandles([10, 20]);
    expect(smaSlope(candles, 50)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/indicators/slope.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement slope**

Create `lib/indicators/slope.ts`:

```ts
import { Candle } from "@/lib/types";

/**
 * Calculates the slope of an SMA over the last `lookback` candles.
 * Returns the slope in degrees (positive = rising, negative = falling).
 * Requires that insertSma has already been called on the candles.
 */
export function smaSlope(
  candles: Candle[],
  smaPeriod: number,
  lookback: number = 10
): number {
  const key = `sma${smaPeriod}`;
  const len = candles.length;

  // Find last N candles that have the SMA value
  const smaValues: number[] = [];
  for (let i = len - 1; i >= 0 && smaValues.length < lookback; i--) {
    const val = candles[i][key];
    if (typeof val === "number") {
      smaValues.unshift(val);
    }
  }

  if (smaValues.length < 2) return 0;

  // Linear regression slope
  const n = smaValues.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += smaValues[i];
    sumXY += i * smaValues[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  // Normalize: slope as percentage of average SMA value, then to degrees
  const avgSma = sumY / n;
  if (avgSma === 0) return 0;
  const normalizedSlope = (slope / avgSma) * 100;
  return Math.atan(normalizedSlope) * (180 / Math.PI);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/indicators/slope.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/indicators/slope.ts __tests__/indicators/slope.test.ts
git commit -m "feat: add SMA slope indicator with tests"
```

---

### Task 10: Support/Resistance indicator

**Files:**
- Create: `lib/indicators/support-resistance.ts`, `__tests__/indicators/support-resistance.test.ts`

- [ ] **Step 1: Write failing S/R tests**

Create `__tests__/indicators/support-resistance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { supportResistance } from "@/lib/indicators/support-resistance";
import { Candle } from "@/lib/types";

function makeCandle(i: number, low: number, high: number, close: number, volume: number): Candle {
  return {
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high,
    low,
    close,
    volume,
  };
}

describe("supportResistance", () => {
  it("finds a swing low as support", () => {
    // Create V-shape: prices go down then up
    const candles: Candle[] = [
      makeCandle(0, 99, 102, 101, 5000),
      makeCandle(1, 98, 101, 100, 5000),
      makeCandle(2, 97, 100, 99, 5000),
      makeCandle(3, 95, 97, 96, 8000), // swing low with high volume
      makeCandle(4, 97, 100, 99, 5000),
      makeCandle(5, 98, 101, 100, 5000),
      makeCandle(6, 99, 102, 101, 5000),
    ];
    const result = supportResistance(candles, 3);
    expect(result.supports.length).toBeGreaterThan(0);
    expect(result.supports[0].level).toBeCloseTo(95, 0);
  });

  it("finds a swing high as resistance", () => {
    const candles: Candle[] = [
      makeCandle(0, 99, 101, 100, 5000),
      makeCandle(1, 100, 102, 101, 5000),
      makeCandle(2, 101, 103, 102, 5000),
      makeCandle(3, 103, 106, 105, 8000), // swing high with high volume
      makeCandle(4, 101, 103, 102, 5000),
      makeCandle(5, 100, 102, 101, 5000),
      makeCandle(6, 99, 101, 100, 5000),
    ];
    const result = supportResistance(candles, 3);
    expect(result.resistances.length).toBeGreaterThan(0);
    expect(result.resistances[0].level).toBeCloseTo(106, 0);
  });

  it("returns empty arrays for insufficient data", () => {
    const candles = [makeCandle(0, 99, 101, 100, 1000)];
    const result = supportResistance(candles, 3);
    expect(result.supports).toEqual([]);
    expect(result.resistances).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/indicators/support-resistance.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement support/resistance**

Create `lib/indicators/support-resistance.ts`:

```ts
import { Candle, SupportResistanceLevel } from "@/lib/types";

interface SRResult {
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  rawSupports: Array<Candle & { level: number; type: string }>;
  rawResistances: Array<Candle & { level: number; type: string }>;
}

export function supportResistance(
  data: Candle[],
  window: number = 3,
  volumeThreshold: number = 1.2,
  priceClusterThreshold: number = 0.02
): SRResult {
  const supports: Array<Candle & { level: number; type: string }> = [];
  const resistances: Array<Candle & { level: number; type: string }> = [];

  for (let i = window; i < data.length - window; i++) {
    const current = data[i];
    let isSwingLow = true;
    let isSwingHigh = true;

    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (current.low >= data[j].low) isSwingLow = false;
      if (current.high <= data[j].high) isSwingHigh = false;
    }

    const neighborVolumes: number[] = [];
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      neighborVolumes.push(data[j].volume);
    }
    const avgVol = neighborVolumes.reduce((a, b) => a + b, 0) / neighborVolumes.length;
    const hasVolume = current.volume >= avgVol * volumeThreshold;

    if (isSwingLow && hasVolume) {
      supports.push({ ...current, level: current.low, type: "support" });
    }
    if (isSwingHigh && hasVolume) {
      resistances.push({ ...current, level: current.high, type: "resistance" });
    }
  }

  const clusterLevels = (
    levels: Array<Candle & { level: number; type: string }>,
    type: "support" | "resistance"
  ): SupportResistanceLevel[] => {
    if (levels.length === 0) return [];
    const sorted = [...levels].sort((a, b) => a.level - b.level);
    const clusters: Array<Array<Candle & { level: number; type: string }>> = [];
    let current = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i].level - current[0].level) / current[0].level;
      if (diff <= priceClusterThreshold) {
        current.push(sorted[i]);
      } else {
        clusters.push(current);
        current = [sorted[i]];
      }
    }
    clusters.push(current);

    return clusters
      .map((cluster) => {
        const avgLevel = cluster.reduce((s, p) => s + p.level, 0) / cluster.length;
        const totalVolume = cluster.reduce((s, p) => s + p.volume, 0);
        const testCount = cluster.length;
        return {
          level: avgLevel,
          type,
          strength: testCount,
          totalVolume,
          tests: cluster,
          significance: testCount * Math.log(totalVolume + 1),
        };
      })
      .sort((a, b) => b.significance - a.significance);
  };

  return {
    supports: clusterLevels(supports, "support"),
    resistances: clusterLevels(resistances, "resistance"),
    rawSupports: supports,
    rawResistances: resistances,
  };
}

/**
 * Checks if the latest candle's close breaks above the strongest resistance level.
 */
export function breaksResistance(candles: Candle[], window: number = 3): boolean {
  const sr = supportResistance(candles.slice(-150), window);
  if (sr.resistances.length === 0) return false;
  const lastClose = candles[candles.length - 1].close;
  return lastClose > sr.resistances[0].level;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/indicators/support-resistance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/indicators/support-resistance.ts __tests__/indicators/support-resistance.test.ts
git commit -m "feat: add support/resistance indicator with tests"
```

---

**CHECKPOINT: Milestone 3 complete.** All four indicators implemented with tests. Run `npx vitest run` to confirm all pass.

---

## Milestone 4: Fundamentals Scoring

Goal: Scoring model with 10 metrics, green/yellow/red ratings, glossary definitions, and composite score calculation.

### Task 11: Fundamentals ratings and glossary

**Files:**
- Create: `lib/fundamentals/ratings.ts`

- [ ] **Step 1: Create ratings and glossary definitions**

Create `lib/fundamentals/ratings.ts`:

```ts
export type Rating = "green" | "yellow" | "red" | "grey";

export interface MetricDefinition {
  key: string;
  label: string;
  category: "Valuation" | "Profitability" | "Growth" | "Financial Health" | "Dividend";
  weight: number;
  description: string;
  /** Maps a raw value to a 0-10 score. Higher is better. */
  score: (value: number) => number;
  /** Format the raw value for display */
  format: (value: number) => string;
  /** Where to find this value in Yahoo Finance quoteSummary */
  path: { module: string; field: string };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Inverse linear: lower raw value = higher score (good for P/E, debt ratios) */
function inverseLinear(value: number, best: number, worst: number): number {
  return clamp(((worst - value) / (worst - best)) * 10, 0, 10);
}

/** Linear: higher raw value = higher score (good for margins, growth) */
function linear(value: number, worst: number, best: number): number {
  return clamp(((value - worst) / (best - worst)) * 10, 0, 10);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const metricDefinitions: MetricDefinition[] = [
  {
    key: "forwardPE",
    label: "Forward P/E",
    category: "Valuation",
    weight: 0.15,
    description:
      "Current stock price divided by estimated earnings per share for the next 12 months. Tells you how much you're paying per dollar of expected future profit. Lower means cheaper relative to expected earnings. A stock at $100 with $5 expected EPS has a forward P/E of 20. Compare within the same sector — tech typically runs higher than utilities.",
    score: (v) => inverseLinear(v, 10, 40),
    format: (v) => v.toFixed(1),
    path: { module: "summaryDetail", field: "forwardPE" },
  },
  {
    key: "pegRatio",
    label: "PEG Ratio",
    category: "Valuation",
    weight: 0.10,
    description:
      "P/E ratio divided by earnings growth rate. Adjusts valuation for growth — a high P/E stock growing fast may still be cheap. PEG of 1.0 means you're paying fair value for growth. Below 1.0 is potentially undervalued, above 2.0 is expensive relative to growth.",
    score: (v) => inverseLinear(v, 0.5, 3.0),
    format: (v) => v.toFixed(2),
    path: { module: "defaultKeyStatistics", field: "pegRatio" },
  },
  {
    key: "priceToBook",
    label: "Price/Book",
    category: "Valuation",
    weight: 0.05,
    description:
      "Stock price divided by book value per share (assets minus liabilities). Shows what you're paying relative to the company's net asset value. Below 1.0 means the market values the company below its asset value. Very high P/B (above 8) suggests the stock is priced on growth expectations, not tangible assets.",
    score: (v) => inverseLinear(v, 1, 12),
    format: (v) => v.toFixed(2),
    path: { module: "defaultKeyStatistics", field: "priceToBook" },
  },
  {
    key: "profitMargin",
    label: "Profit Margin",
    category: "Profitability",
    weight: 0.10,
    description:
      "Net income as a percentage of revenue. Shows how much profit the company keeps from each dollar of sales after all expenses. Higher margins mean the company is more efficient at converting revenue to profit. Above 20% is strong, below 10% may indicate tight competition or high costs.",
    score: (v) => linear(v, 0, 0.30),
    format: pct,
    path: { module: "financialData", field: "profitMargins" },
  },
  {
    key: "returnOnEquity",
    label: "Return on Equity",
    category: "Profitability",
    weight: 0.10,
    description:
      "Net income divided by shareholder equity. Measures how effectively the company uses investor capital to generate profit. ROE of 20% means the company generates $0.20 profit for every $1 of equity. Consistently high ROE (above 15-20%) signals a strong competitive advantage.",
    score: (v) => linear(v, 0, 0.30),
    format: pct,
    path: { module: "financialData", field: "returnOnEquity" },
  },
  {
    key: "revenueGrowth",
    label: "Revenue Growth YoY",
    category: "Growth",
    weight: 0.10,
    description:
      "Percentage increase in revenue compared to the same quarter last year. Shows whether the company is expanding its sales. Above 15% is strong growth, 5-15% is moderate, below 5% may signal stagnation. Negative growth means the company is shrinking.",
    score: (v) => linear(v, -0.05, 0.25),
    format: pct,
    path: { module: "financialData", field: "revenueGrowth" },
  },
  {
    key: "earningsGrowth",
    label: "Earnings Growth YoY",
    category: "Growth",
    weight: 0.10,
    description:
      "Percentage increase in earnings compared to the same quarter last year. Earnings growth that outpaces revenue growth signals improving efficiency. Strong earnings growth (above 15%) drives stock price appreciation. Negative earnings growth is a warning sign.",
    score: (v) => linear(v, -0.05, 0.25),
    format: pct,
    path: { module: "financialData", field: "earningsGrowth" },
  },
  {
    key: "debtToEquity",
    label: "Debt/Equity",
    category: "Financial Health",
    weight: 0.10,
    description:
      "Total debt divided by total shareholder equity. Shows how much the company relies on borrowed money. Below 0.5 means conservative financing, above 1.5 means heavy debt. High debt increases risk during downturns because interest payments are mandatory regardless of revenue.",
    score: (v) => inverseLinear(v, 0, 200),
    format: (v) => v.toFixed(1),
    path: { module: "financialData", field: "debtToEquity" },
  },
  {
    key: "currentRatio",
    label: "Current Ratio",
    category: "Financial Health",
    weight: 0.10,
    description:
      "Current assets divided by current liabilities. Measures the company's ability to pay short-term obligations. Above 2.0 means strong liquidity, below 1.0 means the company may struggle to pay its bills. Very high ratios (above 4) may suggest the company is not investing its cash efficiently.",
    score: (v) => linear(v, 0.5, 3.0),
    format: (v) => v.toFixed(2),
    path: { module: "financialData", field: "currentRatio" },
  },
  {
    key: "dividendYield",
    label: "Dividend Yield",
    category: "Dividend",
    weight: 0.10,
    description:
      "Annual dividend payment divided by stock price, expressed as a percentage. Shows income return on your investment. 2-4% is a healthy yield. 0% means no dividends (common for growth stocks). Above 8% is a red flag — the dividend may be unsustainable or the stock price has crashed.",
    score: (v) => {
      if (v === 0) return 3; // No dividend — neutral-low, not terrible
      if (v > 0.08) return 2; // Suspiciously high
      return linear(v, 0, 0.04);
    },
    format: pct,
    path: { module: "summaryDetail", field: "dividendYield" },
  },
];

export function getRating(score: number): Rating {
  if (score >= 8) return "green";
  if (score >= 4) return "yellow";
  return "red";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/fundamentals/ratings.ts
git commit -m "feat: add fundamentals metric definitions, glossary, and rating logic"
```

---

### Task 12: Fundamentals scoring engine

**Files:**
- Create: `lib/fundamentals/score.ts`, `__tests__/fundamentals/score.test.ts`

- [ ] **Step 1: Write failing score tests**

Create `__tests__/fundamentals/score.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeFundamentalsScore, extractMetricValue } from "@/lib/fundamentals/score";

const goodStock = {
  summaryDetail: { forwardPE: 12, dividendYield: 0.025 },
  financialData: {
    profitMargins: 0.25,
    returnOnEquity: 0.22,
    revenueGrowth: 0.18,
    earningsGrowth: 0.20,
    debtToEquity: 30,
    currentRatio: 2.5,
  },
  defaultKeyStatistics: { pegRatio: 0.9, priceToBook: 2.5 },
};

const badStock = {
  summaryDetail: { forwardPE: 45, dividendYield: 0 },
  financialData: {
    profitMargins: 0.03,
    returnOnEquity: 0.04,
    revenueGrowth: -0.02,
    earningsGrowth: -0.05,
    debtToEquity: 180,
    currentRatio: 0.7,
  },
  defaultKeyStatistics: { pegRatio: 3.5, priceToBook: 15 },
};

describe("computeFundamentalsScore", () => {
  it("scores a fundamentally strong stock above 7", () => {
    const result = computeFundamentalsScore(goodStock);
    expect(result.composite).toBeGreaterThan(7);
  });

  it("scores a fundamentally weak stock below 3", () => {
    const result = computeFundamentalsScore(badStock);
    expect(result.composite).toBeLessThan(3);
  });

  it("returns individual metric scores", () => {
    const result = computeFundamentalsScore(goodStock);
    expect(result.metrics.length).toBe(10);
    expect(result.metrics[0]).toHaveProperty("key");
    expect(result.metrics[0]).toHaveProperty("value");
    expect(result.metrics[0]).toHaveProperty("score");
    expect(result.metrics[0]).toHaveProperty("rating");
  });

  it("handles missing data gracefully", () => {
    const partial = { summaryDetail: {}, financialData: {}, defaultKeyStatistics: {} };
    const result = computeFundamentalsScore(partial);
    expect(result.composite).toBeCloseTo(5, 0); // neutral
    result.metrics.forEach((m) => {
      if (m.value === null) {
        expect(m.rating).toBe("grey");
      }
    });
  });
});

describe("extractMetricValue", () => {
  it("extracts nested values", () => {
    const val = extractMetricValue(goodStock, "financialData", "profitMargins");
    expect(val).toBe(0.25);
  });

  it("returns null for missing fields", () => {
    const val = extractMetricValue({}, "financialData", "profitMargins");
    expect(val).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/fundamentals/score.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement scoring engine**

Create `lib/fundamentals/score.ts`:

```ts
import { metricDefinitions, getRating, Rating } from "./ratings";

export interface MetricResult {
  key: string;
  label: string;
  category: string;
  value: number | null;
  score: number;
  rating: Rating;
  formatted: string;
  description: string;
  weight: number;
}

export interface FundamentalsResult {
  composite: number;
  metrics: MetricResult[];
}

export function extractMetricValue(
  data: Record<string, unknown>,
  module: string,
  field: string
): number | null {
  const mod = data[module] as Record<string, unknown> | undefined;
  if (!mod) return null;
  const val = mod[field];
  if (typeof val !== "number" || isNaN(val)) return null;
  return val;
}

export function computeFundamentalsScore(
  data: Record<string, unknown>
): FundamentalsResult {
  const metrics: MetricResult[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const def of metricDefinitions) {
    const value = extractMetricValue(data, def.path.module, def.path.field);

    if (value === null) {
      metrics.push({
        key: def.key,
        label: def.label,
        category: def.category,
        value: null,
        score: 5,
        rating: "grey",
        formatted: "N/A",
        description: def.description,
        weight: def.weight,
      });
      // Don't count missing metrics in weighted average
      continue;
    }

    const score = def.score(value);
    const rating = getRating(score);

    metrics.push({
      key: def.key,
      label: def.label,
      category: def.category,
      value,
      score,
      rating,
      formatted: def.format(value),
      description: def.description,
      weight: def.weight,
    });

    weightedSum += score * def.weight;
    totalWeight += def.weight;
  }

  const composite = totalWeight > 0 ? weightedSum / totalWeight : 5;

  return { composite, metrics };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/fundamentals/score.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/fundamentals/score.ts __tests__/fundamentals/score.test.ts
git commit -m "feat: add fundamentals scoring engine with tests"
```

---

**CHECKPOINT: Milestone 4 complete.** Fundamentals scoring with 10 metrics, glossary descriptions, and composite score.

---

## Milestone 5: Strategy Engine

Goal: Strategy types, registry, and two concrete strategies (Elliot's + Sector Breakout) with tests.

### Task 13: Strategy types and registry

**Files:**
- Create: `lib/strategies/types.ts`, `lib/strategies/registry.ts`

- [ ] **Step 1: Create strategy types**

Create `lib/strategies/types.ts`:

```ts
import { StockData } from "@/lib/types";

export interface StrategyParam {
  key: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface Strategy {
  slug: string;
  name: string;
  description: string;
  sectors: string[];
  params: StrategyParam[];
  filter: (stock: StockData, params: Record<string, number>) => Record<string, boolean>;
  sort: (a: StockData, b: StockData) => number;
}
```

- [ ] **Step 2: Create registry (will be updated as strategies are added)**

Create `lib/strategies/registry.ts`:

```ts
import { Strategy } from "./types";

const strategies: Strategy[] = [];

export function registerStrategy(strategy: Strategy): void {
  strategies.push(strategy);
}

export function getStrategies(): Strategy[] {
  return [...strategies];
}

export function getStrategy(slug: string): Strategy | undefined {
  return strategies.find((s) => s.slug === slug);
}

// Import strategy files to trigger registration
// These will be added as strategies are created
```

- [ ] **Step 3: Commit**

```bash
git add lib/strategies/types.ts lib/strategies/registry.ts
git commit -m "feat: add strategy types and registry"
```

---

### Task 14: Elliot's strategy

**Files:**
- Create: `lib/strategies/elliots.ts`, `__tests__/strategies/elliots.test.ts`

- [ ] **Step 1: Write failing Elliot's strategy test**

Create `__tests__/strategies/elliots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { elliots, monthHigh } from "@/lib/strategies/elliots";
import { Candle, StockData } from "@/lib/types";

function makeCandles(closes: number[], volume: number = 1000): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  }));
}

describe("monthHigh", () => {
  it("returns true when recent candles break past month high", () => {
    // 30 days of flat prices, then a breakout
    const flat = Array(27).fill(100);
    const breakout = [105, 106, 107];
    const candles = makeCandles([...flat, ...breakout]);
    expect(monthHigh(candles, 30, 3, 2)).toBe(true);
  });

  it("returns false when recent candles are below month high", () => {
    const candles = makeCandles(Array(30).fill(100));
    expect(monthHigh(candles, 30, 3, 2)).toBe(false);
  });
});

describe("elliots.filter", () => {
  it("passes a stock meeting all criteria", () => {
    const flat = Array(27).fill(100);
    const breakout = [105, 106, 107];
    const stock = {
      candles: makeCandles([...flat, ...breakout]),
      summaryDetail: { marketCap: 5e9 },
      last: { rsi14: 60 },
      fundamentalsScore: 7,
    } as unknown as StockData;

    const params = { minMcap: 2, maxRsi: 73, monthDays: 30, minFundamentalsScore: 5 };
    const result = elliots.filter(stock, params);
    expect(result.monthHigh).toBe(true);
    expect(result.mcap).toBe(true);
    expect(result.rsi).toBe(true);
    expect(result.fundamentals).toBe(true);
  });

  it("fails stock with low market cap", () => {
    const stock = {
      candles: makeCandles(Array(30).fill(100)),
      summaryDetail: { marketCap: 500e6 },
      last: { rsi14: 60 },
      fundamentalsScore: 7,
    } as unknown as StockData;

    const params = { minMcap: 2, maxRsi: 73, monthDays: 30, minFundamentalsScore: 0 };
    const result = elliots.filter(stock, params);
    expect(result.mcap).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/strategies/elliots.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Elliot's strategy**

Create `lib/strategies/elliots.ts`:

```ts
import { Strategy } from "./types";
import { registerStrategy } from "./registry";
import { StockData, Candle } from "@/lib/types";
import { ALL_SECTOR_SYMBOLS } from "@/lib/sectors";

export function monthHigh(
  candles: Candle[],
  monthDays: number = 30,
  recentCount: number = 3,
  marginPcnt: number = 2
): boolean {
  const sliced = candles.slice(-monthDays);
  const past = sliced.slice(0, -recentCount);
  const recent = sliced.slice(-recentCount);

  if (past.length === 0 || recent.length === 0) return false;

  const recentMax = Math.max(...recent.map((c) => c.close));
  const pastMax = Math.max(...past.map((c) => c.close));

  return pastMax * (1 + marginPcnt / 100) < recentMax;
}

function closestToSma(days: number, normalize: boolean = true) {
  return (a: StockData, b: StockData): number => {
    const key = `sma${days}` as keyof typeof a.last;
    const aDist = a.last.close - ((a.last[key] as number) ?? a.last.close);
    const bDist = b.last.close - ((b.last[key] as number) ?? b.last.close);
    const aVal = normalize ? aDist / a.last.close : aDist;
    const bVal = normalize ? bDist / b.last.close : bDist;
    return aVal - bVal;
  };
}

export const elliots: Strategy = {
  slug: "elliots",
  name: "Elliot's Screen",
  description: "Month-high breakouts with momentum confirmation",
  sectors: ALL_SECTOR_SYMBOLS,
  params: [
    { key: "minMcap", label: "Min Market Cap ($B)", default: 2, min: 0.5, step: 0.5 },
    { key: "maxRsi", label: "Max RSI(14)", default: 73, min: 30, max: 90 },
    { key: "monthDays", label: "Month High Lookback (days)", default: 30, min: 10, max: 90 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock: StockData, params: Record<string, number>) => ({
    monthHigh: monthHigh(stock.candles, params.monthDays),
    mcap: stock.summaryDetail.marketCap > params.minMcap * 1e9,
    rsi: stock.last.rsi14 !== null && stock.last.rsi14 <= params.maxRsi,
    fundamentals:
      stock.fundamentalsScore === null || stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: closestToSma(50, true),
};

registerStrategy(elliots);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/strategies/elliots.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/strategies/elliots.ts __tests__/strategies/elliots.test.ts
git commit -m "feat: add Elliot's screening strategy with tests"
```

---

### Task 15: Sector Breakout strategy

**Files:**
- Create: `lib/strategies/sector-breakout.ts`, `__tests__/strategies/sector-breakout.test.ts`

- [ ] **Step 1: Write failing sector breakout test**

Create `__tests__/strategies/sector-breakout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sectorBreakout } from "@/lib/strategies/sector-breakout";
import { Candle, StockData } from "@/lib/types";
import { insertSma } from "@/lib/indicators/sma";

function makeCandles(closes: number[], volumes?: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close,
    high: close + 2,
    low: close - 2,
    close,
    volume: volumes?.[i] ?? 1000,
  }));
}

describe("sectorBreakout.filter", () => {
  it("passes stock with rising SMA, high volume, and positive RSI", () => {
    // Trending up: 60 candles going from 100 to 160
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    insertSma(candles, 50);

    const stock = {
      candles,
      last: {
        close: 160,
        volume: 5000,
        rsi14: 65,
        support: [],
        resistance: [],
      },
      summaryDetail: { averageVolume10days: 2000 },
      fundamentalsScore: 6,
    } as unknown as StockData;

    const params = { smaWindow: 50, minSlopeAngle: 1, volumeMultiplier: 1.2, minFundamentalsScore: 5 };
    const result = sectorBreakout.filter(stock, params);
    expect(result.smaRising).toBe(true);
    expect(result.volumeUp).toBe(true);
    expect(result.mrsiPositive).toBe(true);
    expect(result.fundamentals).toBe(true);
  });

  it("fails stock with falling SMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i);
    const candles = makeCandles(closes);
    insertSma(candles, 50);

    const stock = {
      candles,
      last: { close: 140, volume: 5000, rsi14: 35 },
      summaryDetail: { averageVolume10days: 2000 },
      fundamentalsScore: 6,
    } as unknown as StockData;

    const params = { smaWindow: 50, minSlopeAngle: 1, volumeMultiplier: 1.2, minFundamentalsScore: 0 };
    const result = sectorBreakout.filter(stock, params);
    expect(result.smaRising).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/strategies/sector-breakout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement sector breakout strategy**

Create `lib/strategies/sector-breakout.ts`:

```ts
import { Strategy } from "./types";
import { registerStrategy } from "./registry";
import { StockData } from "@/lib/types";
import { smaSlope } from "@/lib/indicators/slope";
import { breaksResistance } from "@/lib/indicators/support-resistance";
import { ALL_SECTOR_SYMBOLS } from "@/lib/sectors";

export const sectorBreakout: Strategy = {
  slug: "sector-breakout",
  name: "Sector Breakout",
  description:
    "Find top performers in sectors where the sector ETF's 50SMA is rising, volume is up, and individual stocks are breaking resistance",
  sectors: ALL_SECTOR_SYMBOLS,
  params: [
    { key: "smaWindow", label: "SMA Period", default: 50, min: 20, max: 200 },
    { key: "minSlopeAngle", label: "Min SMA Slope (degrees)", default: 5, min: 0, max: 45 },
    { key: "volumeMultiplier", label: "Volume vs Avg Multiplier", default: 1.2, min: 1.0, step: 0.1, max: 5.0 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock: StockData, params: Record<string, number>) => ({
    smaRising: smaSlope(stock.candles, params.smaWindow) > params.minSlopeAngle,
    volumeUp:
      stock.last.volume > params.volumeMultiplier * stock.summaryDetail.averageVolume10days,
    resistanceBreak: breaksResistance(stock.candles),
    mrsiPositive: stock.last.rsi14 !== null && stock.last.rsi14 > 50,
    fundamentals:
      stock.fundamentalsScore === null || stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: (a: StockData, b: StockData) => smaSlope(b.candles, 50) - smaSlope(a.candles, 50),
};

registerStrategy(sectorBreakout);
```

- [ ] **Step 4: Update registry to import both strategies**

Update `lib/strategies/registry.ts` — add at the bottom:

```ts
// Import strategy files to trigger registration
import "./elliots";
import "./sector-breakout";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/strategies/sector-breakout.test.ts`
Expected: PASS.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/strategies/sector-breakout.ts lib/strategies/registry.ts __tests__/strategies/sector-breakout.test.ts
git commit -m "feat: add sector breakout strategy with tests, wire up registry"
```

---

**CHECKPOINT: Milestone 5 complete.** Strategy engine with types, registry, and two strategies. All tests pass.

---

## Milestone 6: API Routes

Goal: Next.js API routes replacing the Express proxy. Holdings, history, fundamentals, and SSE-streaming screen endpoint.

### Task 16: Holdings API route

**Files:**
- Create: `app/api/holdings/[ticker]/route.ts`

- [ ] **Step 1: Create holdings route**

Create `app/api/holdings/[ticker]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchHoldings } from "@/lib/yahoo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const holdings = await fetchHoldings(ticker);
    return NextResponse.json(holdings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch ETF holdings", details: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`
Open: `http://localhost:3000/api/holdings/XLK`
Expected: JSON array of holdings with `ticker`, `name`, `weight` fields.

- [ ] **Step 3: Commit**

```bash
git add app/api/holdings
git commit -m "feat: add holdings API route"
```

---

### Task 17: History API route

**Files:**
- Create: `app/api/history/[symbol]/route.ts`

- [ ] **Step 1: Create history route**

Create `app/api/history/[symbol]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchHistory, fetchFundamentals } from "@/lib/yahoo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "150", 10);

  try {
    const [candles, fundamentals] = await Promise.all([
      fetchHistory(symbol, days),
      fetchFundamentals(symbol),
    ]);

    return NextResponse.json({ candles, summary: fundamentals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch history", details: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify manually**

Open: `http://localhost:3000/api/history/AAPL?days=30`
Expected: JSON with `candles` array and `summary` object.

- [ ] **Step 3: Commit**

```bash
git add app/api/history
git commit -m "feat: add history API route"
```

---

### Task 18: Fundamentals API route

**Files:**
- Create: `app/api/fundamentals/[symbol]/route.ts`

- [ ] **Step 1: Create fundamentals route**

Create `app/api/fundamentals/[symbol]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchFundamentals } from "@/lib/yahoo";
import { computeFundamentalsScore } from "@/lib/fundamentals/score";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const data = await fetchFundamentals(symbol);
    if (!data) {
      return NextResponse.json(
        { error: "No fundamentals data available" },
        { status: 404 }
      );
    }

    const scored = computeFundamentalsScore(data);
    return NextResponse.json({ raw: data, score: scored });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch fundamentals", details: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify manually**

Open: `http://localhost:3000/api/fundamentals/AAPL`
Expected: JSON with `raw` (Yahoo data) and `score` (composite + per-metric scores).

- [ ] **Step 3: Commit**

```bash
git add app/api/fundamentals
git commit -m "feat: add fundamentals API route with scoring"
```

---

### Task 19: Screen API route with SSE streaming

**Files:**
- Create: `app/api/screen/route.ts`

- [ ] **Step 1: Create SSE streaming screen route**

Create `app/api/screen/route.ts`:

```ts
import { NextRequest } from "next/server";
import { getStrategy } from "@/lib/strategies/registry";
import { fetchHoldings, fetchHistory, fetchFundamentals } from "@/lib/yahoo";
import { insertSma } from "@/lib/indicators/sma";
import { rsi } from "@/lib/indicators/rsi";
import { supportResistance } from "@/lib/indicators/support-resistance";
import { computeFundamentalsScore } from "@/lib/fundamentals/score";
import { StockData } from "@/lib/types";

// Ensure strategies are registered
import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, params: userParams, sectors } = body as {
    slug: string;
    params: Record<string, number>;
    sectors?: string[];
  };

  const strategy = getStrategy(slug);
  if (!strategy) {
    return new Response(JSON.stringify({ error: "Strategy not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeSectors = sectors ?? strategy.sectors;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Gather all symbols
        const allSymbols: string[] = [];
        for (const sector of activeSectors) {
          try {
            const holdings = await fetchHoldings(sector);
            allSymbols.push(...holdings.map((h) => h.ticker));
          } catch (e) {
            send("error", { sector, message: `Failed to fetch holdings: ${e}` });
          }
        }

        const total = allSymbols.length;
        let scanned = 0;
        let matches = 0;
        let skipped = 0;
        const filterBreakdown: Record<string, number> = {};
        const results: StockData[] = [];

        for (const symbol of allSymbols) {
          scanned++;
          try {
            const [candles, fundData] = await Promise.all([
              fetchHistory(symbol, 150),
              fetchFundamentals(symbol),
            ]);

            if (candles.length === 0) {
              skipped++;
              continue;
            }

            // Strip current-day candle if market is open
            const last = candles[candles.length - 1];
            const prev = candles.length > 1 ? candles[candles.length - 2] : null;
            if (prev && last.date.split("T")[1] !== prev.date.split("T")[1]) {
              candles.pop();
            }

            // Compute indicators
            insertSma(candles, 50);
            insertSma(candles, 100);
            insertSma(candles, 150);

            const lastCandle = candles[candles.length - 1];
            const sr = supportResistance(candles.slice(-150));
            const rsiValue = rsi(candles, 14);

            // Compute fundamentals
            const fundScore = fundData ? computeFundamentalsScore(fundData) : null;

            const stock: StockData = {
              symbol,
              name: (fundData as Record<string, Record<string, string>>)?.price?.shortName ?? symbol,
              candles,
              last: {
                close: lastCandle.close,
                volume: lastCandle.volume,
                date: lastCandle.date,
                sma50: (lastCandle.sma50 as number) ?? null,
                sma100: (lastCandle.sma100 as number) ?? null,
                sma150: (lastCandle.sma150 as number) ?? null,
                rsi14: rsiValue,
                support: sr.supports,
                resistance: sr.resistances,
              },
              summaryDetail: (fundData as Record<string, unknown>)?.summaryDetail as StockData["summaryDetail"],
              financialData: (fundData as Record<string, unknown>)?.financialData as StockData["financialData"],
              defaultKeyStatistics: (fundData as Record<string, unknown>)?.defaultKeyStatistics as StockData["defaultKeyStatistics"],
              fundamentalsScore: fundScore?.composite ?? null,
            };

            // Run filter
            const filterResult = strategy.filter(stock, userParams);
            let allPassed = true;
            for (const [key, passed] of Object.entries(filterResult)) {
              if (!(key in filterBreakdown)) filterBreakdown[key] = 0;
              if (passed) filterBreakdown[key]++;
              else allPassed = false;
            }

            if (allPassed) {
              matches++;
              results.push(stock);
              send("result", {
                symbol: stock.symbol,
                name: stock.name,
                close: stock.last.close,
                rsi14: stock.last.rsi14,
                fundamentalsScore: stock.fundamentalsScore,
                filterResult,
              });
            }
          } catch (e) {
            skipped++;
            console.error(`Error screening ${symbol}:`, e);
          }

          send("progress", { scanned, total, matches, skipped });
        }

        send("done", { scanned, total, matches, skipped, filterBreakdown });
      } catch (e) {
        send("error", { message: `Screen failed: ${e}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify with curl**

Run: `npm run dev`

In another terminal:
```bash
curl -X POST http://localhost:3000/api/screen \
  -H "Content-Type: application/json" \
  -d '{"slug":"elliots","params":{"minMcap":2,"maxRsi":73,"monthDays":30,"minFundamentalsScore":0},"sectors":["XLB"]}'
```

Expected: SSE stream with `event: progress` and `event: done` lines. Use XLB (Materials) because it has fewer stocks for a quick test.

- [ ] **Step 3: Commit**

```bash
git add app/api/screen
git commit -m "feat: add SSE-streaming screen API route"
```

---

**CHECKPOINT: Milestone 6 complete.** All API routes working. The Express proxy is now fully replaced by Next.js API routes. You can delete `holdings_per_eft/` once you've confirmed everything works.

---

## Milestone 7: UI Components

Goal: Reusable components — price chart, fundamentals card, results table, progress bar.

### Task 20: Price chart component

**Files:**
- Create: `components/price-chart.tsx`

- [ ] **Step 1: Create price chart component**

Create `components/price-chart.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { StockData } from "@/lib/types";

interface PriceChartProps {
  data: StockData;
  height?: number;
}

export function PriceChart({ data, height = 400 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: "transparent" }, textColor: "#888" },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.06)" },
        horzLines: { color: "rgba(0,0,0,0.06)" },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    // Candlesticks
    const candleSeries = chart.addSeries(CandlestickSeries);
    candleSeries.setData(
      data.candles.map((c) => ({
        time: c.date.split("T")[0],
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
    });
    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0, bottom: 0.3 },
    });
    volumeSeries.setData(
      data.candles.map((c) => ({
        time: c.date.split("T")[0],
        value: c.volume,
        color: c.close >= c.open ? "#26a69a" : "#ef5350",
      }))
    );

    // Support/Resistance lines
    const maxLines = 2;
    data.last.resistance.slice(0, maxLines).forEach((r, i) => {
      candleSeries.createPriceLine({
        price: r.level,
        color: "red",
        lineWidth: (maxLines - i) as 1 | 2 | 3 | 4,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "res",
      });
    });
    data.last.support.slice(0, maxLines).forEach((s, i) => {
      candleSeries.createPriceLine({
        price: s.level,
        color: "green",
        lineWidth: (maxLines - i) as 1 | 2 | 3 | 4,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "sup",
      });
    });

    // SMAs
    const smaColors = ["#FF0000", "#2962FF", "#000000"];
    const smaKeys = ["sma50", "sma100", "sma150"];
    smaKeys.forEach((key, i) => {
      const smaData = data.candles
        .filter((c) => typeof c[key] === "number")
        .map((c) => ({
          time: c.date.split("T")[0],
          value: c[key] as number,
        }));
      if (smaData.length > 0) {
        chart
          .addSeries(LineSeries, { color: smaColors[i], lineWidth: 1 })
          .setData(smaData);
      }
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [data, height]);

  return <div ref={containerRef} className="w-full" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/price-chart.tsx
git commit -m "feat: add price chart component with candles, volume, SMAs, S/R lines"
```

---

### Task 21: Fundamentals card component

**Files:**
- Create: `components/fundamentals-card.tsx`

- [ ] **Step 1: Create fundamentals card**

Create `components/fundamentals-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MetricResult, FundamentalsResult } from "@/lib/fundamentals/score";
import { getRating } from "@/lib/fundamentals/ratings";

const ratingColors: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  grey: "bg-gray-400",
};

const ratingBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  green: "default",
  yellow: "secondary",
  red: "destructive",
  grey: "outline",
};

function MetricRow({ metric }: { metric: MetricResult }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${ratingColors[metric.rating]}`} />
        <span className="text-sm">{metric.label}</span>
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
              [?]
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{metric.label}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {metric.description}
            </p>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{metric.formatted}</span>
        <Badge variant={ratingBadgeVariants[metric.rating]} className="w-10 justify-center text-xs">
          {metric.score.toFixed(1)}
        </Badge>
      </div>
    </div>
  );
}

interface FundamentalsCardProps {
  result: FundamentalsResult;
}

export function FundamentalsCard({ result }: FundamentalsCardProps) {
  const compositeRating = getRating(result.composite);

  // Group by category
  const categories = new Map<string, MetricResult[]>();
  for (const m of result.metrics) {
    const list = categories.get(m.category) ?? [];
    list.push(m);
    categories.set(m.category, list);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Fundamentals Score</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${ratingColors[compositeRating]}`} />
          <span className="text-xl font-bold">{result.composite.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">/ 10</span>
        </div>
      </div>

      {Array.from(categories.entries()).map(([category, metrics]) => (
        <div key={category} className="mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {category}
          </h4>
          {metrics.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </div>
      ))}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/fundamentals-card.tsx
git commit -m "feat: add fundamentals card component with info popups"
```

---

### Task 22: Progress bar and results table components

**Files:**
- Create: `components/progress-bar.tsx`, `components/strategy-results-table.tsx`

- [ ] **Step 1: Create SSE progress bar**

Create `components/progress-bar.tsx`:

```tsx
"use client";

import { Progress } from "@/components/ui/progress";

interface ScreenProgress {
  scanned: number;
  total: number;
  matches: number;
  skipped?: number;
}

interface ProgressBarProps {
  progress: ScreenProgress | null;
  status: "idle" | "scanning" | "done" | "error";
}

export function ScreenProgressBar({ progress, status }: ProgressBarProps) {
  if (status === "idle") return null;

  const pct = progress && progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>
          {status === "scanning" && `Scanning... ${progress?.scanned ?? 0} / ${progress?.total ?? 0}`}
          {status === "done" && `Done — ${progress?.matches ?? 0} picks found`}
          {status === "error" && "Error during scan"}
        </span>
        {progress?.skipped ? (
          <span>{progress.skipped} skipped</span>
        ) : null}
      </div>
      <Progress value={status === "done" ? 100 : pct} />
    </div>
  );
}
```

- [ ] **Step 2: Create strategy results table**

Create `components/strategy-results-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ScreenResult {
  symbol: string;
  name: string;
  close: number;
  rsi14: number | null;
  fundamentalsScore: number | null;
  filterResult: Record<string, boolean>;
}

interface ResultsTableProps {
  results: ScreenResult[];
  filterBreakdown?: Record<string, number>;
  totalScanned?: number;
}

export function StrategyResultsTable({
  results,
  filterBreakdown,
  totalScanned,
}: ResultsTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string>("symbol");
  const [sortAsc, setSortAsc] = useState(true);

  const filterKeys = results.length > 0 ? Object.keys(results[0].filterResult) : [];

  const sorted = [...results].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * dir;
    if (sortKey === "close") return (a.close - b.close) * dir;
    if (sortKey === "rsi14") return ((a.rsi14 ?? 0) - (b.rsi14 ?? 0)) * dir;
    if (sortKey === "score") return ((a.fundamentalsScore ?? 0) - (b.fundamentalsScore ?? 0)) * dir;
    return 0;
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div>
      {filterBreakdown && totalScanned && (
        <div className="text-sm text-muted-foreground mb-3">
          {totalScanned} scanned, {results.length} matched
          {" — "}
          {Object.entries(filterBreakdown).map(([k, v]) => `${k}: ${v}`).join(", ")}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("symbol")}>
              Symbol {sortKey === "symbol" ? (sortAsc ? "^" : "v") : ""}
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("close")}>
              Price {sortKey === "close" ? (sortAsc ? "^" : "v") : ""}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("rsi14")}>
              RSI(14) {sortKey === "rsi14" ? (sortAsc ? "^" : "v") : ""}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("score")}>
              Score {sortKey === "score" ? (sortAsc ? "^" : "v") : ""}
            </TableHead>
            {filterKeys.map((k) => (
              <TableHead key={k} className="text-center text-xs">{k}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow
              key={r.symbol}
              className="cursor-pointer hover:bg-accent"
              onClick={() => router.push(`/stock/${r.symbol}`)}
            >
              <TableCell className="font-medium">{r.symbol}</TableCell>
              <TableCell className="text-sm">{r.name}</TableCell>
              <TableCell>${r.close.toFixed(2)}</TableCell>
              <TableCell>{r.rsi14 ?? "—"}</TableCell>
              <TableCell>{r.fundamentalsScore?.toFixed(1) ?? "—"}</TableCell>
              {filterKeys.map((k) => (
                <TableCell key={k} className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto ${
                      r.filterResult[k] ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/progress-bar.tsx components/strategy-results-table.tsx
git commit -m "feat: add progress bar and strategy results table components"
```

---

**CHECKPOINT: Milestone 7 complete.** All reusable UI components built.

---

## Milestone 8: Pages — Dashboard, Strategies, Config

### Task 23: SSE hook for strategy scanning

**Files:**
- Create: `lib/hooks/use-screen.ts`

- [ ] **Step 1: Create SSE hook**

Create `lib/hooks/use-screen.ts`:

```ts
"use client";

import { useState, useCallback } from "react";
import { ScreenResult } from "@/components/strategy-results-table";

interface ScreenProgress {
  scanned: number;
  total: number;
  matches: number;
  skipped: number;
}

interface UseScreenReturn {
  results: ScreenResult[];
  progress: ScreenProgress | null;
  status: "idle" | "scanning" | "done" | "error";
  filterBreakdown: Record<string, number> | null;
  run: (slug: string, params: Record<string, number>, sectors?: string[]) => void;
}

export function useScreen(): UseScreenReturn {
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [progress, setProgress] = useState<ScreenProgress | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [filterBreakdown, setFilterBreakdown] = useState<Record<string, number> | null>(null);

  const run = useCallback((slug: string, params: Record<string, number>, sectors?: string[]) => {
    setResults([]);
    setProgress(null);
    setStatus("scanning");
    setFilterBreakdown(null);

    fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, params, sectors }),
    }).then((res) => {
      const reader = res.body?.getReader();
      if (!reader) { setStatus("error"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      const read = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "progress") setProgress(data);
              else if (currentEvent === "result") setResults((prev) => [...prev, data]);
              else if (currentEvent === "done") {
                setProgress(data);
                setFilterBreakdown(data.filterBreakdown);
                setStatus("done");
              }
              else if (currentEvent === "error") setStatus("error");
            }
          }
          return read();
        });

      read().catch(() => setStatus("error"));
    }).catch(() => setStatus("error"));
  }, []);

  return { results, progress, status, filterBreakdown, run };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-screen.ts
git commit -m "feat: add useScreen SSE hook for strategy scanning"
```

---

### Task 24: Dashboard page — auto-run strategies on launch

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement dashboard with auto-running strategy cards**

Replace `app/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useScreen } from "@/lib/hooks/use-screen";
import { getStrategies } from "@/lib/strategies/registry";

// Ensure strategies are registered
import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

function StrategyCard({ strategy }: { strategy: { slug: string; name: string; description: string; params: Array<{ key: string; default: number }> } }) {
  const { results, progress, status, run } = useScreen();
  const router = useRouter();

  useEffect(() => {
    const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    const params = getStoredParams(strategy.slug, defaults);
    run(strategy.slug, params);
  }, [strategy.slug]);

  const pct = progress && progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0;

  const cardColor =
    status === "done" && results.length > 0
      ? "border-green-500 bg-green-50 dark:bg-green-950"
      : status === "done" && results.length === 0
        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
        : "border-muted";

  return (
    <Card
      className={`p-4 cursor-pointer transition-colors ${cardColor}`}
      onClick={() => status === "done" ? router.push(`/strategies/${strategy.slug}`) : undefined}
    >
      <h3 className="font-semibold mb-1">{strategy.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
      {status === "scanning" && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Scanning {progress?.scanned ?? 0} / {progress?.total ?? "..."}
          </div>
          <Progress value={pct} />
        </div>
      )}
      {status === "done" && (
        <div className="text-sm font-medium">
          {results.length > 0 ? `${results.length} picks` : "No picks"}
        </div>
      )}
      {status === "error" && (
        <div className="text-sm text-red-500">Scan failed</div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const strategies = getStrategies();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <StrategyCard key={s.slug} strategy={s} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, open `http://localhost:3000/`
Expected: Cards appear for Elliot's Screen and Sector Breakout. They start scanning immediately. Progress bars animate. Cards turn green/yellow when done.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement dashboard with auto-running strategy cards"
```

---

### Task 25: Strategy results page

**Files:**
- Modify: `app/strategies/[slug]/page.tsx`

- [ ] **Step 1: Implement results page**

Replace `app/strategies/[slug]/page.tsx`:

```tsx
"use client";

import { useEffect, use } from "react";
import { useScreen } from "@/lib/hooks/use-screen";
import { ScreenProgressBar } from "@/components/progress-bar";
import { StrategyResultsTable } from "@/components/strategy-results-table";
import { getStrategy } from "@/lib/strategies/registry";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

export default function StrategyResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const strategy = getStrategy(slug);
  const { results, progress, status, filterBreakdown, run } = useScreen();

  useEffect(() => {
    if (!strategy) return;
    const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    const p = getStoredParams(slug, defaults);
    run(slug, p);
  }, [slug]);

  if (!strategy) {
    return <div className="text-red-500">Strategy "{slug}" not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{strategy.name}</h1>
        <div className="flex gap-2">
          <Link href={`/strategies/${slug}/config`}>
            <Button variant="outline" size="sm">Configure</Button>
          </Link>
          <Button
            size="sm"
            disabled={status === "scanning"}
            onClick={() => {
              const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
              run(slug, getStoredParams(slug, defaults));
            }}
          >
            Re-run
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
      <ScreenProgressBar progress={progress} status={status} />
      <StrategyResultsTable
        results={results}
        filterBreakdown={filterBreakdown ?? undefined}
        totalScanned={progress?.scanned}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/strategies/\\[slug\\]/page.tsx
git commit -m "feat: implement strategy results page with SSE scanning"
```

---

### Task 26: Strategy config page

**Files:**
- Modify: `app/strategies/[slug]/config/page.tsx`

- [ ] **Step 1: Implement config page with auto-generated sliders**

Replace `app/strategies/[slug]/config/page.tsx`:

```tsx
"use client";

import { use, useState, useEffect } from "react";
import { getStrategy } from "@/lib/strategies/registry";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

export default function StrategyConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const strategy = getStrategy(slug);
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!strategy) return;
    const stored = localStorage.getItem(`strategy-params-${slug}`);
    if (stored) {
      setValues(JSON.parse(stored));
    } else {
      setValues(Object.fromEntries(strategy.params.map((p) => [p.key, p.default])));
    }
  }, [slug, strategy]);

  if (!strategy) {
    return <div className="text-red-500">Strategy "{slug}" not found.</div>;
  }

  const save = () => {
    localStorage.setItem(`strategy-params-${slug}`, JSON.stringify(values));
  };

  const reset = () => {
    const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    setValues(defaults);
    localStorage.removeItem(`strategy-params-${slug}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{strategy.name} — Configuration</h1>
      <p className="text-sm text-muted-foreground mb-6">{strategy.description}</p>

      <div className="space-y-6 max-w-lg">
        {strategy.params.map((p) => (
          <Card key={p.key} className="p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">{p.label}</label>
              <Input
                type="number"
                className="w-24 h-8 text-right"
                value={values[p.key] ?? p.default}
                step={p.step ?? 1}
                min={p.min}
                max={p.max}
                onChange={(e) =>
                  setValues({ ...values, [p.key]: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <Slider
              value={[values[p.key] ?? p.default]}
              min={p.min ?? 0}
              max={p.max ?? 100}
              step={p.step ?? 1}
              onValueChange={([v]) => setValues({ ...values, [p.key]: v })}
            />
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={save}>Save</Button>
        <Button variant="outline" onClick={reset}>Reset to Defaults</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/strategies/\\[slug\\]/config/page.tsx
git commit -m "feat: implement strategy config page with sliders and localStorage"
```

---

### Task 27: Strategies list page

**Files:**
- Modify: `app/strategies/page.tsx`

- [ ] **Step 1: Implement strategies list**

Replace `app/strategies/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStrategies } from "@/lib/strategies/registry";

import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

export default function StrategiesPage() {
  const router = useRouter();
  const strategies = getStrategies();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Strategies</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((s) => (
          <Card key={s.slug} className="p-4">
            <h3 className="font-semibold mb-1">{s.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => router.push(`/strategies/${s.slug}`)}>
                Run
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/strategies/${s.slug}/config`)}
              >
                Configure
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/strategies/page.tsx
git commit -m "feat: implement strategies list page"
```

---

**CHECKPOINT: Milestone 8 complete.** Dashboard auto-runs strategies, results page shows SSE-streamed results, config page persists thresholds.

---

## Milestone 9: Remaining Pages

### Task 28: Stock detail page

**Files:**
- Modify: `app/stock/[symbol]/page.tsx`

- [ ] **Step 1: Implement stock detail page**

Replace `app/stock/[symbol]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { PriceChart } from "@/components/price-chart";
import { FundamentalsCard } from "@/components/fundamentals-card";
import { Card } from "@/components/ui/card";
import { StockData } from "@/lib/types";
import { FundamentalsResult } from "@/lib/fundamentals/score";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const [stock, setStock] = useState<StockData | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/history/${symbol}?days=150`).then((r) => r.json()),
      fetch(`/api/fundamentals/${symbol}`).then((r) => r.json()),
    ])
      .then(async ([historyData, fundData]) => {
        const candles = historyData.candles ?? [];
        // Compute indicators client-side for the chart
        const { insertSma } = await import("@/lib/indicators/sma");
        const { rsi } = await import("@/lib/indicators/rsi");
        const { supportResistance } = await import("@/lib/indicators/support-resistance");

        insertSma(candles, 50);
        insertSma(candles, 100);
        insertSma(candles, 150);
        const lastCandle = candles[candles.length - 1];
        const sr = supportResistance(candles.slice(-150));
        const rsiValue = rsi(candles, 14);

        setStock({
          symbol,
          name: fundData.raw?.price?.shortName ?? symbol,
          candles,
          last: {
            close: lastCandle?.close ?? 0,
            volume: lastCandle?.volume ?? 0,
            date: lastCandle?.date ?? "",
            sma50: (lastCandle?.sma50 as number) ?? null,
            sma100: (lastCandle?.sma100 as number) ?? null,
            sma150: (lastCandle?.sma150 as number) ?? null,
            rsi14: rsiValue,
            support: sr.supports,
            resistance: sr.resistances,
          },
          summaryDetail: fundData.raw?.summaryDetail ?? {},
          financialData: fundData.raw?.financialData ?? {},
          defaultKeyStatistics: fundData.raw?.defaultKeyStatistics ?? {},
          fundamentalsScore: fundData.score?.composite ?? null,
        } as StockData);
        setFundamentals(fundData.score ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="text-muted-foreground">Loading {symbol}...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!stock) return <div className="text-red-500">No data for {symbol}</div>;

  const sd = stock.summaryDetail;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{stock.name}</h1>
      <div className="text-sm text-muted-foreground mb-4">
        {symbol}
        {sd?.marketCap && ` · MCap: $${(sd.marketCap / 1e9).toFixed(1)}B`}
        {sd?.fiftyTwoWeekLow && sd?.fiftyTwoWeekHigh &&
          ` · 52w: $${sd.fiftyTwoWeekLow.toFixed(2)} - $${sd.fiftyTwoWeekHigh.toFixed(2)}`}
      </div>

      <div className="flex gap-3 text-xs mb-4">
        <a href={`https://finance.yahoo.com/chart/${symbol}`} target="_blank" className="text-blue-500 hover:underline">Yahoo</a>
        <a href={`https://www.tradingview.com/chart/?symbol=${symbol}`} target="_blank" className="text-blue-500 hover:underline">TradingView</a>
        <a href={`https://finviz.com/quote.ashx?t=${symbol}&p=d`} target="_blank" className="text-blue-500 hover:underline">Finviz</a>
        <a href={`https://www.tradevision.io/visualizer/?ticker=${symbol}`} target="_blank" className="text-blue-500 hover:underline">Tradevision</a>
      </div>

      <Card className="p-4 mb-4">
        <PriceChart data={stock} />
      </Card>

      {fundamentals && <FundamentalsCard result={fundamentals} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/stock/\\[symbol\\]/page.tsx
git commit -m "feat: implement stock detail page with chart and fundamentals"
```

---

### Task 29: Glossary page

**Files:**
- Modify: `app/glossary/page.tsx`

- [ ] **Step 1: Implement glossary**

Replace `app/glossary/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { metricDefinitions } from "@/lib/fundamentals/ratings";

export default function GlossaryPage() {
  const [search, setSearch] = useState("");

  const filtered = metricDefinitions.filter(
    (m) =>
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = new Map<string, typeof metricDefinitions>();
  for (const m of filtered) {
    const list = categories.get(m.category) ?? [];
    list.push(m);
    categories.set(m.category, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Glossary</h1>
      <Input
        placeholder="Search metrics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mb-6"
      />

      {Array.from(categories.entries()).map(([category, metrics]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{category}</h2>
          <div className="space-y-3">
            {metrics.map((m) => (
              <Card key={m.key} className="p-4">
                <h3 className="font-medium mb-1">{m.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {m.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-muted-foreground">No metrics match "{search}"</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/glossary/page.tsx
git commit -m "feat: implement searchable glossary page"
```

---

### Task 30: Side-by-side compare page

**Files:**
- Modify: `app/strategies/compare/page.tsx`

- [ ] **Step 1: Implement compare page**

Replace `app/strategies/compare/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { getStrategies } from "@/lib/strategies/registry";
import { useScreen } from "@/lib/hooks/use-screen";
import { ScreenProgressBar } from "@/components/progress-bar";
import { StrategyResultsTable } from "@/components/strategy-results-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import "@/lib/strategies/elliots";
import "@/lib/strategies/sector-breakout";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

function ComparePanel({ slug }: { slug: string }) {
  const strategy = getStrategies().find((s) => s.slug === slug);
  const { results, progress, status, filterBreakdown, run } = useScreen();

  if (!strategy) return null;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{strategy.name}</h3>
        <Button
          size="sm"
          disabled={status === "scanning"}
          onClick={() => {
            const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
            run(slug, getStoredParams(slug, defaults));
          }}
        >
          {status === "idle" ? "Run" : "Re-run"}
        </Button>
      </div>
      <ScreenProgressBar progress={progress} status={status} />
      <StrategyResultsTable results={results} filterBreakdown={filterBreakdown ?? undefined} totalScanned={progress?.scanned} />
    </div>
  );
}

export default function ComparePage() {
  const strategies = getStrategies();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Compare Strategies</h1>
      <div className="flex gap-2 mb-6">
        {strategies.map((s) => (
          <Badge
            key={s.slug}
            variant={selected.includes(s.slug) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggle(s.slug)}
          >
            {s.name}
          </Badge>
        ))}
      </div>

      {selected.length === 0 && (
        <p className="text-muted-foreground">Select strategies above to compare.</p>
      )}

      <div className="flex gap-4 overflow-x-auto">
        {selected.map((slug) => (
          <ComparePanel key={slug} slug={slug} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add compare link to strategies page**

In `app/strategies/page.tsx`, add before the closing `</div>` of the return:

```tsx
<div className="mt-6">
  <Button variant="outline" onClick={() => router.push("/strategies/compare")}>
    Compare Side by Side
  </Button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/strategies/compare/page.tsx app/strategies/page.tsx
git commit -m "feat: implement side-by-side strategy comparison page"
```

---

**CHECKPOINT: Milestone 9 complete.** All pages functional — dashboard, strategies, config, results, compare, stock detail, glossary.

---

## Milestone 10: Cleanup and Final Verification

### Task 31: Update nav with strategy sub-links

**Files:**
- Modify: `components/nav.tsx`

- [ ] **Step 1: Add strategy sub-items and compare link to nav**

Update the `navItems` array in `components/nav.tsx`:

```ts
const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Strategies", href: "/strategies" },
  { label: "  Elliot's", href: "/strategies/elliots" },
  { label: "  Breakout", href: "/strategies/sector-breakout" },
  { label: "  Compare", href: "/strategies/compare" },
  { label: "Glossary", href: "/glossary" },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/nav.tsx
git commit -m "feat: add strategy sub-links to sidebar navigation"
```

---

### Task 32: Cache pruning on startup

**Files:**
- Create: `app/api/startup.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Add instrumentation file for startup pruning**

Create `instrumentation.ts` at project root:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { pruneCache } = await import("@/lib/cache");
    const path = await import("path");
    const cacheDir = path.resolve(process.cwd(), ".cache");
    console.log("Pruning old cache files...");
    pruneCache(cacheDir);
    console.log("Cache pruning complete.");
  }
}
```

Enable instrumentation in `next.config.ts` — add:
```ts
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add instrumentation.ts next.config.ts
git commit -m "feat: add cache pruning on app startup via instrumentation"
```

---

### Task 33: Full verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run the app end-to-end**

Run: `npm run dev`

Verify:
1. Dashboard loads, strategies start scanning
2. Click a strategy card → results page with table
3. Click a stock row → stock detail with chart + fundamentals
4. Navigate to `/strategies/elliots/config` → sliders work, save persists
5. Navigate to `/glossary` → search works
6. Navigate to `/strategies/compare` → select two strategies, run them

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
```

---

**PROJECT COMPLETE.** The trading platform is functional with:
- Next.js 15 shell with sidebar navigation
- 4 API routes (holdings, history, fundamentals, screen)
- 4 indicators (SMA, RSI, slope, support/resistance) with tests
- Fundamentals scoring (10 metrics, composite score, glossary) with tests
- 2 strategies (Elliot's, Sector Breakout) with tests
- Dashboard with auto-running strategies
- Strategy config with persistent thresholds
- Stock detail with chart + fundamentals card
- Side-by-side strategy comparison
- Searchable glossary
- Cache pruning on startup
