import { describe, it, expect } from "vitest";
import { smaSlope } from "@/lib/indicators/slope";
import { Candle } from "@/lib/types";
import { insertSma } from "@/lib/indicators/sma";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high: close + 1, low: close - 1, close, volume: 1000,
  }));
}

describe("smaSlope", () => {
  it("returns positive slope for rising SMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    insertSma(candles, 10);
    expect(smaSlope(candles, 10)).toBeGreaterThan(0);
  });

  it("returns negative slope for falling SMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i);
    const candles = makeCandles(closes);
    insertSma(candles, 10);
    expect(smaSlope(candles, 10)).toBeLessThan(0);
  });

  it("returns 0 if SMA data is insufficient", () => {
    expect(smaSlope(makeCandles([10, 20]), 50)).toBe(0);
  });
});
