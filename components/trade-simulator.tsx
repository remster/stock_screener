"use client";

import { useEffect, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk, simulatePortfolioRisk } from "@/lib/risk/portfolio-risk";
import type { SimulatedTrade } from "@/lib/risk/types";
import { PriceChart } from "@/components/price-chart";
import { supportResistance } from "@/lib/indicators/support-resistance";
import type { Candle, StockData } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

type Metric = { cost: number; stop: number; now: number } | null;

function MetricCell({ m }: { m: Metric }) {
  if (!m || m.cost === 0) return <span className="text-muted-foreground">—</span>;
  const risked = m.cost - m.stop;
  const riskedPct = m.cost > 0 ? risked / m.cost : 0;
  const stopColor = m.stop >= m.cost ? "text-green-500" : "text-red-500";
  const nowColor = m.now >= m.cost ? "text-green-500" : "text-red-500";
  return (
    <div className="text-xs tabular-nums space-y-0.5">
      <div><span className="text-muted-foreground">Cost: </span>{fmt(m.cost)}</div>
      <div><span className="text-muted-foreground">Risk: </span><span className="text-red-500">{fmt(risked)} / {pct(riskedPct)}</span></div>
      <div><span className="text-muted-foreground">Pessimistic: </span><span className={stopColor}>{fmt(m.stop)}</span></div>
      <div><span className="text-muted-foreground">Current: </span><span className={nowColor}>{fmt(m.now)}</span></div>
    </div>
  );
}

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
        if (candles?.length) {
          setChartData({ candles } as unknown as StockData);

          // Auto-fill defaults: entry = last close, stop = highest support below close.
          const lastClose = candles[candles.length - 1]?.close ?? 0;
          const sr = supportResistance(candles);
          const supportBelow = sr.supports
            .filter((s) => s.level < lastClose)
            .sort((a, b) => b.level - a.level)[0];
          const defaultStop = supportBelow?.level ?? 0;

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
        } else {
          setChartData(null);
        }
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

  const metricFromSector = (rs: typeof baseline.sectors, name: string): Metric => {
    const s = rs.find((x) => x.sector === name);
    return s ? { cost: s.costBasis, stop: s.stopValue, now: s.currentValue } : null;
  };
  const metricFromPosition = (rs: typeof baseline.positions, sym: string): Metric => {
    const pr = rs.find((x) => x.symbol === sym);
    return pr ? { cost: pr.costBasis, stop: pr.stopValue, now: pr.currentValue } : null;
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
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-1 pr-3"></th>
                  <th className="text-left py-1 px-3 font-normal">Risk</th>
                  <th className="text-left py-1 pl-3 font-normal">New Risk</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b align-top">
                  <td className="py-2 pr-3 font-bold">Portfolio</td>
                  <td className="py-2 px-3"><MetricCell m={portfolioBase} /></td>
                  <td className="py-2 pl-3"><MetricCell m={portfolioNew} /></td>
                </tr>
                {affectedSectors.length > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-3 pb-1 text-sm font-bold">Sectors</td>
                  </tr>
                )}
                {affectedSectors.map((sec) => (
                  <tr key={`sec-${sec}`} className="border-b align-top">
                    <td className="py-2 pr-3 font-bold">{sec}</td>
                    <td className="py-2 px-3"><MetricCell m={metricFromSector(baseline.sectors, sec)} /></td>
                    <td className="py-2 pl-3"><MetricCell m={metricFromSector(projected.sectors, sec)} /></td>
                  </tr>
                ))}
                {affectedSymbols.length > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-3 pb-1 text-sm font-bold">Positions</td>
                  </tr>
                )}
                {affectedSymbols.map((sym) => (
                  <tr key={`sym-${sym}`} className="border-b align-top">
                    <td className="py-2 pr-3 font-bold">{sym}</td>
                    <td className="py-2 px-3"><MetricCell m={metricFromPosition(baseline.positions, sym)} /></td>
                    <td className="py-2 pl-3"><MetricCell m={metricFromPosition(projected.positions, sym)} /></td>
                  </tr>
                ))}
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
