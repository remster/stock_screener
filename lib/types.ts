export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: string | number | undefined;
}

export interface SupportResistanceLevel {
  level: number;
  type: "support" | "resistance";
  strength: number;
  totalVolume: number;
  significance: number;
  tests: Array<Candle & { level: number; type: string }>;
}

export interface StockLast {
  close: number;
  volume: number;
  date: string;
  sma50: number | null;
  sma100: number | null;
  sma150: number | null;
  rsi14: number | null;
  support: SupportResistanceLevel[];
  resistance: SupportResistanceLevel[];
}

export interface StockData {
  symbol: string;
  name: string;
  candles: Candle[];
  last: StockLast;
  summaryDetail: {
    marketCap: number;
    forwardPE: number;
    trailingPE: number;
    priceToBook: number;
    pegRatio: number;
    dividendYield: number;
    averageVolume10days: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekHigh: number;
  };
  financialData: {
    profitMargins: number;
    returnOnEquity: number;
    revenueGrowth: number;
    earningsGrowth: number;
    debtToEquity: number;
    currentRatio: number;
  };
  defaultKeyStatistics: {
    pegRatio: number;
    forwardEps: number;
    trailingEps: number;
  };
  fundamentalsScore: number | null;
}

export interface ETFHolding {
  ticker: string;
  name: string;
  weight: number;
}
