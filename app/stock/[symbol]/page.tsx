"use client";

import { use, useEffect, useState } from "react";
import { PriceChart } from "@/components/price-chart";
import { FundamentalsCard } from "@/components/fundamentals-card";
import { Card, CardContent } from "@/components/ui/card";
import { insertSma } from "@/lib/indicators/sma";
import { rsi } from "@/lib/indicators/rsi";
import { supportResistance } from "@/lib/indicators/support-resistance";
import type { StockData } from "@/lib/types";
import type { FundamentalsResult } from "@/lib/fundamentals/score";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const [stock, setStock] = useState<StockData | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/history/${symbol}?days=150`).then((r) => r.json()),
      fetch(`/api/fundamentals/${symbol}`).then((r) => r.json()),
    ])
      .then(([historyData, fundData]) => {
        const candles = historyData.candles ?? [];
        if (candles.length === 0) {
          setError("No candle data");
          return;
        }

        insertSma(candles, 50);
        insertSma(candles, 100);
        insertSma(candles, 150);
        const lastCandle = candles[candles.length - 1];
        const sr = supportResistance(candles.slice(-150));
        const rsiValue = rsi(candles, 14);

        setStock({
          symbol,
          name: fundData.raw?.price?.shortName ?? symbol,
          candles,
          last: {
            close: lastCandle?.close ?? 0,
            volume: lastCandle?.volume ?? 0,
            date: lastCandle?.date ?? "",
            sma50: (lastCandle?.sma50 as number) ?? null,
            sma100: (lastCandle?.sma100 as number) ?? null,
            sma150: (lastCandle?.sma150 as number) ?? null,
            rsi14: rsiValue,
            support: sr.supports,
            resistance: sr.resistances,
          },
          summaryDetail: fundData.raw?.summaryDetail ?? {},
          financialData: fundData.raw?.financialData ?? {},
          defaultKeyStatistics: fundData.raw?.defaultKeyStatistics ?? {},
          fundamentalsScore: fundData.score?.composite ?? null,
        } as StockData);
        setFundamentals(fundData.score ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="text-muted-foreground">Loading {symbol}...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!stock) return <div className="text-red-500">No data for {symbol}</div>;

  const sd = stock.summaryDetail;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{stock.name}</h1>
      <div className="text-sm text-muted-foreground mb-4">
        {symbol}
        {sd?.marketCap ? ` · MCap: $${(sd.marketCap / 1e9).toFixed(1)}B` : ""}
        {sd?.fiftyTwoWeekLow && sd?.fiftyTwoWeekHigh
          ? ` · 52w: $${sd.fiftyTwoWeekLow.toFixed(2)} - $${sd.fiftyTwoWeekHigh.toFixed(2)}`
          : ""}
      </div>

      <div className="flex gap-3 text-xs mb-4">
        <a href={`https://finance.yahoo.com/chart/${symbol}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Yahoo</a>
        <a href={`https://www.tradingview.com/chart/?symbol=${symbol}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">TradingView</a>
        <a href={`https://finviz.com/quote.ashx?t=${symbol}&p=d`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Finviz</a>
        <a href={`https://www.tradevision.io/visualizer/?ticker=${symbol}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Tradevision</a>
      </div>

      <Card className="mb-4">
        <CardContent>
          <PriceChart data={stock} />
        </CardContent>
      </Card>

      {fundamentals && <FundamentalsCard fundamentals={fundamentals} />}
    </div>
  );
}
