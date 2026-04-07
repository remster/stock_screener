import type { Position, Order, SectorRisk } from "./types";
import { positionRisk } from "./position-risk";

export function sectorRisk(positions: Position[], orders: Order[]): SectorRisk[] {
  const bySector = new Map<string, { entry: number; current: number; count: number }>();

  for (const position of positions) {
    const risk = positionRisk(position, orders);
    const existing = bySector.get(position.sector) ?? { entry: 0, current: 0, count: 0 };
    existing.entry += risk.entryToStopRisk;
    existing.current += risk.currentToStopRisk;
    existing.count += 1;
    bySector.set(position.sector, existing);
  }

  return Array.from(bySector.entries()).map(([sector, totals]) => ({
    sector,
    totalEntryToStop: totals.entry,
    totalCurrentToStop: totals.current,
    positionCount: totals.count,
  }));
}
