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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div className="text-muted-foreground">Net Liquidation</div><div className="font-medium">{fmt(risk.netLiquidation)}</div></div>
              <div><div className="text-muted-foreground">Entry → Stop</div><div className="font-medium">{fmt(risk.totalEntryToStop)}</div></div>
              <div><div className="text-muted-foreground">Current → Stop</div><div className="font-medium">{fmt(risk.totalCurrentToStop)}</div></div>
              <div><div className="text-muted-foreground">Risk %</div><div className="font-medium">{(risk.totalRiskPercent * 100).toFixed(2)}%</div></div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Sectors</h3>
              <div className="divide-y">
                {risk.sectors.map((s) => (
                  <div key={s.sector}>
                    <button
                      className="w-full flex justify-between py-2 text-sm"
                      onClick={() => toggle(openSectors, s.sector, setOpenSectors)}
                    >
                      <span>{s.sector} ({s.positionCount})</span>
                      <span className="tabular-nums">{fmt(s.totalCurrentToStop)}</span>
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
                    <th className="text-right">Entry</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">P&amp;L</th>
                    <th className="text-right">E→S</th>
                    <th className="text-right">C→S</th>
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
                          <td className="text-right tabular-nums">{p.avgEntryPrice.toFixed(2)}</td>
                          <td className="text-right tabular-nums">{p.currentPrice.toFixed(2)}</td>
                          <td className={`text-right tabular-nums ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {fmt(pnl)} ({pnlPct.toFixed(1)}%)
                          </td>
                          <td className="text-right tabular-nums">{fmt(pr.entryToStopRisk)}</td>
                          <td className="text-right tabular-nums">{fmt(pr.currentToStopRisk)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/30">
                            <td colSpan={7} className="p-2 text-xs">
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
