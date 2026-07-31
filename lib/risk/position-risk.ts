import type { Position, Order, PositionRisk } from "./types";

export function positionRisk(position: Position, orders: Order[]): PositionRisk {
  const matchingStops = orders.filter(
    (o) =>
      o.symbol === position.symbol &&
      o.side === "SELL" &&
      (o.origOrderType === "STP" || o.origOrderType === "STOP"),
  );

  let entryToStopRisk = 0;
  let currentToStopRisk = 0;
  let coveredQty = 0;
  let stopProceeds = 0;

  for (const stop of matchingStops) {
    entryToStopRisk += stop.quantity * (position.avgEntryPrice - stop.price);
    currentToStopRisk += stop.quantity * (position.currentPrice - stop.price);
    coveredQty += stop.quantity;
    stopProceeds += stop.quantity * stop.price;
  }

  const unriskedQty = Math.max(0, position.quantity - coveredQty);
  const costBasis = position.quantity * position.avgEntryPrice;
  const currentValue = position.quantity * position.currentPrice;
  // Unprotected shares are assumed worst case — zero proceeds if liquidated without a stop.
  const stopValue = stopProceeds;

  return {
    symbol: position.symbol,
    costBasis,
    currentValue,
    stopValue,
    entryToStopRisk,
    currentToStopRisk,
    unriskedQty,
  };
}
