import { describe, it, expect } from "vitest";
import { rsi } from "@/lib/indicators/rsi";
import { Candle } from "@/lib/types";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high: close + 1, low: close - 1, close, volume: 1000,
  }));
}

describe("rsi", () => {
  it("returns null if not enough candles", () => {
    expect(rsi(makeCandles([10, 20, 30]), 14)).toBeNull();
  });

  it("returns 100 when all changes are positive", () => {
    const closes = Array.from({ length: 16 }, (_, i) => 100 + i);
    expect(rsi(makeCandles(closes), 14)).toBe(100);
  });

  it("returns a value between 0 and 100 for mixed data", () => {
    const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00];
    const result = rsi(makeCandles(closes), 14);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});
