import { Strategy } from "./types";
import { registerStrategy } from "./registry";
import { StockData } from "@/lib/types";
import { smaSlope } from "@/lib/indicators/slope";
import { breaksResistance } from "@/lib/indicators/support-resistance";
import { ALL_SECTOR_SYMBOLS } from "@/lib/sectors";

export const sectorBreakout: Strategy = {
  slug: "sector-breakout",
  name: "Sector Breakout",
  description: "Find top performers in sectors where the sector ETF's 50SMA is rising, volume is up, and individual stocks are breaking resistance",
  sectors: ALL_SECTOR_SYMBOLS,
  params: [
    { key: "smaWindow", label: "SMA Period", default: 50, min: 20, max: 200 },
    { key: "minSlopeAngle", label: "Min SMA Slope (degrees)", default: 5, min: 0, max: 45 },
    { key: "volumeMultiplier", label: "Volume vs Avg Multiplier", default: 1.2, min: 1.0, step: 0.1, max: 5.0 },
    { key: "minFundamentalsScore", label: "Min Fundamentals Score", default: 0, min: 0, max: 10, step: 0.5 },
  ],
  filter: (stock: StockData, params: Record<string, number>) => ({
    smaRising: smaSlope(stock.candles, params.smaWindow) > params.minSlopeAngle,
    volumeUp: stock.last.volume > params.volumeMultiplier * stock.summaryDetail.averageVolume10days,
    resistanceBreak: breaksResistance(stock.candles),
    mrsiPositive: stock.last.rsi14 !== null && stock.last.rsi14 > 50,
    fundamentals: stock.fundamentalsScore === null || stock.fundamentalsScore >= params.minFundamentalsScore,
  }),
  sort: (a: StockData, b: StockData) => smaSlope(b.candles, 50) - smaSlope(a.candles, 50),
};

registerStrategy(sectorBreakout);
