import { Strategy } from "./types";
import { registerStrategy } from "./registry";
import { StockData, Candle } from "@/lib/types";
import { ALL_SECTOR_SYMBOLS } from "@/lib/sectors";

export function monthHigh(
  candles: Candle[], monthDays: number = 30, recentCount: number = 3, marginPcnt: number = 2
): boolean {
  const sliced = candles.slice(-monthDays);
  const past = sliced.slice(0, -recentCount);
  const recent = sliced.slice(-recentCount);
  if (past.length === 0 || recent.length === 0) return false;
  const recentMax = Math.max(...recent.map((c) => c.close));
  const pastMax = Math.max(...past.map((c) => c.close));
  return pastMax * (1 + marginPcnt / 100) < recentMax;
}

function closestToSma(days: number, normalize: boolean = true) {
  return (a: StockData, b: StockData): number => {
    const key = `sma${days}` as keyof typeof a.last;
    const aDist = a.last.close - ((a.last[key] as number) ?? a.last.close);
    const bDist = b.last.close - ((b.last[key] as number) ?? b.last.close);
    const aVal = normalize ? aDist / a.last.close : aDist;
    const bVal = normalize ? bDist / b.last.close : bDist;
    return aVal - bVal;
  };
}

export const elliots: Strategy = {
  slug: "elliots",
  name: "Elliot's Screen",
  description: "Month-high breakouts with momentum confirmation",
  sectors: ALL_SECTOR_SYMBOLS,
  params: [
    { key: "minMcap", label: "Min Market Cap ($B)", default: 2, min: 0.5, step: 0.5 },
    { key: "maxRsi", label: "Max RSI(14)", default: 73, min: 30, max: 90 },
    { key: "monthDays", label: "Month High Lookback (days)", default: 30, min: 10, max: 90 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock: StockData, params: Record<string, number>) => ({
    monthHigh: monthHigh(stock.candles, params.monthDays),
    mcap: stock.summaryDetail.marketCap > params.minMcap * 1e9,
    rsi: stock.last.rsi14 !== null && stock.last.rsi14 <= params.maxRsi,
    fundamentals: stock.fundamentalsScore === null || stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: closestToSma(50, true),
};

registerStrategy(elliots);
