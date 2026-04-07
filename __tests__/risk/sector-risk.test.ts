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
