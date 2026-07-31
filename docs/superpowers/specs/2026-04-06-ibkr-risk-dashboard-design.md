# IBKR Integration & Risk Dashboard — Design Spec

**Scope:** Second of three specs. Adds read-only IBKR Client Portal API integration, portfolio risk calculations, and a trade simulator. Builds on the existing Next.js stock screener from Spec 1.

---

## 1. IBKR Thin Client

**File:** `lib/ibkr/client.ts` — the only file in the codebase that communicates with the IBKR Client Portal Gateway.

**Gateway prerequisite:** The user manually runs the Client Portal Gateway JAR (`java -jar clientportal.gw.jar`) and logs in via browser at `https://localhost:5000` before using the risk features. Our app does not start, stop, or manage the gateway process.

**Configuration:** Gateway URL via environment variable `IBKR_GATEWAY_URL` (defaults to `https://localhost:5000/v1/portal`).

**Exported functions (read-only only):**

- `getAuthStatus()` — `GET /iserver/auth/status`. Returns `{ authenticated: boolean, competing: boolean, ... }`.
- `getAccounts()` — `GET /portfolio/accounts`. Returns array of account objects with `id` field.
- `getPositions(accountId: string)` — `GET /portfolio/{accountId}/positions/0`. Returns array of position objects (page 0). Key fields: `conid`, `contractDesc`, `position`, `avgCost`, `mktPrice`, `mktValue`, `unrealizedPnl`, `ticker`.
- `getOrders()` — `GET /iserver/account/orders`. Returns `{ orders: [...] }`. Key fields per order: `ticker`, `side` ("BUY"/"SELL"), `orderType` ("Limit"/"Stop"/"Trail"/etc.), `origOrderType` ("LIMIT"/"STP"/"TRAIL"/etc.), `price`, `remainingQuantity`, `filledQuantity`, `status` ("Submitted"/"PreSubmitted"/etc.), `conid`.
- `getAccountSummary(accountId: string)` — `GET /portfolio/{accountId}/summary`. Returns account summary including net liquidation value.

**Note on `origOrderType`:** The orders endpoint returns `orderType` as display text (e.g. "Stop") and `origOrderType` as the canonical code (e.g. "STP"). The risk matching logic should use `origOrderType === "STP"` to identify stop orders.

**No other file imports from or references the gateway URL.** All IBKR data access flows through this client.

---

## 2. Data Model

### Raw data from IBKR (returned by API route)

```ts
interface Position {
  symbol: string;
  name: string;
  sector: string;        // from Yahoo Finance quoteSummary, fallback "Unknown"
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
}

interface Order {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;     // display text: "Stop", "Limit", "Trail", etc.
  origOrderType: string; // canonical code: "STP", "LMT", "MKT", "TRAIL", etc.
  quantity: number;      // remainingQuantity from IBKR
  price: number;         // stop price for STP, limit price for LMT
  status: string;        // "PreSubmitted", "Submitted", etc.
}

interface IbkrSnapshot {
  connected: boolean;
  lastUpdated: string | null;  // ISO timestamp
  positions: Position[];
  orders: Order[];
  netLiquidation: number | null;
}
```

### Risk calculations (client-side)

```ts
interface PositionRisk {
  symbol: string;
  entryToStopRisk: number;     // sum of (qty * (entry - stop)) per matching stop
  currentToStopRisk: number;   // sum of (qty * (current - stop)) per matching stop
  unriskedQty: number;         // shares not covered by any sell stop
}

interface SectorRisk {
  sector: string;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  positionCount: number;
}

interface PortfolioRisk {
  netLiquidation: number;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  totalRiskPercent: number;    // currentToStop / netLiquidation
  sectors: SectorRisk[];
  positions: PositionRisk[];
}
```

### Simulated trade

```ts
interface SimulatedTrade {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopPrice: number;
}
```

---

## 3. API Route

**`POST /api/ibkr/positions`** (POST because it may receive account selection in future)

1. Calls `getAuthStatus()` — if not authenticated, returns `{ connected: false, lastUpdated: null, positions: [], orders: [], netLiquidation: null }`.
2. Calls `getAccounts()` to get the account ID.
3. Calls `getPositions()`, `getOrders()`, and `getAccountSummary()` in parallel.
4. For each position, looks up sector from Yahoo Finance fundamentals (uses existing `fetchFundamentals` with its 24h cache). Falls back to `"Unknown"` if lookup fails.
5. Maps IBKR response fields to the `Position` and `Order` interfaces.
6. Returns `IbkrSnapshot`.

**Stop-to-position matching happens client-side.** The API route returns raw positions and orders without pre-filtering or matching.

---

## 4. Risk Calculation Functions

**Location:** `lib/risk/` — pure functions, no side effects, testable with Vitest.

**`positionRisk(position: Position, orders: Order[]): PositionRisk`**
- Filters orders for matching symbol, `side === "SELL"`, `origOrderType === "STP"`
- For each matching stop: computes `qty * (entry - stop)` and `qty * (current - stop)`
- Sums across all matching stops
- `unriskedQty` = position quantity minus sum of stop order quantities (clamped to 0)

**`sectorRisk(positions: Position[], orders: Order[]): SectorRisk[]`**
- Groups positions by sector
- Sums `positionRisk` results per group

**`portfolioRisk(positions: Position[], orders: Order[], netLiquidation: number): PortfolioRisk`**
- Computes all position risks, all sector risks
- Totals entry-to-stop and current-to-stop across portfolio
- `totalRiskPercent = totalCurrentToStop / netLiquidation`

**`simulatePortfolioRisk(positions: Position[], orders: Order[], netLiquidation: number, trades: SimulatedTrade[]): PortfolioRisk`**
- Appends each simulated trade as a temporary `Position` (using `entryPrice` as both entry and current) and a temporary sell stop `Order`
- Runs `portfolioRisk` on the combined arrays
- Returns the projected risk state

---

## 5. UI — Dashboard Risk Panel

Added to the existing dashboard page (`app/page.tsx`), below the strategy cards.

**Connection banner:**
- Gateway unreachable or session expired: "IBKR Disconnected — log in at https://localhost:5000" with a warning color.
- Connected: "Connected · Last updated {timestamp}"

**Portfolio summary row:**
- Net liquidation value
- Total entry-to-stop risk ($ amount)
- Total current-to-stop risk ($ amount)
- Risk as % of portfolio

**Sector breakdown:**
- Collapsible rows per sector
- Each row: sector name, position count, total entry-to-stop, total current-to-stop

**Position table:**
- Columns: symbol, name, qty, entry price, current price, P&L ($ and %), entry-to-stop risk, current-to-stop risk
- Positions without any stop orders shown with a warning indicator
- Expandable row detail shows all pending orders for that position (buys, limits, stops — everything)

**Refresh button:** Manual re-fetch of IBKR data. No auto-polling.

**"Simulate Trade" button:** Navigates to `/risk/simulate`.

---

## 6. UI — Trade Simulator Page

**Route:** `/risk/simulate`

**Layout:**
- Left side: simulated trades list + portfolio risk comparison
- Right side: price chart for the currently selected/focused trade's symbol

**Simulated trades list:**
- "Add Trade" button adds a row with fields: symbol, quantity, entry price, stop price
- All fields are live-editable — risk recalculates on every change
- Each trade can be removed individually
- Symbol field triggers chart update on the right side

**Risk comparison panel:**
- Two columns: "Current" (real portfolio) and "Projected" (real + simulated trades)
- Shows: total risk, risk %, sector breakdown
- Deltas highlighted (e.g., "Total risk: $4,200 → $4,700 (+$500)")
- Sector-level deltas visible (new sector appears, existing sector risk increases)

**Chart:**
- Reuses existing `PriceChart` component
- Shows the chart for whichever simulated trade row is focused
- Fetches data via existing `/api/history/[symbol]` route (cached)

---

## 7. Error Handling

**Gateway not running / session expired:**
- API route catches connection errors, returns `{ connected: false }`.
- Dashboard shows disconnected banner. Strategy cards and rest of the app work normally.
- No retries or background recovery. User restarts gateway and refreshes.

**Position with no matching stop orders:**
- Shown in position table with warning indicator.
- `unriskedQty` displayed so user knows how many shares are unprotected.
- Risk values for that position show only the covered portion (could be $0 if no stops).

**Yahoo sector lookup fails:**
- Falls back to `"Unknown"` sector.
- Risk math still works, position grouped under "Unknown" in sector breakdown.

**Simulator — invalid symbol:**
- Chart shows "No data" if the symbol doesn't exist.
- Risk calculation still works (uses the entered entry/stop prices).

---

## 8. Testing

Vitest for pure logic. No E2E.

**Risk calculation functions (`lib/risk/`):**
- `positionRisk`: single position with multiple stops, no stops, partial stop coverage, stop quantity exceeding position quantity
- `sectorRisk`: multiple sectors, single sector, unknown sector
- `portfolioRisk`: full portfolio with mixed positions, risk percentage calculation, zero net liquidation edge case
- `simulatePortfolioRisk`: single simulated trade, multiple trades, trade in existing sector, trade in new sector

**Stop matching logic:**
- Correctly matches sell stop orders to positions by symbol
- Ignores buy orders, limit orders, trailing stops, other order types
- Handles multiple stops per symbol
- Handles positions with zero matching orders

**IBKR thin client:** Not unit tested. HTTP calls to the gateway — breaks visibly if response shape changes.

---

## 9. File Structure

```
lib/ibkr/
  client.ts              # Thin client — sole gateway interface

lib/risk/
  types.ts               # Position, Order, PositionRisk, SectorRisk, PortfolioRisk, SimulatedTrade
  position-risk.ts       # positionRisk()
  sector-risk.ts         # sectorRisk()
  portfolio-risk.ts      # portfolioRisk(), simulatePortfolioRisk()

app/api/ibkr/
  positions/route.ts     # POST — fetches and enriches IBKR data

app/risk/
  simulate/page.tsx      # Trade simulator page

components/
  risk-panel.tsx         # Dashboard risk summary (connection banner, portfolio summary, sector breakdown, position table)
  trade-simulator.tsx    # Simulator form + risk comparison
  ibkr-banner.tsx        # Connection status banner

__tests__/risk/
  position-risk.test.ts
  sector-risk.test.ts
  portfolio-risk.test.ts
  simulate.test.ts
```

---

## 10. Out of Scope

- Trade execution (read-only, always)
- Auto-polling or session keep-alive for the gateway
- Persisting simulated trades (local state only, cleared on navigation)
- Historical risk tracking or risk-over-time charts
- **Spec 3:** Dashboard portfolio panel combining IBKR positions with strategy picks
