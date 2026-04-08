export interface Position {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
}

export interface Order {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  origOrderType: string;
  quantity: number;
  price: number;
  status: string;
}

export interface IbkrSnapshot {
  connected: boolean;
  lastUpdated: string | null;
  positions: Position[];
  orders: Order[];
  netLiquidation: number | null;
}

export interface PositionRisk {
  symbol: string;
  costBasis: number;     // qty * avgEntry
  currentValue: number;  // qty * currentPrice
  stopValue: number;     // currentValue - currentToStopRisk (unprotected shares assumed at current)
  entryToStopRisk: number;
  currentToStopRisk: number;
  unriskedQty: number;
}

export interface SectorRisk {
  sector: string;
  costBasis: number;
  currentValue: number;
  stopValue: number;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  positionCount: number;
}

export interface PortfolioRisk {
  netLiquidation: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  totalStopValue: number;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  totalRiskPercent: number;          // E→S / net liquidation
  totalRiskPercentCostBasis: number; // E→S / cost basis (positions only)
  sectors: SectorRisk[];
  positions: PositionRisk[];
}

export interface SimulatedTrade {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopPrice: number;
}
