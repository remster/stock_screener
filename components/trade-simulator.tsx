"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk, simulatePortfolioRisk } from "@/lib/risk/portfolio-risk";
import type { SimulatedTrade } from "@/lib/risk/types";
import { PriceChart } from "@/components/price-chart";
import { supportResistance } from "@/lib/indicators/support-resistance";
import type { Candle, StockData } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  MetricCells,
  MetricHeader,
  fmtUsd as fmt,
  pct,
  type Metric,
} from "./risk-metrics";

export function TradeSimulator() {
  const { snapshot } = useIbkr();
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [chartData, setChartData] = useState<StockData | null>(null);

  const baseline = useMemo(
    () => portfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0),
    [snapshot],
  );

  const projected = useMemo(
    () => simulatePortfolioRisk(snapshot.positions, snapshot.orders, snapshot.netLiquidation ?? 0, trades),
    [snapshot, trades],
  );

  const focusedSymbol = focusedIdx !== null ? trades[focusedIdx]?.symbol : null;

  useEffect(() => {
    if (!focusedSymbol) {
      setChartData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/history/${focusedSymbol}?days=150`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const candles: Candle[] | undefined = data?.candles;
        if (!candles?.length) {
          setChartData(null);
          return;
        }
        const lastClose = candles[candles.length - 1]?.close ?? 0;
        const sr = supportResistance(candles);
        const supportBelow = sr.supports
          .filter((s) => s.level < lastClose)
          .sort((a, b) => b.level - a.level)[0];
        const defaultStop = supportBelow?.level ?? 0;

        setChartData({
          candles,
          last: { support: sr.supports, resistance: sr.resistances },
        } as unknown as StockData);

        setTrades((prev) =>
          prev.map((t) =>
            t.symbol === focusedSymbol
              ? {
                  ...t,
                  entryPrice: t.entryPrice || lastClose,
                  stopPrice: t.stopPrice || defaultStop,
                }
              : t,
          ),
        );
      })
      .catch(() => !cancelled && setChartData(null));
    return () => {
      cancelled = true;
    };
  }, [focusedSymbol]);

  const addTrade = () => {
    setTrades([...trades, { symbol: "", quantity: 0, entryPrice: 0, stopPrice: 0 }]);
    setFocusedIdx(trades.length);
  };

  const updateTrade = (i: number, patch: Partial<SimulatedTrade>) => {
    setTrades(trades.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const removeTrade = (i: number) => {
    setTrades(trades.filter((_, idx) => idx !== i));
    if (focusedIdx === i) setFocusedIdx(null);
    else if (focusedIdx !== null && i < focusedIdx) setFocusedIdx(focusedIdx - 1);
  };

  // Collect unique affected symbols and their sectors.
  const affectedSymbols = Array.from(
    new Set(trades.map((t) => t.symbol).filter((s) => s)),
  );
  const affectedSectors = Array.from(
    new Set(
      affectedSymbols.map(
        (sym) => snapshot.positions.find((p) => p.symbol === sym)?.sector ?? "Unknown",
      ),
    ),
  );

  const sectorMetric = (rs: typeof baseline.sectors, name: string): Metric => {
    const s = rs.find((x) => x.sector === name);
    return s ? { cost: s.costBasis, stop: s.stopValue, now: s.currentValue } : { cost: 0, stop: 0, now: 0 };
  };
  const positionMetric = (rs: typeof baseline.positions, sym: string): Metric => {
    const pr = rs.find((x) => x.symbol === sym);
    return pr ? { cost: pr.costBasis, stop: pr.stopValue, now: pr.currentValue } : { cost: 0, stop: 0, now: 0 };
  };

  const portfolioBase: Metric = {
    cost: baseline.totalCostBasis,
    stop: baseline.totalStopValue,
    now: baseline.totalCurrentValue,
  };
  const portfolioNew: Metric = {
    cost: projected.totalCostBasis,
    stop: projected.totalStopValue,
    now: projected.totalCurrentValue,
  };

  const renderPair = (
    label: React.ReactNode,
    before: Metric,
    after: Metric,
    key: string,
  ) => (
    <Fragment key={key}>
      <tr className="align-top">
        <td className="py-1 pr-3 font-bold">
          {label} <span className="text-xs font-normal text-muted-foreground">(current)</span>
        </td>
        <MetricCells m={before} />
      </tr>
      <tr className="border-b align-top">
        <td className="py-1 pr-3 pl-4 text-xs text-muted-foreground">(new)</td>
        <MetricCells m={after} />
      </tr>
    </Fragment>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Simulated Trades</CardTitle>
            <button onClick={addTrade} className="text-sm underline">+ Add Trade</button>
          </CardHeader>
          <CardContent className="space-y-2">
            {trades.length === 0 && (
              <p className="text-sm text-muted-foreground">No simulated trades. Click &quot;Add Trade&quot; to start.</p>
            )}
            {trades.map((t, i) => (
              <div
                key={i}
                className={`grid grid-cols-5 gap-2 items-center p-2 rounded ${focusedIdx === i ? "bg-muted" : ""}`}
                onClick={() => setFocusedIdx(i)}
              >
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="SYMBOL"
                  value={t.symbol}
                  onChange={(e) => updateTrade(i, { symbol: e.target.value.toUpperCase() })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Qty"
                  type="number"
                  value={t.quantity || ""}
                  onChange={(e) => updateTrade(i, { quantity: parseFloat(e.target.value) || 0 })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Entry"
                  type="number"
                  value={t.entryPrice || ""}
                  onChange={(e) => updateTrade(i, { entryPrice: parseFloat(e.target.value) || 0 })}
                />
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Stop"
                  type="number"
                  value={t.stopPrice || ""}
                  onChange={(e) => updateTrade(i, { stopPrice: parseFloat(e.target.value) || 0 })}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeTrade(i); }}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk Comparison</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Net Liquidation Value:{" "}
              <span className="font-bold tabular-nums">{fmt(baseline.netLiquidation)}</span>{" "}
              <span className="text-muted-foreground">
                (risked <span className="font-bold">{pct(baseline.totalRiskPercent)}</span>
                {" → "}
                <span className="font-bold">{pct(projected.totalRiskPercent)}</span>)
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <MetricHeader />
              </thead>
              <tbody>
                {renderPair("Portfolio", portfolioBase, portfolioNew, "portfolio")}
                {affectedSectors.length > 0 && (
                  <tr>
                    <td colSpan={5} className="pt-3 pb-1 text-sm font-bold">Sectors</td>
                  </tr>
                )}
                {affectedSectors.map((sec) =>
                  renderPair(
                    sec,
                    sectorMetric(baseline.sectors, sec),
                    sectorMetric(projected.sectors, sec),
                    `sec-${sec}`,
                  ),
                )}
                {affectedSymbols.length > 0 && (
                  <tr>
                    <td colSpan={5} className="pt-3 pb-1 text-sm font-bold">Positions</td>
                  </tr>
                )}
                {affectedSymbols.map((sym) =>
                  renderPair(
                    sym,
                    positionMetric(baseline.positions, sym),
                    positionMetric(projected.positions, sym),
                    `sym-${sym}`,
                  ),
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{focusedSymbol ?? "Select a trade"}</CardTitle></CardHeader>
        <CardContent>
          {chartData ? (
            <PriceChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
