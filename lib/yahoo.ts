import YahooFinance from "yahoo-finance2";
import { cacheRead, cacheWrite, isCacheFresh, ensureCacheDir } from "./cache";
import { Candle, ETFHolding } from "./types";
import fs from "fs";
import path from "path";

const yahooFinance = new YahooFinance({});
const CACHE_DIR = path.resolve(process.cwd(), ".cache");

const TTL = {
  HOLDINGS: 7 * 24 * 60 * 60 * 1000,
  FUNDAMENTALS: 24 * 60 * 60 * 1000,
};

ensureCacheDir(CACHE_DIR);

async function fetchSSGAHoldings(ticker: string): Promise<ETFHolding[]> {
  const key = `holdings/${ticker.toLowerCase()}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    return cacheRead(CACHE_DIR, key) as ETFHolding[];
  }

  const { default: fetch } = await import("node-fetch");
  const { default: XLSX } = await import("xlsx");
  const url = `https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-${ticker.toLowerCase()}.xlsx`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch SSGA holdings: ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(buffer));
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet).slice(3) as Record<string, string>[];

  let tickerKey = "";
  for (const k in jsonData[0]) {
    if (k.includes("Select Sector SPDR")) { tickerKey = k; break; }
  }

  const result: ETFHolding[] = jsonData
    .filter((row) => tickerKey in row && row[tickerKey] !== "-")
    .map((row) => ({
      name: row["Fund Name:"] || "",
      ticker: row[tickerKey].replace(".", "-"),
      weight: parseFloat(row["__EMPTY_2"]) || 0,
    }));

  cacheWrite(CACHE_DIR, key, result);
  return result;
}

async function fetchIsharesHoldings(ticker: string): Promise<ETFHolding[]> {
  const upper = ticker.toUpperCase();
  const key = `holdings/${upper}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    return cacheRead(CACHE_DIR, key) as ETFHolding[];
  }

  const { default: fetch } = await import("node-fetch");
  const { parse } = await import("csv-parse/sync");
  const csvUrl = `https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=${upper}_holdings&dataType=fund`;

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch iShares holdings: ${res.statusText}`);

  const text = await res.text();
  const csvData = text.split("\n \n")[1];
  const records = parse(csvData, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

  const result: ETFHolding[] = records
    .filter((r) => r["Ticker"] && r["Name"])
    .map((r) => ({
      ticker: r["Ticker"].trim(),
      name: r["Name"].trim(),
      weight: parseFloat(r["Weight (%)"]) || 0,
    }));

  cacheWrite(CACHE_DIR, key, result);
  return result;
}

const SSGA_TICKERS = ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"];

export async function fetchHoldings(ticker: string): Promise<ETFHolding[]> {
  if (SSGA_TICKERS.includes(ticker.toUpperCase())) {
    return fetchSSGAHoldings(ticker);
  }
  return fetchIsharesHoldings(ticker);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchHistory(symbol: string, days: number): Promise<Candle[]> {
  const symbolDir = `history/${symbol}`;
  ensureCacheDir(path.join(CACHE_DIR, symbolDir));

  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - Math.ceil((days * 2) / 30));

  const allDates: string[] = [];
  for (const d = new Date(past); d <= now; d.setDate(d.getDate() + 1)) {
    allDates.push(formatDate(new Date(d)));
  }

  let candles: Candle[] = [];
  let firstMissing = 0;
  for (; firstMissing < allDates.length; firstMissing++) {
    const cached = cacheRead(CACHE_DIR, `${symbolDir}/${allDates[firstMissing]}.json`);
    if (cached === null) break;
    if (typeof cached === "object" && cached !== null && "date" in cached) {
      candles.push(cached as Candle);
    }
  }

  const missingDates = allDates.slice(firstMissing);

  if (missingDates.length > 0) {
    const from = new Date(missingDates[0]);
    const missingSet = new Set(missingDates);

    const chartResult = await yahooFinance.chart(symbol, {
      period1: from,
      period2: now,
      interval: "1d",
    });

    if (chartResult?.quotes) {
      for (const quote of chartResult.quotes) {
        const candle: Candle = {
          date: quote.date.toISOString(),
          open: quote.open ?? 0,
          high: quote.high ?? 0,
          low: quote.low ?? 0,
          close: quote.close ?? 0,
          volume: quote.volume ?? 0,
        };
        const dateStr = candle.date.split("T")[0];
        missingSet.delete(dateStr);
        cacheWrite(CACHE_DIR, `${symbolDir}/${dateStr}.json`, candle);
        candles.push(candle);
      }
    }

    for (const missing of missingSet) {
      const filePath = path.join(CACHE_DIR, symbolDir, `${missing}.json`);
      if (!fs.existsSync(filePath)) {
        fs.closeSync(fs.openSync(filePath, "w"));
      }
    }
  }

  candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  candles = candles.filter((c, i) => i === 0 || c.date !== candles[i - 1].date);

  return candles;
}

export async function fetchFundamentals(symbol: string): Promise<Record<string, unknown> | null> {
  const key = `fundamentals/${symbol}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.FUNDAMENTALS)) {
    return cacheRead(CACHE_DIR, key) as Record<string, unknown>;
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["summaryDetail", "financialData", "price", "defaultKeyStatistics"],
    });
    cacheWrite(CACHE_DIR, key, summary);
    return summary as unknown as Record<string, unknown>;
  } catch (e) {
    console.error(`Failed to fetch fundamentals for ${symbol}:`, e);
    return null;
  }
}
