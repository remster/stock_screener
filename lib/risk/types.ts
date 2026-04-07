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
  entryToStopRisk: number;
  currentToStopRisk: number;
  unriskedQty: number;
}

export interface SectorRisk {
  sector: string;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  positionCount: number;
}

export interface PortfolioRisk {
  netLiquidation: number;
  totalEntryToStop: number;
  totalCurrentToStop: number;
  totalRiskPercent: number;
  sectors: SectorRisk[];
  positions: PositionRisk[];
}

export interface SimulatedTrade {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopPrice: number;
}
