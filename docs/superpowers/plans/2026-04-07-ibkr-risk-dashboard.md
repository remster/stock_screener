# IBKR Integration & Risk Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only IBKR Client Portal API integration with portfolio risk calculation and a trade simulator to the existing Next.js stock screener.

**Architecture:** A single thin client (`lib/ibkr/client.ts`) is the only file that talks to the gateway. An API route fetches positions/orders/account summary in parallel and enriches positions with Yahoo sector data. Pure risk calculation functions live in `lib/risk/` and run client-side, used identically for real positions and simulated trades.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Vitest. Existing yahoo-finance2 + file cache reused for sector lookup.

---

## Milestone 1: Types and Risk Calculation Functions

Pure logic with full TDD coverage. No IBKR or UI dependencies. This milestone produces the testable core of the entire feature.

### Task 1: Risk types

**Files:**
- Create: `lib/risk/types.ts`

- [ ] **Step 1: Create types file**

Create `lib/risk/types.ts`:

```ts
export interface Position {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
}

export interface Order {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  origOrderType: string;
  quantity: number;
  price: number;
  status: string;
}

export interface IbkrSnapshot {
  connected: boolean;
  lastUpdated: string | null;
  positions: Position[];
  orders: Order[];
  netLiquidation: number | null;
}

export interface PositionRisk {
  symbol: string;
  entryToStopRisk: number;
  currentToStopRisk: number;
  unriskedQty: number;
}

export interface SectorRisk {
  sector: string;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  positionCount: number;
}

export interface PortfolioRisk {
  netLiquidation: number;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  totalRiskPercent: number;
  sectors: SectorRisk[];
  positions: PositionRisk[];
}

export interface SimulatedTrade {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopPrice: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/risk/types.ts
git commit -m "feat(risk): add risk calculation types"
```

---

### Task 2: Position risk calculation

**Files:**
- Create: `lib/risk/position-risk.ts`
- Create: `__tests__/risk/position-risk.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/risk/position-risk.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { positionRisk } from "@/lib/risk/position-risk";
import type { Position, Order } from "@/lib/risk/types";

const aapl: Position = {
  symbol: "AAPL", name: "Apple Inc.", sector: "Technology",
  quantity: 100, avgEntryPrice: 195, currentPrice: 200,
};

function sellStop(symbol: string, qty: number, price: number): Order {
  return {
    symbol, side: "SELL", orderType: "Stop", origOrderType: "STP",
    quantity: qty, price, status: "Submitted",
  };
}

describe("positionRisk", () => {
  it("computes risk for a single full-coverage stop", () => {
    const orders: Order[] = [sellStop("AAPL", 100, 190)];
    const risk = positionRisk(aapl, orders);
    expect(risk.symbol).toBe("AAPL");
    expect(risk.entryToStopRisk).toBe(100 * (195 - 190));   // 500
    expect(risk.currentToStopRisk).toBe(100 * (200 - 190)); // 1000
    expect(risk.unriskedQty).toBe(0);
  });

  it("sums risk across tiered stops", () => {
    const orders: Order[] = [
      sellStop("AAPL", 50, 190),
      sellStop("AAPL", 50, 180),
    ];
    const risk = positionRisk(aapl, orders);
    expect(risk.entryToStopRisk).toBe(50 * 5 + 50 * 15);    // 250 + 750 = 1000
    expect(risk.currentToStopRisk).toBe(50 * 10 + 50 * 20); // 500 + 1000 = 1500
    expect(risk.unriskedQty).toBe(0);
  });

  it("reports unrisked quantity when stops cover only part of the position", () => {
    const orders: Order[] = [sellStop("AAPL", 60, 190)];
    const risk = positionRisk(aapl, orders);
    expect(risk.entryToStopRisk).toBe(60 * 5);
    expect(risk.currentToStopRisk).toBe(60 * 10);
    expect(risk.unriskedQty).toBe(40);
  });

  it("reports full position as unrisked when there are no stops", () => {
    const risk = positionRisk(aapl, []);
    expect(risk.entryToStopRisk).toBe(0);
    expect(risk.currentToStopRisk).toBe(0);
    expect(risk.unriskedQty).toBe(100);
  });

  it("ignores buy orders, limit orders, and trailing stops", () => {
    const orders: Order[] = [
      { symbol: "AAPL", side: "BUY", orderType: "Stop", origOrderType: "STP", quantity: 50, price: 210, status: "Submitted" },
      { symbol: "AAPL", side: "SELL", orderType: "Limit", origOrderType: "LMT", quantity: 50, price: 210, status: "Submitted" },
      { symbol: "AAPL", side: "SELL", orderType: "Trail", origOrderType: "TRAIL", quantity: 50, price: 5, status: "Submitted" },
    ];
    const risk = positionRisk(aapl, orders);
    expect(risk.entryToStopRisk).toBe(0);
    expect(risk.unriskedQty).toBe(100);
  });

  it("ignores stops for other symbols", () => {
    const orders: Order[] = [sellStop("MSFT", 100, 380)];
    const risk = positionRisk(aapl, orders);
    expect(risk.entryToStopRisk).toBe(0);
    expect(risk.unriskedQty).toBe(100);
  });

  it("clamps unriskedQty to 0 when stops exceed position quantity", () => {
    const orders: Order[] = [sellStop("AAPL", 150, 190)];
    const risk = positionRisk(aapl, orders);
    expect(risk.unriskedQty).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/risk/position-risk.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement positionRisk**

Create `lib/risk/position-risk.ts`:

```ts
import type { Position, Order, PositionRisk } from "./types";

export function positionRisk(position: Position, orders: Order[]): PositionRisk {
  const matchingStops = orders.filter(
    (o) => o.symbol === position.symbol && o.side === "SELL" && o.origOrderType === "STP"
  );

  let entryToStopRisk = 0;
  let currentToStopRisk = 0;
  let coveredQty = 0;

  for (const stop of matchingStops) {
    entryToStopRisk += stop.quantity * (position.avgEntryPrice - stop.price);
    currentToStopRisk += stop.quantity * (position.currentPrice - stop.price);
    coveredQty += stop.quantity;
  }

  const unriskedQty = Math.max(0, position.quantity - coveredQty);

  return {
    symbol: position.symbol,
    entryToStopRisk,
    currentToStopRisk,
    unriskedQty,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/risk/position-risk.test.ts`
Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/risk/position-risk.ts __tests__/risk/position-risk.test.ts
git commit -m "feat(risk): add positionRisk with stop matching and coverage tracking"
```

---

### Task 3: Sector risk aggregation

**Files:**
- Create: `lib/risk/sector-risk.ts`
- Create: `__tests__/risk/sector-risk.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/risk/sector-risk.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sectorRisk } from "@/lib/risk/sector-risk";
import type { Position, Order } from "@/lib/risk/types";

const positions: Position[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", quantity: 100, avgEntryPrice: 195, currentPrice: 200 },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", quantity: 50, avgEntryPrice: 380, currentPrice: 400 },
  { symbol: "JPM", name: "JPMorgan", sector: "Financial Services", quantity: 200, avgEntryPrice: 150, currentPrice: 160 },
];

const orders: Order[] = [
  { symbol: "AAPL", side: "SELL", orderType: "Stop", origOrderType: "STP", quantity: 100, price: 190, status: "Submitted" },
  { symbol: "MSFT", side: "SELL", orderType: "Stop", origOrderType: "STP", quantity: 50, price: 370, status: "Submitted" },
  { symbol: "JPM", side: "SELL", orderType: "Stop", origOrderType: "STP", quantity: 200, price: 145, status: "Submitted" },
];

describe("sectorRisk", () => {
  it("groups positions by sector and sums risk", () => {
    const sectors = sectorRisk(positions, orders);
    const tech = sectors.find((s) => s.sector === "Technology");
    const fin = sectors.find((s) => s.sector === "Financial Services");

    expect(tech).toBeDefined();
    expect(tech!.positionCount).toBe(2);
    expect(tech!.totalEntryToStop).toBe(100 * 5 + 50 * 10); // 500 + 500 = 1000
    expect(tech!.totalCurrentToStop).toBe(100 * 10 + 50 * 30); // 1000 + 1500 = 2500

    expect(fin).toBeDefined();
    expect(fin!.positionCount).toBe(1);
    expect(fin!.totalEntryToStop).toBe(200 * 5);  // 1000
    expect(fin!.totalCurrentToStop).toBe(200 * 15); // 3000
  });

  it("returns empty array for no positions", () => {
    expect(sectorRisk([], [])).toEqual([]);
  });

  it("groups unknown-sector positions together", () => {
    const unknownPositions: Position[] = [
      { ...positions[0], sector: "Unknown" },
      { ...positions[1], sector: "Unknown" },
    ];
    const sectors = sectorRisk(unknownPositions, orders);
    expect(sectors).toHaveLength(1);
    expect(sectors[0].sector).toBe("Unknown");
    expect(sectors[0].positionCount).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/risk/sector-risk.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement sectorRisk**

Create `lib/risk/sector-risk.ts`:

```ts
import type { Position, Order, SectorRisk } from "./types";
import { positionRisk } from "./position-risk";

export function sectorRisk(positions: Position[], orders: Order[]): SectorRisk[] {
  const bySector = new Map<string, { entry: number; current: number; count: number }>();

  for (const position of positions) {
    const risk = positionRisk(position, orders);
    const existing = bySector.get(position.sector) ?? { entry: 0, current: 0, count: 0 };
    existing.entry += risk.entryToStopRisk;
    existing.current += risk.currentToStopRisk;
    existing.count += 1;
    bySector.set(position.sector, existing);
  }

  return Array.from(bySector.entries()).map(([sector, totals]) => ({
    sector,
    totalEntryToStop: totals.entry,
    totalCurrentToStop: totals.current,
    positionCount: totals.count,
  }));
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/risk/sector-risk.test.ts`
Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/risk/sector-risk.ts __tests__/risk/sector-risk.test.ts
git commit -m "feat(risk): add sector-level risk aggregation"
```

---

### Task 4: Portfolio risk and simulation

**Files:**
- Create: `lib/risk/portfolio-risk.ts`
- Create: `__tests__/risk/portfolio-risk.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/risk/portfolio-risk.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { portfolioRisk, simulatePortfolioRisk } from "@/lib/risk/portfolio-risk";
import type { Position, Order, SimulatedTrade } from "@/lib/risk/types";

const positions: Position[] = [
  { symbol: "AAPL", name: "Apple", sector: "Technology", quantity: 100, avgEntryPrice: 195, currentPrice: 200 },
  { symbol: "JPM", name: "JPMorgan", sector: "Financial Services", quantity: 200, avgEntryPrice: 150, currentPrice: 160 },
];

const orders: Order[] = [
  { symbol: "AAPL", side: "SELL", orderType: "Stop", origOrderType: "STP", quantity: 100, price: 190, status: "Submitted" },
  { symbol: "JPM", side: "SELL", orderType: "Stop", origOrderType: "STP", quantity: 200, price: 145, status: "Submitted" },
];

describe("portfolioRisk", () => {
  it("totals risk and computes risk percent of portfolio", () => {
    const result = portfolioRisk(positions, orders, 100000);
    expect(result.netLiquidation).toBe(100000);
    expect(result.totalEntryToStop).toBe(100 * 5 + 200 * 5);   // 500 + 1000 = 1500
    expect(result.totalCurrentToStop).toBe(100 * 10 + 200 * 15); // 1000 + 3000 = 4000
    expect(result.totalRiskPercent).toBeCloseTo(4000 / 100000);
    expect(result.sectors).toHaveLength(2);
    expect(result.positions).toHaveLength(2);
  });

  it("handles zero net liquidation without dividing by zero", () => {
    const result = portfolioRisk(positions, orders, 0);
    expect(result.totalRiskPercent).toBe(0);
  });

  it("returns zero risk for empty portfolio", () => {
    const result = portfolioRisk([], [], 100000);
    expect(result.totalEntryToStop).toBe(0);
    expect(result.totalCurrentToStop).toBe(0);
    expect(result.sectors).toEqual([]);
    expect(result.positions).toEqual([]);
  });
});

describe("simulatePortfolioRisk", () => {
  it("adds a single simulated trade to the portfolio", () => {
    const trades: SimulatedTrade[] = [
      { symbol: "MSFT", quantity: 50, entryPrice: 400, stopPrice: 380 },
    ];
    const baseline = portfolioRisk(positions, orders, 100000);
    const projected = simulatePortfolioRisk(positions, orders, 100000, trades);

    // New trade adds 50 * (400 - 380) = 1000 to current-to-stop and entry-to-stop
    expect(projected.totalEntryToStop).toBe(baseline.totalEntryToStop + 1000);
    expect(projected.totalCurrentToStop).toBe(baseline.totalCurrentToStop + 1000);
    expect(projected.positions).toHaveLength(3);
  });

  it("groups simulated trades into existing sectors when known", () => {
    const trades: SimulatedTrade[] = [
      { symbol: "AAPL", quantity: 50, entryPrice: 200, stopPrice: 190 },
    ];
    const projected = simulatePortfolioRisk(positions, orders, 100000, trades);
    // Simulated AAPL inherits sector from existing position with same symbol
    const tech = projected.sectors.find((s) => s.sector === "Technology");
    expect(tech).toBeDefined();
    expect(tech!.positionCount).toBe(2); // existing AAPL + simulated AAPL
  });

  it("groups simulated trades for unknown symbols under 'Unknown'", () => {
    const trades: SimulatedTrade[] = [
      { symbol: "ZZZZ", quantity: 10, entryPrice: 50, stopPrice: 45 },
    ];
    const projected = simulatePortfolioRisk(positions, orders, 100000, trades);
    const unknown = projected.sectors.find((s) => s.sector === "Unknown");
    expect(unknown).toBeDefined();
    expect(unknown!.positionCount).toBe(1);
  });

  it("supports multiple simultaneous simulated trades", () => {
    const trades: SimulatedTrade[] = [
      { symbol: "MSFT", quantity: 50, entryPrice: 400, stopPrice: 380 },
      { symbol: "GOOG", quantity: 20, entryPrice: 150, stopPrice: 145 },
    ];
    const projected = simulatePortfolioRisk(positions, orders, 100000, trades);
    const baseline = portfolioRisk(positions, orders, 100000);
    expect(projected.totalEntryToStop).toBe(baseline.totalEntryToStop + 50 * 20 + 20 * 5);
    expect(projected.positions).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/risk/portfolio-risk.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement portfolioRisk and simulatePortfolioRisk**

Create `lib/risk/portfolio-risk.ts`:

```ts
import type {
  Position, Order, PortfolioRisk, SimulatedTrade,
} from "./types";
import { positionRisk } from "./position-risk";
import { sectorRisk } from "./sector-risk";

export function portfolioRisk(
  positions: Position[],
  orders: Order[],
  netLiquidation: number,
): PortfolioRisk {
  const positionRisks = positions.map((p) => positionRisk(p, orders));
  const sectors = sectorRisk(positions, orders);

  const totalEntryToStop = positionRisks.reduce((sum, r) => sum + r.entryToStopRisk, 0);
  const totalCurrentToStop = positionRisks.reduce((sum, r) => sum + r.currentToStopRisk, 0);
  const totalRiskPercent = netLiquidation > 0 ? totalCurrentToStop / netLiquidation : 0;

  return {
    netLiquidation,
    totalEntryToStop,
    totalCurrentToStop,
    totalRiskPercent,
    sectors,
    positions: positionRisks,
  };
}

export function simulatePortfolioRisk(
  positions: Position[],
  orders: Order[],
  netLiquidation: number,
  trades: SimulatedTrade[],
): PortfolioRisk {
  const knownSectors = new Map(positions.map((p) => [p.symbol, p.sector]));

  const simPositions: Position[] = trades.map((t) => ({
    symbol: t.symbol,
    name: t.symbol,
    sector: knownSectors.get(t.symbol) ?? "Unknown",
    quantity: t.quantity,
    avgEntryPrice: t.entryPrice,
    currentPrice: t.entryPrice,
  }));

  const simOrders: Order[] = trades.map((t) => ({
    symbol: t.symbol,
    side: "SELL",
    orderType: "Stop",
    origOrderType: "STP",
    quantity: t.quantity,
    price: t.stopPrice,
    status: "Simulated",
  }));

  return portfolioRisk(
    [...positions, ...simPositions],
    [...orders, ...simOrders],
    netLiquidation,
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/risk/portfolio-risk.test.ts`
Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/risk/portfolio-risk.ts __tests__/risk/portfolio-risk.test.ts
git commit -m "feat(risk): add portfolio risk and trade simulation"
```

---

**CHECKPOINT: Milestone 1 complete.** All risk math is implemented and tested. 17 tests across 3 files. Zero IBKR or UI dependencies.

---

## Milestone 2: IBKR Thin Client and API Route

Adds the only file in the codebase that talks to the IBKR Client Portal Gateway and the API route that exposes a normalized snapshot to the UI.

### Task 5: IBKR thin client

**Files:**
- Create: `lib/ibkr/client.ts`

- [ ] **Step 1: Create the client**

The Client Portal Gateway uses a self-signed cert on `https://localhost:5000`. We must allow that on the request agent. Use the Node `https.Agent` with `rejectUnauthorized: false` only for requests to this client, not globally.

Create `lib/ibkr/client.ts`:

```ts
import https from "https";

const GATEWAY_URL = process.env.IBKR_GATEWAY_URL ?? "https://localhost:5000/v1/portal";

const agent = new https.Agent({ rejectUnauthorized: false });

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    // @ts-expect-error - Node fetch accepts agent via dispatcher in newer versions; this works under Next.js runtime
    agent,
  });
  if (!res.ok) {
    throw new Error(`IBKR ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface IbkrAuthStatus {
  authenticated: boolean;
  competing: boolean;
  connected?: boolean;
}

export interface IbkrAccount {
  id: string;
  accountId?: string;
}

export interface IbkrPosition {
  conid: number;
  contractDesc: string;
  ticker?: string;
  position: number;
  avgCost: number;
  mktPrice: number;
  mktValue: number;
  unrealizedPnl: number;
}

export interface IbkrOrder {
  ticker: string;
  side: "BUY" | "SELL";
  orderType: string;
  origOrderType: string;
  price: number;
  remainingQuantity: number;
  filledQuantity: number;
  status: string;
  conid: number;
}

export interface IbkrAccountSummary {
  netliquidation?: { amount: number };
  [key: string]: unknown;
}

export function getAuthStatus(): Promise<IbkrAuthStatus> {
  return get<IbkrAuthStatus>("/iserver/auth/status");
}

export function getAccounts(): Promise<IbkrAccount[]> {
  return get<IbkrAccount[]>("/portfolio/accounts");
}

export function getPositions(accountId: string): Promise<IbkrPosition[]> {
  return get<IbkrPosition[]>(`/portfolio/${accountId}/positions/0`);
}

export function getOrders(): Promise<{ orders: IbkrOrder[] }> {
  return get<{ orders: IbkrOrder[] }>("/iserver/account/orders");
}

export function getAccountSummary(accountId: string): Promise<IbkrAccountSummary> {
  return get<IbkrAccountSummary>(`/portfolio/${accountId}/summary`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ibkr/client.ts
git commit -m "feat(ibkr): add read-only Client Portal thin client"
```

---

### Task 6: Sector lookup helper

The existing `fetchFundamentals()` does not request the `assetProfile` Yahoo module, so it does not return sector. Add a small helper that uses the same on-disk cache pattern.

**Files:**
- Modify: `lib/yahoo.ts` — append `fetchSector()` function

- [ ] **Step 1: Append `fetchSector` to lib/yahoo.ts**

Add this function at the end of the file:

```ts
export async function fetchSector(symbol: string): Promise<string> {
  const key = `sector/${symbol}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.FUNDAMENTALS)) {
    const cached = cacheRead(CACHE_DIR, key) as { sector: string };
    return cached.sector;
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    });
    const sector =
      (summary as { assetProfile?: { sector?: string } }).assetProfile?.sector ?? "Unknown";
    cacheWrite(CACHE_DIR, key, { sector });
    return sector;
  } catch (e) {
    console.error(`Failed to fetch sector for ${symbol}:`, e);
    return "Unknown";
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/yahoo.ts
git commit -m "feat(yahoo): add sector lookup helper with 24h cache"
```

---

### Task 7: IBKR positions API route

**Files:**
- Create: `app/api/ibkr/positions/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import {
  getAuthStatus,
  getAccounts,
  getPositions,
  getOrders,
  getAccountSummary,
} from "@/lib/ibkr/client";
import { fetchSector } from "@/lib/yahoo";
import type { IbkrSnapshot, Position, Order } from "@/lib/risk/types";

const DISCONNECTED: IbkrSnapshot = {
  connected: false,
  lastUpdated: null,
  positions: [],
  orders: [],
  netLiquidation: null,
};

export async function POST() {
  try {
    const auth = await getAuthStatus();
    if (!auth.authenticated) {
      return NextResponse.json(DISCONNECTED);
    }

    const accounts = await getAccounts();
    if (accounts.length === 0) {
      return NextResponse.json(DISCONNECTED);
    }
    const accountId = accounts[0].id;

    const [rawPositions, rawOrdersResp, summary] = await Promise.all([
      getPositions(accountId),
      getOrders(),
      getAccountSummary(accountId),
    ]);

    const sectors = await Promise.all(
      rawPositions.map((p) => fetchSector(p.ticker ?? p.contractDesc)),
    );

    const positions: Position[] = rawPositions.map((p, i) => ({
      symbol: p.ticker ?? p.contractDesc,
      name: p.contractDesc,
      sector: sectors[i],
      quantity: p.position,
      avgEntryPrice: p.avgCost,
      currentPrice: p.mktPrice,
    }));

    const orders: Order[] = (rawOrdersResp.orders ?? []).map((o) => ({
      symbol: o.ticker,
      side: o.side,
      orderType: o.orderType,
      origOrderType: o.origOrderType,
      quantity: o.remainingQuantity,
      price: o.price,
      status: o.status,
    }));

    const netLiquidation =
      (summary.netliquidation as { amount?: number } | undefined)?.amount ?? null;

    const snapshot: IbkrSnapshot = {
      connected: true,
      lastUpdated: new Date().toISOString(),
      positions,
      orders,
      netLiquidation,
    };

    return NextResponse.json(snapshot);
  } catch (e) {
    console.error("IBKR positions route failed:", e);
    return NextResponse.json(DISCONNECTED);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ibkr/positions/route.ts
git commit -m "feat(api): add /api/ibkr/positions snapshot route"
```

---

**CHECKPOINT: Milestone 2 complete.** Backend can now produce a normalized IBKR snapshot or a `connected: false` response when the gateway is unreachable.

---

## Milestone 3: Dashboard Risk Panel

Adds the connection banner, portfolio summary, sector breakdown, and position table to the dashboard.

### Task 8: useIbkr hook

**Files:**
- Create: `lib/hooks/use-ibkr.ts`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { IbkrSnapshot } from "@/lib/risk/types";

const EMPTY: IbkrSnapshot = {
  connected: false,
  lastUpdated: null,
  positions: [],
  orders: [],
  netLiquidation: null,
};

export function useIbkr() {
  const [snapshot, setSnapshot] = useState<IbkrSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ibkr/positions", { method: "POST" });
      const data = (await res.json()) as IbkrSnapshot;
      setSnapshot(data);
    } catch {
      setSnapshot(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { snapshot, loading, refresh };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-ibkr.ts
git commit -m "feat(hooks): add useIbkr hook"
```

---

### Task 9: IBKR connection banner component

**Files:**
- Create: `components/ibkr-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import type { IbkrSnapshot } from "@/lib/risk/types";

export function IbkrBanner({ snapshot, loading, onRefresh }: {
  snapshot: IbkrSnapshot;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (!snapshot.connected) {
    return (
      <div className="rounded-md border border-yellow-500/60 bg-yellow-500/10 p-3 text-sm flex items-center justify-between">
        <span>
          IBKR Disconnected — log in at{" "}
          <a className="underline" href="https://localhost:5000" target="_blank" rel="noreferrer">
            https://localhost:5000
          </a>
        </span>
        <button onClick={onRefresh} className="text-xs underline" disabled={loading}>
          {loading ? "Checking..." : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-green-500/60 bg-green-500/10 p-3 text-sm flex items-center justify-between">
      <span>
        Connected · Last updated{" "}
        {snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleTimeString() : "—"}
      </span>
      <button onClick={onRefresh} className="text-xs underline" disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ibkr-banner.tsx
git commit -m "feat(ui): add IBKR connection banner"
```

---

### Task 10: Risk panel component

**Files:**
- Create: `components/risk-panel.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Fragment, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk } from "@/lib/risk/portfolio-risk";
import { positionRisk } from "@/lib/risk/position-risk";
import { IbkrBanner } from "./ibkr-banner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function RiskPanel() {
  const { snapshot, loading, refresh } = useIbkr();
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openPositions, setOpenPositions] = useState<Set<string>>(new Set());

  const risk = useMemo(
    () => portfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0),
    [snapshot],
  );

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Risk</CardTitle>
        <Link href="/risk/simulate" className="text-sm underline">Simulate Trade</Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <IbkrBanner snapshot={snapshot} loading={loading} onRefresh={refresh} />

        {snapshot.connected && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div className="text-muted-foreground">Net Liquidation</div><div className="font-medium">{fmt(risk.netLiquidation)}</div></div>
              <div><div className="text-muted-foreground">Entry → Stop</div><div className="font-medium">{fmt(risk.totalEntryToStop)}</div></div>
              <div><div className="text-muted-foreground">Current → Stop</div><div className="font-medium">{fmt(risk.totalCurrentToStop)}</div></div>
              <div><div className="text-muted-foreground">Risk %</div><div className="font-medium">{(risk.totalRiskPercent * 100).toFixed(2)}%</div></div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Sectors</h3>
              <div className="divide-y">
                {risk.sectors.map((s) => (
                  <div key={s.sector}>
                    <button
                      className="w-full flex justify-between py-2 text-sm"
                      onClick={() => toggle(openSectors, s.sector, setOpenSectors)}
                    >
                      <span>{s.sector} ({s.positionCount})</span>
                      <span className="tabular-nums">{fmt(s.totalCurrentToStop)}</span>
                    </button>
                    {openSectors.has(s.sector) && (
                      <div className="text-xs text-muted-foreground pb-2 pl-2">
                        Entry → Stop: {fmt(s.totalEntryToStop)} · Current → Stop: {fmt(s.totalCurrentToStop)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Positions</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Entry</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">P&amp;L</th>
                    <th className="text-right">E→S</th>
                    <th className="text-right">C→S</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.positions.map((p) => {
                    const pr = positionRisk(p, snapshot.orders);
                    const pnl = (p.currentPrice - p.avgEntryPrice) * p.quantity;
                    const pnlPct = ((p.currentPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100;
                    const positionOrders = snapshot.orders.filter((o) => o.symbol === p.symbol);
                    const isOpen = openPositions.has(p.symbol);
                    return (
                      <Fragment key={p.symbol}>
                        <tr
                          className="border-t cursor-pointer"
                          onClick={() => toggle(openPositions, p.symbol, setOpenPositions)}
                        >
                          <td className="py-1">
                            {p.symbol}
                            {pr.unriskedQty > 0 && (
                              <span className="ml-1 text-yellow-500" title={`${pr.unriskedQty} shares unprotected`}>⚠</span>
                            )}
                          </td>
                          <td className="text-right tabular-nums">{p.quantity}</td>
                          <td className="text-right tabular-nums">{p.avgEntryPrice.toFixed(2)}</td>
                          <td className="text-right tabular-nums">{p.currentPrice.toFixed(2)}</td>
                          <td className={`text-right tabular-nums ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {fmt(pnl)} ({pnlPct.toFixed(1)}%)
                          </td>
                          <td className="text-right tabular-nums">{fmt(pr.entryToStopRisk)}</td>
                          <td className="text-right tabular-nums">{fmt(pr.currentToStopRisk)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/30">
                            <td colSpan={7} className="p-2 text-xs">
                              {positionOrders.length === 0 ? (
                                <span className="text-muted-foreground">No pending orders</span>
                              ) : (
                                <ul className="space-y-1">
                                  {positionOrders.map((o, i) => (
                                    <li key={i}>
                                      {o.side} {o.orderType} {o.quantity} @ {o.price} ({o.status})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/risk-panel.tsx
git commit -m "feat(ui): add risk panel with sector and position breakdown"
```

---

### Task 11: Mount risk panel on dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the risk panel below the strategy grid**

In `app/page.tsx`, import the panel near the top:

```tsx
import { RiskPanel } from "@/components/risk-panel";
```

And add it inside the root `<div className="space-y-6">`, after the strategy grid `</div>`:

```tsx
<RiskPanel />
```

The final return becomes:

```tsx
return (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        Live results for all strategies using your saved parameters.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {strategies.map((strategy) => (
        <StrategyCard key={strategy.slug} strategy={strategy} />
      ))}
    </div>
    <RiskPanel />
  </div>
);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(dashboard): mount risk panel below strategies"
```

---

**CHECKPOINT: Milestone 3 complete.** Dashboard now shows IBKR connection state and full portfolio risk breakdown.

---

## Milestone 4: Trade Simulator Page

A standalone page for adding hypothetical trades and seeing how they shift current vs projected portfolio risk, with a price chart for the focused symbol.

### Task 12: Trade simulator component

**Files:**
- Create: `components/trade-simulator.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk, simulatePortfolioRisk } from "@/lib/risk/portfolio-risk";
import type { SimulatedTrade } from "@/lib/risk/types";
import { PriceChart } from "@/components/price-chart";
import type { StockData } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function delta(before: number, after: number): string {
  const d = after - before;
  const sign = d >= 0 ? "+" : "";
  return `${fmt(before)} → ${fmt(after)} (${sign}${fmt(d)})`;
}

export function TradeSimulator() {
  const { snapshot } = useIbkr();
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [chartData, setChartData] = useState<StockData | null>(null);

  const baseline = useMemo(
    () => portfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0),
    [snapshot],
  );

  const projected = useMemo(
    () => simulatePortfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0, trades),
    [snapshot, trades],
  );

  const focusedSymbol = focusedIdx !== null ? trades[focusedIdx]?.symbol : null;

  useEffect(() => {
    if (!focusedSymbol) {
      setChartData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/history/${focusedSymbol}?days=150`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.candles?.length) {
          setChartData({ candles: data.candles } as unknown as StockData);
        } else {
          setChartData(null);
        }
      })
      .catch(() => !cancelled && setChartData(null));
    return () => {
      cancelled = true;
    };
  }, [focusedSymbol]);

  const addTrade = () => {
    setTrades([...trades, { symbol: "", quantity: 0, entryPrice: 0, stopPrice: 0 }]);
    setFocusedIdx(trades.length);
  };

  const updateTrade = (i: number, patch: Partial<SimulatedTrade>) => {
    setTrades(trades.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const removeTrade = (i: number) => {
    setTrades(trades.filter((_, idx) => idx !== i));
    if (focusedIdx === i) setFocusedIdx(null);
  };

  const sectorMap = (rs: typeof projected.sectors) =>
    new Map(rs.map((s) => [s.sector, s.totalCurrentToStop]));
  const baseSectors = sectorMap(baseline.sectors);
  const projSectors = sectorMap(projected.sectors);
  const allSectors = new Set([...baseSectors.keys(), ...projSectors.keys()]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Simulated Trades</CardTitle>
            <button onClick={addTrade} className="text-sm underline">+ Add Trade</button>
          </CardHeader>
          <CardContent className="space-y-2">
            {trades.length === 0 && (
              <p className="text-sm text-muted-foreground">No simulated trades. Click &quot;Add Trade&quot; to start.</p>
            )}
            {trades.map((t, i) => (
              <div
                key={i}
                className={`grid grid-cols-5 gap-2 items-center p-2 rounded ${focusedIdx === i ? "bg-muted" : ""}`}
                onClick={() => setFocusedIdx(i)}
              >
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="SYMBOL"
                  value={t.symbol}
                  onChange={(e) => updateTrade(i, { symbol: e.target.value.toUpperCase() })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Qty"
                  type="number"
                  value={t.quantity || ""}
                  onChange={(e) => updateTrade(i, { quantity: parseFloat(e.target.value) || 0 })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Entry"
                  type="number"
                  value={t.entryPrice || ""}
                  onChange={(e) => updateTrade(i, { entryPrice: parseFloat(e.target.value) || 0 })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Stop"
                  type="number"
                  value={t.stopPrice || ""}
                  onChange={(e) => updateTrade(i, { stopPrice: parseFloat(e.target.value) || 0 })}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeTrade(i); }}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk Comparison</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Total Current → Stop</div>
              <div className="font-medium">{delta(baseline.totalCurrentToStop, projected.totalCurrentToStop)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Risk %</div>
              <div className="font-medium">
                {(baseline.totalRiskPercent * 100).toFixed(2)}% → {(projected.totalRiskPercent * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Sectors</div>
              <ul className="space-y-1">
                {Array.from(allSectors).map((sec) => (
                  <li key={sec} className="flex justify-between">
                    <span>{sec}</span>
                    <span className="tabular-nums">
                      {delta(baseSectors.get(sec) ?? 0, projSectors.get(sec) ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{focusedSymbol ?? "Select a trade"}</CardTitle></CardHeader>
        <CardContent>
          {chartData ? (
            <PriceChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/trade-simulator.tsx
git commit -m "feat(ui): add trade simulator component"
```

---

### Task 13: Simulator page route

**Files:**
- Create: `app/risk/simulate/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { TradeSimulator } from "@/components/trade-simulator";

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trade Simulator</h1>
        <p className="text-muted-foreground mt-1">
          Add hypothetical trades to see how they shift portfolio risk.
        </p>
      </div>
      <TradeSimulator />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/risk/simulate/page.tsx
git commit -m "feat(risk): add trade simulator page route"
```

---

**CHECKPOINT: Milestone 4 complete.** The simulator page is live at `/risk/simulate` and reachable from the dashboard "Simulate Trade" link.

---

## Final Verification

### Task 14: Full test suite and build

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All risk tests pass (17 tests across 3 files).

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Manual smoke test (with gateway running)**

1. Start gateway: `cd ~/Downloads/clientportal.gw && bin/run.sh root/conf.yaml`, log in at `https://localhost:5000`.
2. Run `npm run dev`.
3. Open dashboard — verify the connection banner shows "Connected" and positions render.
4. Stop the gateway — refresh — verify the disconnected banner appears and the rest of the dashboard still works.
5. Restart gateway, navigate to `/risk/simulate`, add a trade for an existing symbol, verify the projected sector totals update and the chart renders.

- [ ] **Step 4: No commit needed if everything is green.**

---

## Out of Scope (do not build)

- Trade execution — the IBKR client is read-only.
- Auto-polling or session keep-alive.
- Persisting simulated trades across navigation.
- Historical risk tracking.
- The Spec 3 dashboard portfolio panel combining IBKR with strategy picks.
