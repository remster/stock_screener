import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
import * as XLSX from "xlsx";
import { parse as csvParse } from "csv-parse/sync";
import { cacheRead, cacheWrite, isCacheFresh, ensureCacheDir } from "./cache";
import { Candle, ETFHolding } from "./types";
import fs from "fs";
import path from "path";
const CACHE_DIR = path.resolve(process.cwd(), ".cache");

const TTL = {
  HOLDINGS: 7 * 24 * 60 * 60 * 1000,
  FUNDAMENTALS: 24 * 60 * 60 * 1000,
};

ensureCacheDir(CACHE_DIR);

async function fetchSSGAHoldings(ticker: string): Promise<ETFHolding[]> {
  const key = `holdings/${ticker.toLowerCase()}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    const cached = cacheRead(CACHE_DIR, key) as ETFHolding[] | null;
    if (cached) return cached;
  }

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

const ISHARES_PRODUCTS: Record<string, { id: string; slug: string }> = {
  IWM: { id: "239710", slug: "ishares-russell-2000-etf" },
  ITA: { id: "239502", slug: "ishares-us-aerospace-defense-etf" },
};

async function fetchIsharesHoldings(ticker: string): Promise<ETFHolding[]> {
  const upper = ticker.toUpperCase();
  const key = `holdings/${upper}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.HOLDINGS)) {
    const cached = cacheRead(CACHE_DIR, key) as ETFHolding[] | null;
    if (cached) return cached;
  }

  const product = ISHARES_PRODUCTS[upper];
  if (!product) throw new Error(`No iShares product info configured for ticker: ${upper}`);

  const csvUrl = `https://www.ishares.com/us/products/${product.id}/${product.slug}/1467271812596.ajax?fileType=csv&fileName=${upper}_holdings&dataType=fund`;

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch iShares holdings for ${upper}: ${res.statusText}`);

  const text = await res.text();

  // Skip fund metadata header — find the line starting with "Ticker"
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) => /^"?Ticker"?,/.test(line));
  if (headerIdx === -1) throw new Error(`Could not find data header in iShares CSV for ${upper}`);

  const csvData = lines.slice(headerIdx).join("\n");
  const records = csvParse(csvData, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];

  const result: ETFHolding[] = records
    .filter((r) => r["Ticker"] && r["Name"] && r["Ticker"] !== "-")
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
  const key = `history/${symbol}_${days}d.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.FUNDAMENTALS)) {
    return cacheRead(CACHE_DIR, key) as Candle[];
  }

  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - Math.ceil((days * 2) / 30));

  const chartResult = await yahooFinance.chart(symbol, {
    period1: past,
    period2: now,
    interval: "1d",
  });

  let candles: Candle[] = [];
  if (chartResult?.quotes) {
    candles = chartResult.quotes.map((quote) => ({
      date: quote.date.toISOString(),
      open: quote.open ?? 0,
      high: quote.high ?? 0,
      low: quote.low ?? 0,
      close: quote.close ?? 0,
      volume: quote.volume ?? 0,
    }));
  }

  candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  candles = candles.filter((c, i) => i === 0 || c.date !== candles[i - 1].date);

  cacheWrite(CACHE_DIR, key, candles);
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
    console.warn(`Failed to fetch fundamentals for ${symbol}: ${(e as Error).message ?? e}`);
    return null;
  }
}

export async function fetchSector(symbol: string): Promise<string> {
  const key = `sector/${symbol}.json`;
  if (isCacheFresh(CACHE_DIR, key, TTL.FUNDAMENTALS)) {
    const cached = cacheRead(CACHE_DIR, key) as { sector: string };
    return cached.sector;
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    });
    const sector =
      (summary as { assetProfile?: { sector?: string } }).assetProfile?.sector ?? "Unknown";
    cacheWrite(CACHE_DIR, key, { sector });
    return sector;
  } catch (e) {
    console.warn(`Failed to fetch sector for ${symbol}: ${(e as Error).message ?? e}`);
    return "Unknown";
  }
}
