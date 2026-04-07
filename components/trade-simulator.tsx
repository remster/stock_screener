"use client";

import { useEffect, useMemo, useState } from "react";
import { useIbkr } from "@/lib/hooks/use-ibkr";
import { portfolioRisk, simulatePortfolioRisk } from "@/lib/risk/portfolio-risk";
import type { SimulatedTrade } from "@/lib/risk/types";
import { PriceChart } from "@/components/price-chart";
import type { StockData } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function delta(before: number, after: number): string {
  const d = after - before;
  const sign = d >= 0 ? "+" : "";
  return `${fmt(before)} → ${fmt(after)} (${sign}${fmt(d)})`;
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
        if (data?.candles?.length) {
          setChartData({ candles: data.candles } as unknown as StockData);
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
  };

  const sectorMap = (rs: typeof projected.sectors) =>
    new Map(rs.map((s) => [s.sector, s.totalCurrentToStop]));
  const baseSectors = sectorMap(baseline.sectors);
  const projSectors = sectorMap(projected.sectors);
  const allSectors = new Set([...baseSectors.keys(), ...projSectors.keys()]);

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
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Total Current → Stop</div>
              <div className="font-medium">{delta(baseline.totalCurrentToStop, projected.totalCurrentToStop)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Risk %</div>
              <div className="font-medium">
                {(baseline.totalRiskPercent * 100).toFixed(2)}% → {(projected.totalRiskPercent * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Sectors</div>
              <ul className="space-y-1">
                {Array.from(allSectors).map((sec) => (
                  <li key={sec} className="flex justify-between">
                    <span>{sec}</span>
                    <span className="tabular-nums">
                      {delta(baseSectors.get(sec) ?? 0, projSectors.get(sec) ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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
