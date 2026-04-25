import { NextRequest } from "next/server";
import { getStrategy } from "@/lib/strategies/index";
import { fetchHoldings, fetchHistory, fetchFundamentals } from "@/lib/yahoo";
import { insertSma } from "@/lib/indicators/sma";
import { rsi } from "@/lib/indicators/rsi";
import { supportResistance } from "@/lib/indicators/support-resistance";
import { computeFundamentalsScore } from "@/lib/fundamentals/score";
import { StockData } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, params: userParams, sectors } = body as {
    slug: string;
    params: Record<string, number>;
    sectors?: string[];
  };

  const strategy = getStrategy(slug);
  if (!strategy) {
    return new Response(JSON.stringify({ error: "Strategy not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeSectors = sectors ?? strategy.sectors;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const symbolSet = new Set<string>();
        for (const sector of activeSectors) {
          try {
            const holdings = await fetchHoldings(sector);
            for (const h of holdings) symbolSet.add(h.ticker);
          } catch (e) {
            console.error(`Holdings fetch failed for ${sector}:`, e);
            send("error", { sector, message: `Failed to fetch holdings: ${e}` });
          }
        }
        const allSymbols = Array.from(symbolSet);

        const total = allSymbols.length;
        let scanned = 0;
        let matches = 0;
        let skipped = 0;
        const filterBreakdown: Record<string, number> = {};

        for (const symbol of allSymbols) {
          scanned++;
          try {
            const [candles, fundData] = await Promise.all([
              fetchHistory(symbol, 150),
              fetchFundamentals(symbol),
            ]);

            if (candles.length === 0) { skipped++; continue; }

            // Strip current-day candle if market is open
            const last = candles[candles.length - 1];
            const prev = candles.length > 1 ? candles[candles.length - 2] : null;
            if (prev && last.date.split("T")[1] !== prev.date.split("T")[1]) {
              candles.pop();
            }

            insertSma(candles, 50);
            insertSma(candles, 100);
            insertSma(candles, 150);

            const lastCandle = candles[candles.length - 1];
            const sr = supportResistance(candles.slice(-150));
            const rsiValue = rsi(candles, 14);
            const fundScore = fundData ? computeFundamentalsScore(fundData) : null;

            const stock: StockData = {
              symbol,
              name: (fundData as Record<string, Record<string, string>>)?.price?.shortName ?? symbol,
              candles,
              last: {
                close: lastCandle.close,
                volume: lastCandle.volume,
                date: lastCandle.date,
                sma50: (lastCandle.sma50 as number) ?? null,
                sma100: (lastCandle.sma100 as number) ?? null,
                sma150: (lastCandle.sma150 as number) ?? null,
                rsi14: rsiValue,
                support: sr.supports,
                resistance: sr.resistances,
              },
              summaryDetail: (fundData as Record<string, unknown>)?.summaryDetail as StockData["summaryDetail"],
              financialData: (fundData as Record<string, unknown>)?.financialData as StockData["financialData"],
              defaultKeyStatistics: (fundData as Record<string, unknown>)?.defaultKeyStatistics as StockData["defaultKeyStatistics"],
              fundamentalsScore: fundScore?.composite ?? null,
            };

            const filterResult = strategy.filter(stock, userParams);
            let allPassed = true;
            for (const [key, passed] of Object.entries(filterResult)) {
              if (!(key in filterBreakdown)) filterBreakdown[key] = 0;
              if (passed) filterBreakdown[key]++;
              else allPassed = false;
            }

            if (allPassed) {
              matches++;
              send("result", {
                symbol: stock.symbol, name: stock.name, close: stock.last.close,
                rsi14: stock.last.rsi14, fundamentalsScore: stock.fundamentalsScore, filterResult,
              });
            }
          } catch (e) {
            skipped++;
            console.warn(`Skipped ${symbol}: ${(e as Error).message ?? e}`);
          }
          send("progress", { scanned, total, matches, skipped });
        }

        send("done", { scanned, total, matches, skipped, filterBreakdown });
      } catch (e) {
        send("error", { message: `Screen failed: ${e}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
