import type { Position, Order, PositionRisk } from "./types";

export function positionRisk(position: Position, orders: Order[]): PositionRisk {
  const matchingStops = orders.filter(
    (o) => o.symbol === position.symbol && o.side === "SELL" && o.origOrderType === "STP"
  );

  let entryToStopRisk = 0;
  let currentToStopRisk = 0;
  let coveredQty = 0;

  for (const stop of matchingStops) {
    entryToStopRisk += stop.quantity * (position.avgEntryPrice - stop.price);
    currentToStopRisk += stop.quantity * (position.currentPrice - stop.price);
    coveredQty += stop.quantity;
  }

  const unriskedQty = Math.max(0, position.quantity - coveredQty);

  return {
    symbol: position.symbol,
    entryToStopRisk,
    currentToStopRisk,
    unriskedQty,
  };
}
