import type { Position, Order, SectorRisk } from "./types";
import { positionRisk } from "./position-risk";

export function sectorRisk(positions: Position[], orders: Order[]): SectorRisk[] {
  type Acc = {
    entry: number; current: number; cost: number; value: number; stop: number; count: number;
  };
  const bySector = new Map<string, Acc>();

  for (const position of positions) {
    const risk = positionRisk(position, orders);
    const existing = bySector.get(position.sector) ?? {
      entry: 0, current: 0, cost: 0, value: 0, stop: 0, count: 0,
    };
    existing.entry += risk.entryToStopRisk;
    existing.current += risk.currentToStopRisk;
    existing.cost += risk.costBasis;
    existing.value += risk.currentValue;
    existing.stop += risk.stopValue;
    existing.count += 1;
    bySector.set(position.sector, existing);
  }

  return Array.from(bySector.entries()).map(([sector, totals]) => ({
    sector,
    costBasis: totals.cost,
    currentValue: totals.value,
    stopValue: totals.stop,
    totalEntryToStop: totals.entry,
    totalCurrentToStop: totals.current,
    positionCount: totals.count,
  }));
}
