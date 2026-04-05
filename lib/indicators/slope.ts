import { Candle } from "@/lib/types";

export function smaSlope(candles: Candle[], smaPeriod: number, lookback: number = 10): number {
  const key = `sma${smaPeriod}`;
  const len = candles.length;
  const smaValues: number[] = [];
  for (let i = len - 1; i >= 0 && smaValues.length < lookback; i--) {
    const val = candles[i][key];
    if (typeof val === "number") smaValues.unshift(val);
  }
  if (smaValues.length < 2) return 0;
  const n = smaValues.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += smaValues[i]; sumXY += i * smaValues[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgSma = sumY / n;
  if (avgSma === 0) return 0;
  const normalizedSlope = (slope / avgSma) * 100;
  return Math.atan(normalizedSlope) * (180 / Math.PI);
}
