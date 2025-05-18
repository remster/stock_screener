import { useEffect, useState, useMemo } from "react";

const FINNHUB_API_KEY = "d0kt3b9r01qn937mtoa0d0kt3b9r01qn937mtoag";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

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
        const holdingsUrl = `${FINNHUB_BASE_URL}/etf/holdings?symbol=${sectorSymbol}&token=${FINNHUB_API_KEY}`;
        const holdingsData = await fetchWithCache(holdingsUrl, cache);

        // Limit to first 50 holdings to avoid overload
        const symbols = holdingsData.holdings
          .map((h) => h.symbol)
          .slice(0, 50);

        // Step 2: For each symbol fetch quote, profile, SMA
        const stockData = await Promise.all(
          symbols.map(async (symbol) => {
            const quote = await fetchWithCache(
              `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
              cache
            );
            const profile = await fetchWithCache(
              `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
              cache
            );
            // Calculate timestamps for SMA query (~ last 100 days)
            const to = Math.floor(Date.now() / 1000);
            const from = to - 86400 * 100;

            // Finnhub SMA endpoint example:
            // (Note: Finnhub indicator endpoint requires paid plan; if not available fallback or remove)
            // So let's fetch daily candles & calculate SMA ourselves as a fallback
            const candles = await fetchWithCache(
              `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
              cache
            );

            let sma50 = null;
            if (candles && candles.c && candles.c.length >= 50) {
              // Simple 50-day SMA calc (last 50 closes average)
              const closes = candles.c.slice(-50);
              sma50 = closes.reduce((a, b) => a + b, 0) / closes.length;
            }

            const price = quote.c;

            return {
              symbol,
              name: profile.name || symbol,
              marketCap: profile.marketCapitalization || 0,
              price,
              sma50,
              isAboveSMA: price > sma50,
            };
          })
        );

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
