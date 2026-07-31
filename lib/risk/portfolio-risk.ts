import type {
  Position, Order, PortfolioRisk, SimulatedTrade,
} from "./types";
import { positionRisk } from "./position-risk";
import { sectorRisk } from "./sector-risk";

export function portfolioRisk(
  positions: Position[],
  orders: Order[],
  netLiquidation: number,
): PortfolioRisk {
  const positionRisks = positions.map((p) => positionRisk(p, orders));
  const sectors = sectorRisk(positions, orders);

  const totalEntryToStop = positionRisks.reduce((sum, r) => sum + r.entryToStopRisk, 0);
  const totalCurrentToStop = positionRisks.reduce((sum, r) => sum + r.currentToStopRisk, 0);
  const totalCostBasis = positionRisks.reduce((sum, r) => sum + r.costBasis, 0);
  const totalCurrentValue = positionRisks.reduce((sum, r) => sum + r.currentValue, 0);
  const totalStopValue = positionRisks.reduce((sum, r) => sum + r.stopValue, 0);
  // Downside from cost: realized loss on covered shares (E→S) plus unrealized loss on
  // unprotected shares held at current. Equivalent to (totalCostBasis − totalStopValue).
  const totalDownside = totalCostBasis - totalStopValue;
  const totalRiskPercent = netLiquidation > 0 ? totalDownside / netLiquidation : 0;
  const totalRiskPercentCostBasis = totalCostBasis > 0 ? totalDownside / totalCostBasis : 0;

  return {
    netLiquidation,
    totalCostBasis,
    totalCurrentValue,
    totalStopValue,
    totalEntryToStop,
    totalCurrentToStop,
    totalRiskPercent,
    totalRiskPercentCostBasis,
    sectors,
    positions: positionRisks,
  };
}

export function simulatePortfolioRisk(
  positions: Position[],
  orders: Order[],
  netLiquidation: number,
  trades: SimulatedTrade[],
): PortfolioRisk {
  const knownSectors = new Map(positions.map((p) => [p.symbol, p.sector]));

  const simPositions: Position[] = trades.map((t) => ({
    symbol: t.symbol,
    name: t.symbol,
    sector: knownSectors.get(t.symbol) ?? "Unknown",
    quantity: t.quantity,
    avgEntryPrice: t.entryPrice,
    currentPrice: t.entryPrice,
  }));

  const simOrders: Order[] = trades.map((t) => ({
    symbol: t.symbol,
    side: "SELL",
    orderType: "Stop",
    origOrderType: "STP",
    quantity: t.quantity,
    price: t.stopPrice,
    status: "Simulated",
  }));

  return portfolioRisk(
    [...positions, ...simPositions],
    [...orders, ...simOrders],
    netLiquidation,
  );
}
