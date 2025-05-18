import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import XLSX from 'xlsx';

const app = express();
const PORT = process.env.PORT || 3000;
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

async function fetchAndParseHoldings(ticker) {
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

  await downloadFile(url, filePath);

  // Parse XLSX
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assume first sheet has data
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  // Cache parsed JSON
  fs.writeFileSync(jsonCachePath, JSON.stringify(jsonData), 'utf8');

  return jsonData;
}

app.get('/holdings/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    const data = await fetchAndParseHoldings(ticker);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching holdings for ${ticker}:`, error);
    res.status(500).json({ error: 'Failed to fetch ETF holdings.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ETF holdings proxy server running on http://localhost:${PORT}`);
});
