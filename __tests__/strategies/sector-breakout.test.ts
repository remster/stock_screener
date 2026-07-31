import { describe, it, expect } from "vitest";
import { sectorBreakout } from "@/lib/strategies/sector-breakout";
import { Candle, StockData } from "@/lib/types";
import { insertSma } from "@/lib/indicators/sma";

function makeCandles(closes: number[], volumes?: number[]): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high: close + 2, low: close - 2, close,
    volume: volumes?.[i] ?? 1000,
  }));
}

describe("sectorBreakout.filter", () => {
  it("passes stock with rising SMA, high volume, and positive RSI", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    insertSma(candles, 50);
    const stock = {
      candles, last: { close: 160, volume: 5000, rsi14: 65, support: [], resistance: [] },
      summaryDetail: { averageVolume10days: 2000 }, fundamentalsScore: 6,
    } as unknown as StockData;
    const result = sectorBreakout.filter(stock, { smaWindow: 50, minSlopeAngle: 1, volumeMultiplier: 1.2, minFundamentalsScore: 5 });
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
      candles, last: { close: 140, volume: 5000, rsi14: 35 },
      summaryDetail: { averageVolume10days: 2000 }, fundamentalsScore: 6,
    } as unknown as StockData;
    const result = sectorBreakout.filter(stock, { smaWindow: 50, minSlopeAngle: 1, volumeMultiplier: 1.2, minFundamentalsScore: 0 });
    expect(result.smaRising).toBe(false);
  });
});
