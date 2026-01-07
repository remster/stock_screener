import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import XLSX from 'xlsx';
import cors from 'cors';
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({});
import { parse } from 'csv-parse/sync';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;
const CACHE_DIR = path.resolve('./.cache');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in ms

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// Helper to download file
async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.statusText}`);
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

async function fetchAndParseSSGAHoldings(ticker) {
  const url = `https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-${ticker.toLowerCase()}.xlsx`;
  const filePath = path.join(CACHE_DIR, `${ticker.toLowerCase()}.xlsx`);
  const jsonCachePath = path.join(CACHE_DIR, `${ticker.toLowerCase()}.json`);

  // Download XLSX if not cached or expired
  if (fs.existsSync(jsonCachePath)) {
    const stats = fs.statSync(jsonCachePath);
    if (Date.now() - stats.mtimeMs < CACHE_DURATION) {
      const cachedJson = fs.readFileSync(jsonCachePath, 'utf8');
      return JSON.parse(cachedJson);
    }
  }

  console.log("fetching "+url)
  await downloadFile(url, filePath);

  // Parse XLSX
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assume first sheet has data
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet).slice(3);
  let tickerKey;
  for (let key in jsonData[0]) {
      if (key.includes("Select Sector SPDR®")) {
          tickerKey = key;
          break;
      }
  }

  const result = jsonData.filter(
    (row) => tickerKey in row && row[tickerKey] !== "-"
  ).map(row => ({
      name: row["Fund Name:"],
      ticker: row[tickerKey].replace(".", "-"),
      weight: parseFloat(row["__EMPTY_2"]),
  }));

  // Cache parsed JSON
  fs.writeFileSync(jsonCachePath, JSON.stringify(result), 'utf8');

  return result;
}

async function fetchAndParseIsharesHoldings(ticker) {
  const lowerTicker = ticker.toUpperCase(); // iShares tickers are uppercase in URL
  const url = `https://www.ishares.com/us/products/etf-investments/${lowerTicker.toLowerCase()}?fileType=csv&fileName=${lowerTicker}_holdings&dataType=fund`;
  const csvUrl = `https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=${lowerTicker}_holdings&dataType=fund`;

  const filePath = path.join(CACHE_DIR, `${lowerTicker}.csv`);
  const jsonCachePath = path.join(CACHE_DIR, `${lowerTicker}.json`);

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

  if (fs.existsSync(jsonCachePath)) {
    const stats = fs.statSync(jsonCachePath);
    if (Date.now() - stats.mtimeMs < CACHE_DURATION) {
      const cachedJson = fs.readFileSync(jsonCachePath, "utf8");
      return JSON.parse(cachedJson);
    }
  }

  console.log(`Fetching iShares ETF data: ${csvUrl}`);
  await downloadFile(csvUrl, filePath);

  const csvData = fs.readFileSync(filePath, "utf8").split("\n \n")[1];
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });

  // Normalize relevant fields
  const normalized = records
    .filter(r => r["Ticker"] && r["Name"]) // Ensure valid rows
    .map(r => ({
      ticker: r["Ticker"].trim(),
      name: r["Name"].trim(),
      weight: parseFloat(r["Weight (%)"]) || 0
    }));

  fs.writeFileSync(jsonCachePath, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

app.get('/holdings/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    const SSGA_TICKERS = ['XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'];
    let data;
    if (SSGA_TICKERS.includes(ticker.toUpperCase())) {
      data = await fetchAndParseSSGAHoldings(ticker);
    } else {
      data = await fetchAndParseIsharesHoldings(ticker);
    }

    res.json(data);
  } catch (error) {
    console.error(`Error fetching holdings for ${ticker}:`, error);
    res.status(500).json({ error: 'Failed to fetch ETF holdings.', details: error.message });
  }
});

const formatDate = (date) => date.toISOString().slice(0, 10);

const getLastDates = (days) => {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - (days * 2/30.));

  const dates = [];
  for (let d = new Date(past); d <= now; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }
  return dates;
};

const ensureCacheDir = async () => {
  if (!fs.existsSync(CACHE_DIR)) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
};

app.get('/history/:symbol/:days', async (req, res) => {
  try {
    const { symbol, days } = req.params;
    await ensureCacheDir();
    const allDates = getLastDates(days);
    let candles = [];

    const missingDates = [];

    const cache_dir = path.join(CACHE_DIR, `${symbol}`)
    if (!fs.existsSync(cache_dir)) {
      fs.mkdirSync(cache_dir);
    }
    for (const date of allDates) {
      const cacheFile = path.join(cache_dir, `${date}.json`);
      if (fs.existsSync(cacheFile)) {
        const cached = fs.readFileSync(cacheFile, 'utf-8');
        if (cached.length) {
          candles.push(JSON.parse(cached));
        }
      } else {
        missingDates.push(date);
      }
    }

    if (missingDates.length > 0) {
      const from = new Date(missingDates[0]);
      const to = new Date();
      console.log(`Fetching missing range for ${symbol}: ${formatDate(from)} to ${formatDate(to)}`);

      // Use yahooFinance.chart instead of historical
      const chartResult = await yahooFinance.chart(symbol, {
        period1: from,
        period2: to,
        interval: '1d',
      });

      // chartResult contains .timestamp (array of UNIX seconds) and .indicators.quote[0] (object with arrays)
      if (chartResult && chartResult.timestamp && chartResult.indicators && chartResult.indicators.quote && chartResult.indicators.quote[0]) {
        const quote = chartResult.indicators.quote[0];
        for (let i = 0; i < chartResult.timestamp.length; i++) {
          const dateObj = new Date(chartResult.timestamp[i] * 1000);
          const date = formatDate(dateObj);
          const candle = {
            date: dateObj.toISOString(),
            open: quote.open ? quote.open[i] : null,
            high: quote.high ? quote.high[i] : null,
            low: quote.low ? quote.low[i] : null,
            close: quote.close ? quote.close[i] : null,
            volume: quote.volume ? quote.volume[i] : null
          };
          const cacheFile = path.join(cache_dir, `${date}.json`);
          // Cache if not already written
          if (!fs.existsSync(cacheFile)) {
            fs.writeFileSync(cacheFile, JSON.stringify(candle, null, 2), 'utf-8');
          }
          // Only add to candles if in our desired 6-month window
          if (allDates.includes(date)) {
            candles.push(candle);
          }
        }
      }
      //make sure to fill all the missing dates in the cache as there
      //is no data for Sundays and other holidays
      //Holes will provoke requery next time - the way we've designed it
      for (const missingDate of missingDates) {
        const cacheFile = path.join(cache_dir, `${missingDate}.json`);
        if (!fs.existsSync(cacheFile)) {
          fs.closeSync(fs.openSync(cacheFile, 'w'));
        }
      }
    }

    // Sort candles by date (in case file load order was out of order)
    candles.sort((a, b) => new Date(a.date) - new Date(b.date));
    // remove dupes
    candles = candles.filter((candle, i) => {
      return i == 0 || candle.date != candles[i-1].date
    });

    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'summaryDetail',
        'financialData',
        'price'
      ],
    });

    res.json({
      summary: summary,
      candles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch historical prices',
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`ETF holdings proxy server running on http://localhost:${PORT}`);
});

