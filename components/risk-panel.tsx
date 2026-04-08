"use client";

import { Fragment, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk } from "@/lib/risk/portfolio-risk";
import { positionRisk } from "@/lib/risk/position-risk";
import { IbkrBanner } from "./ibkr-banner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function CostLine({ cost, stop, now }: { cost: number; stop: number; now: number }) {
  const risked = cost - stop;
  const riskedPct = cost > 0 ? risked / cost : 0;
  const stopColor = stop >= cost ? "text-green-500" : "text-red-500";
  const nowColor = now >= cost ? "text-green-500" : "text-red-500";
  return (
    <span className="tabular-nums">
      <span>{fmt(cost)}</span>
      <span className="text-muted-foreground"> (risked: </span>
      <span className="text-red-500">{fmt(risked)} / {pct(riskedPct)}</span>
      <span className="text-muted-foreground">) [</span>
      <span className={stopColor}>{fmt(stop)}</span>
      <span className="text-muted-foreground"> ↔ </span>
      <span className={nowColor}>{fmt(now)}</span>
      <span className="text-muted-foreground">]</span>
    </span>
  );
}

export function RiskPanel() {
  const { snapshot, loading, refresh } = useIbkr();
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openPositions, setOpenPositions] = useState<Set<string>>(new Set());

  const risk = useMemo(
    () => portfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0),
    [snapshot],
  );

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Risk</CardTitle>
        <Link href="/risk/simulate" className="text-sm underline">Simulate Trade</Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <IbkrBanner snapshot={snapshot} loading={loading} onRefresh={refresh} />

        {snapshot.connected && (
          <>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Net Liquidation: </span>
                <span className="font-medium tabular-nums">{fmt(risk.netLiquidation)}</span>
                <span className="text-muted-foreground"> (risked: </span>
                <span className="text-red-500 tabular-nums">
                  {fmt(risk.totalCostBasis - risk.totalStopValue)} / {pct(risk.totalRiskPercent)}
                </span>
                <span className="text-muted-foreground">)</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cost Basis: </span>
                <span className="font-medium">
                  <CostLine cost={risk.totalCostBasis} stop={risk.totalStopValue} now={risk.totalCurrentValue} />
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Sectors</h3>
              <div className="divide-y">
                {risk.sectors.map((s) => (
                  <div key={s.sector}>
                    <button
                      className="w-full flex justify-between gap-4 py-2 text-sm"
                      onClick={() => toggle(openSectors, s.sector, setOpenSectors)}
                    >
                      <span>{s.sector} ({s.positionCount})</span>
                      <CostLine cost={s.costBasis} stop={s.stopValue} now={s.currentValue} />
                    </button>
                    {openSectors.has(s.sector) && (
                      <div className="text-xs text-muted-foreground pb-2 pl-2">
                        Entry → Stop: {fmt(s.totalEntryToStop)} · Current → Stop: {fmt(s.totalCurrentToStop)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Positions</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left">Symbol</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">P&amp;L</th>
                    <th className="text-right">Cost [Stop ↔ Now]</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.positions.map((p) => {
                    const pr = positionRisk(p, snapshot.orders);
                    const pnl = (p.currentPrice - p.avgEntryPrice) * p.quantity;
                    const pnlPct = ((p.currentPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100;
                    const positionOrders = snapshot.orders.filter((o) => o.symbol === p.symbol);
                    const isOpen = openPositions.has(p.symbol);
                    return (
                      <Fragment key={p.symbol}>
                        <tr
                          className="border-t cursor-pointer"
                          onClick={() => toggle(openPositions, p.symbol, setOpenPositions)}
                        >
                          <td className="py-1">
                            {p.symbol}
                            {pr.unriskedQty > 0 && (
                              <span className="ml-1 text-yellow-500" title={`${pr.unriskedQty} shares unprotected`}>⚠</span>
                            )}
                          </td>
                          <td className="text-right tabular-nums">{p.quantity}</td>
                          <td className={`text-right tabular-nums ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {fmt(pnl)} ({pnlPct.toFixed(1)}%)
                          </td>
                          <td className="text-right">
                            <CostLine cost={pr.costBasis} stop={pr.stopValue} now={pr.currentValue} />
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/30">
                            <td colSpan={4} className="p-2 text-xs">
                              {positionOrders.length === 0 ? (
                                <span className="text-muted-foreground">No pending orders</span>
                              ) : (
                                <ul className="space-y-1">
                                  {positionOrders.map((o, i) => (
                                    <li key={i}>
                                      {o.side} {o.orderType} {o.quantity} @ {o.price} ({o.status})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
