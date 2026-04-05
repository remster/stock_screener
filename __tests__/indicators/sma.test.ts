import { describe, it, expect } from "vitest";
import { insertSma } from "@/lib/indicators/sma";
import { Candle } from "@/lib/types";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high: close + 1, low: close - 1, close, volume: 1000,
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
