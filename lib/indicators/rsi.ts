import { Candle } from "@/lib/types";

export function rsi(candles: Candle[], period: number): number | null {
  const len = candles.length;
  if (len < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = len - period - 1; i < len - 1; i++) {
    const change = candles[i + 1].close - candles[i].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const lastChange = candles[len - 1].close - candles[len - 2].close;
  avgGain = (avgGain * (period - 1) + (lastChange > 0 ? lastChange : 0)) / period;
  avgLoss = (avgLoss * (period - 1) + (lastChange < 0 ? -lastChange : 0)) / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}
