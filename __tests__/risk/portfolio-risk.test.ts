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
    expect(result.totalCostBasis).toBe(100 * 195 + 200 * 150); // 19500 + 30000 = 49500
    expect(result.totalRiskPercent).toBeCloseTo(1500 / 100000);
    expect(result.totalRiskPercentCostBasis).toBeCloseTo(1500 / 49500);
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
