import { useEffect, useState, useMemo } from "react";

const FINNHUB_API_KEY = "d0kt3b9r01qn937mtoa0d0kt3b9r01qn937mtoag";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

const fetchHoldings = async (etfSymbol) => {
    try {
        const response = await fetch(`http://localhost:3001/holdings/${etfSymbol}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch holdings: ${response.status} ${response.statusText}`);
        }
        const json = await response.json();
        const dataRows = json.slice(3);

        const holdings = dataRows.map(row => ({
            name: row["Fund Name:"],
            ticker: row["The Technology Select Sector SPDR® Fund"],
            cusip: row["__EMPTY"],
            sedol: row["__EMPTY_1"],
            weight: parseFloat(row["__EMPTY_2"]),
            sector: row["__EMPTY_3"],
            sharesHeld: parseInt(row["__EMPTY_4"], 10),
            currency: row["__EMPTY_5"]
        }));
        return holdings;
    } catch (error) {
        console.error("Error fetching holdings:", error);
        throw error;
    }
}

const fetchWithCache = async (url, cache) => {
  if (cache[url]) return cache[url];
  const response = await fetch(url);
  if (!response.ok) throw new Error("API Error: " + url);
  const data = await response.json();
  cache[url] = data;
  return data;
};

const useTopStocksAboveSMA = (sectorSymbol = "XLK") => {
  const [topStocks, setTopStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cache = useMemo(() => ({}), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Step 1: Get holdings of the sector ETF
        const holdings = await fetchHoldings(sectorSymbol);

        // Limit to first 50 holdings to avoid overload
        const tickers = holdings
          .map((h) => h.ticker)
          .slice(0, 1);

        // Step 2: For each ticker fetch quote, profile, SMA
        const stockData = tickers.map(async (ticker) => {
            const quote = await fetchWithCache(
                `${FINNHUB_BASE_URL}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`,
                cache
            );
            const profile = await fetchWithCache(
                `${FINNHUB_BASE_URL}/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`,
                cache
            );
            let history = await fetch(`http://localhost:3001/history/MSFT`);
            history = await history.json();
            // Calculate timestamps for SMA query (~ last 100 days)
            const to = Math.floor(Date.now() / 1000);
            const from = to - 86400 * 100;

            let sma50 = null;
            /*if (candles && candles.c && candles.c.length >= 50) {
                // Simple 50-day SMA calc (last 50 closes average)
                const closes = candles.c.slice(-50);
                sma50 = closes.reduce((a, b) => a + b, 0) / closes.length;
            }*/

            const price = quote.c;

            return {
                ticker,
                name: profile.name || ticker,
                marketCap: profile.marketCapitalization || 0,
                price,
                sma50,
                isAboveSMA: price > sma50,
            };
        });

        // Step 3: Filter, sort, slice top 5
        const filtered = stockData
          .filter((s) => s.sma50 && s.isAboveSMA)
          .sort((a, b) => b.marketCap - a.marketCap)
          .slice(0, 5);

        setTopStocks(filtered);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch stock data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectorSymbol, cache]);

  return { topStocks, loading, error };
};

export default useTopStocksAboveSMA;
