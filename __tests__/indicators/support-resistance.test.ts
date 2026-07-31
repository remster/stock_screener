import { describe, it, expect } from "vitest";
import { supportResistance } from "@/lib/indicators/support-resistance";
import { Candle } from "@/lib/types";

function makeCandle(i: number, low: number, high: number, close: number, volume: number): Candle {
  return {
    date: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    open: close, high, low, close, volume,
  };
}

describe("supportResistance", () => {
  it("finds a swing low as support", () => {
    const candles = [
      makeCandle(0, 99, 102, 101, 5000), makeCandle(1, 98, 101, 100, 5000),
      makeCandle(2, 97, 100, 99, 5000), makeCandle(3, 95, 97, 96, 8000),
      makeCandle(4, 97, 100, 99, 5000), makeCandle(5, 98, 101, 100, 5000),
      makeCandle(6, 99, 102, 101, 5000),
    ];
    const result = supportResistance(candles, 3);
    expect(result.supports.length).toBeGreaterThan(0);
    expect(result.supports[0].level).toBeCloseTo(95, 0);
  });

  it("finds a swing high as resistance", () => {
    const candles = [
      makeCandle(0, 99, 101, 100, 5000), makeCandle(1, 100, 102, 101, 5000),
      makeCandle(2, 101, 103, 102, 5000), makeCandle(3, 103, 106, 105, 8000),
      makeCandle(4, 101, 103, 102, 5000), makeCandle(5, 100, 102, 101, 5000),
      makeCandle(6, 99, 101, 100, 5000),
    ];
    const result = supportResistance(candles, 3);
    expect(result.resistances.length).toBeGreaterThan(0);
    expect(result.resistances[0].level).toBeCloseTo(106, 0);
  });

  it("returns empty arrays for insufficient data", () => {
    const result = supportResistance([makeCandle(0, 99, 101, 100, 1000)], 3);
    expect(result.supports).toEqual([]);
    expect(result.resistances).toEqual([]);
  });
});
