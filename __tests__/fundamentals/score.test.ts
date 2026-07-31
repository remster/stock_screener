import { describe, it, expect } from "vitest";
import { computeFundamentalsScore, extractMetricValue } from "@/lib/fundamentals/score";

const goodStock = {
  summaryDetail: { forwardPE: 12, dividendYield: 0.025 },
  financialData: {
    profitMargins: 0.25, returnOnEquity: 0.22, revenueGrowth: 0.18,
    earningsGrowth: 0.20, debtToEquity: 30, currentRatio: 2.5,
  },
  defaultKeyStatistics: { pegRatio: 0.9, priceToBook: 2.5 },
};

const badStock = {
  summaryDetail: { forwardPE: 45, dividendYield: 0 },
  financialData: {
    profitMargins: 0.03, returnOnEquity: 0.04, revenueGrowth: -0.02,
    earningsGrowth: -0.05, debtToEquity: 180, currentRatio: 0.7,
  },
  defaultKeyStatistics: { pegRatio: 3.5, priceToBook: 15 },
};

describe("computeFundamentalsScore", () => {
  it("scores a fundamentally strong stock above 7", () => {
    const result = computeFundamentalsScore(goodStock);
    expect(result.composite).toBeGreaterThan(7);
  });

  it("scores a fundamentally weak stock below 3", () => {
    const result = computeFundamentalsScore(badStock);
    expect(result.composite).toBeLessThan(3);
  });

  it("returns individual metric scores", () => {
    const result = computeFundamentalsScore(goodStock);
    expect(result.metrics.length).toBe(10);
    expect(result.metrics[0]).toHaveProperty("key");
    expect(result.metrics[0]).toHaveProperty("value");
    expect(result.metrics[0]).toHaveProperty("score");
    expect(result.metrics[0]).toHaveProperty("rating");
  });

  it("handles missing data gracefully", () => {
    const partial = { summaryDetail: {}, financialData: {}, defaultKeyStatistics: {} };
    const result = computeFundamentalsScore(partial);
    expect(result.composite).toBeCloseTo(5, 0);
    result.metrics.forEach((m) => {
      if (m.value === null) expect(m.rating).toBe("grey");
    });
  });
});

describe("extractMetricValue", () => {
  it("extracts nested values", () => {
    expect(extractMetricValue(goodStock, "financialData", "profitMargins")).toBe(0.25);
  });

  it("returns null for missing fields", () => {
    expect(extractMetricValue({}, "financialData", "profitMargins")).toBeNull();
  });
});
