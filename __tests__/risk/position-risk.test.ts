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
