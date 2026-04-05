import { Candle } from "@/lib/types";

export function insertSma(candles: Candle[], period: number): void {
  if (candles.length < period) return;
  const key = `sma${period}`;
  let sum = 0;
  let tailIdx = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i - tailIdx >= period) {
      sum -= candles[tailIdx].close;
      tailIdx++;
    }
    if (i - tailIdx + 1 === period) {
      candles[i][key] = sum / period;
    }
  }
}
