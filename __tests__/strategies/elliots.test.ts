import { describe, it, expect } from "vitest";
import { elliots, monthHigh } from "@/lib/strategies/elliots";
import { Candle, StockData } from "@/lib/types";

function makeCandles(closes: number[], volume: number = 1000): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high: close + 1, low: close - 1, close, volume,
  }));
}

describe("monthHigh", () => {
  it("returns true when recent candles break past month high", () => {
    const candles = makeCandles([...Array(27).fill(100), 105, 106, 107]);
    expect(monthHigh(candles, 30, 3, 2)).toBe(true);
  });
  it("returns false when recent candles are below month high", () => {
    expect(monthHigh(makeCandles(Array(30).fill(100)), 30, 3, 2)).toBe(false);
  });
});

describe("elliots.filter", () => {
  it("passes a stock meeting all criteria", () => {
    const stock = {
      candles: makeCandles([...Array(27).fill(100), 105, 106, 107]),
      summaryDetail: { marketCap: 5e9 },
      last: { rsi14: 60 },
      fundamentalsScore: 7,
    } as unknown as StockData;
    const result = elliots.filter(stock, { minMcap: 2, maxRsi: 73, monthDays: 30, minFundamentalsScore: 5 });
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
    const result = elliots.filter(stock, { minMcap: 2, maxRsi: 73, monthDays: 30, minFundamentalsScore: 0 });
    expect(result.mcap).toBe(false);
  });
});
