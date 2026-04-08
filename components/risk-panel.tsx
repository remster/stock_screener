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

function MetricRow({
  label,
  cost,
  stop,
  now,
  labelClass = "",
}: {
  label: React.ReactNode;
  cost: number;
  stop: number;
  now: number;
  labelClass?: string;
}) {
  const risked = cost - stop;
  const riskedPct = cost > 0 ? risked / cost : 0;
  const stopColor = stop >= cost ? "text-green-500" : "text-red-500";
  const nowColor = now >= cost ? "text-green-500" : "text-red-500";
  return (
    <>
      <td className={`py-1 pr-3 ${labelClass}`}>{label}</td>
      <td className="py-1 px-3 text-right tabular-nums">{fmt(cost)}</td>
      <td className="py-1 px-3 text-right tabular-nums text-red-500">
        {fmt(risked)} / {pct(riskedPct)}
      </td>
      <td className={`py-1 px-3 text-right tabular-nums ${stopColor}`}>{fmt(stop)}</td>
      <td className={`py-1 pl-3 text-right tabular-nums ${nowColor}`}>{fmt(now)}</td>
    </>
  );
}

function MetricHeader() {
  return (
    <tr className="text-xs text-muted-foreground border-b">
      <th className="text-left py-1 pr-3"></th>
      <th className="text-right py-1 px-3 font-normal">Cost Basis</th>
      <th className="text-right py-1 px-3 font-normal">Risk</th>
      <th className="text-right py-1 px-3 font-normal">Pessimistic</th>
      <th className="text-right py-1 pl-3 font-normal">Current</th>
    </tr>
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
            <div className="text-sm">
              Net Liquidation Value: <span className="font-bold tabular-nums">{fmt(risk.netLiquidation)}</span>{" "}
              <span className="text-muted-foreground">(risked <span className="font-bold">{pct(risk.totalRiskPercent)}</span>)</span>
            </div>
            <table className="w-full text-sm">
            <thead>
              <MetricHeader />
            </thead>

            {/* Portfolio */}
            <tbody>
              <tr className="font-semibold border-b">
                <MetricRow
                  label="Portfolio"
                  cost={risk.totalCostBasis}
                  stop={risk.totalStopValue}
                  now={risk.totalCurrentValue}
                />
              </tr>
            </tbody>

            {/* Sectors */}
            <tbody>
              <tr>
                <td colSpan={5} className="pt-3 pb-1 text-sm font-bold">Sectors</td>
              </tr>
              {risk.sectors.map((s) => {
                const isOpen = openSectors.has(s.sector);
                return (
                  <Fragment key={s.sector}>
                    <tr
                      className="border-t cursor-pointer"
                      onClick={() => toggle(openSectors, s.sector, setOpenSectors)}
                    >
                      <MetricRow
                        label={`${s.sector} (${s.positionCount})`}
                        cost={s.costBasis}
                        stop={s.stopValue}
                        now={s.currentValue}
                      />
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="p-2 text-xs text-muted-foreground">
                          Entry → Stop: {fmt(s.totalEntryToStop)} · Current → Stop: {fmt(s.totalCurrentToStop)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>

            {/* Positions */}
            <tbody>
              <tr>
                <td colSpan={5} className="pt-3 pb-1 text-sm font-bold">Positions</td>
              </tr>
              {snapshot.positions.map((p) => {
                const pr = positionRisk(p, snapshot.orders);
                const positionOrders = snapshot.orders.filter((o) => o.symbol === p.symbol);
                const isOpen = openPositions.has(p.symbol);
                return (
                  <Fragment key={p.symbol}>
                    <tr
                      className="border-t cursor-pointer"
                      onClick={() => toggle(openPositions, p.symbol, setOpenPositions)}
                    >
                      <MetricRow
                        label={
                          <>
                            {p.symbol}
                            {pr.unriskedQty > 0 && (
                              <span
                                className="ml-1 text-yellow-500"
                                title={`${pr.unriskedQty} shares unprotected`}
                              >
                                ⚠
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-2">×{p.quantity}</span>
                          </>
                        }
                        cost={pr.costBasis}
                        stop={pr.stopValue}
                        now={pr.currentValue}
                      />
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="p-2 text-xs">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
