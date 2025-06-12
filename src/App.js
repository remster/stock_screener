import { useEffect, useState, useRef } from "react";
import screen from "./Screener";
import PriceChart from "./PriceChart";

const sectors = [
  { symbol: "XLK", name: "Technology (XLK)" },
  /*{ symbol: "XLF", name: "Financials (XLF)" },
  { symbol: "XLV", name: "Health Care (XLV)" },
  { symbol: "XLE", name: "Energy (XLE)" },
  { symbol: "XLI", name: "Industrials (XLI)" },
  { symbol: "XLY", name: "Consumer Discretionary (XLY)" },
  { symbol: "XLP", name: "Consumer Staples (XLP)" },
  { symbol: "XLU", name: "Utilities (XLU)" },
  { symbol: "XLB", name: "Materials (XLB)" },
  { symbol: "XLRE", name: "Real Estate (XLRE)" },
  { symbol: "XLC", name: "Communication (XLC)" },
  { symbol: "IWM", name: "Russel 2000 Small Caps" },
  { symbol: "ITA", name: "Aerospace and Defence" },*/
];

const closestToSma = (days, normalize = true) => {
  const distance = (stock) => {
    let delta = stock.last.close - stock.last["sma" + days];
    if (normalize) {
      delta /= stock.last.close;
    }
    return delta;
  };
  return (a, b) => distance(a) - distance(b);
};

const SectorChartsDashboard = () => {
  const [globalTopStocks, setGlobalTopStocks] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchTopStocks = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      const stocks = await screen(sectors, {
        sort: closestToSma(50, true),
        filter: (stock) => ({
          rising:
            stock.last.close > stock.last.sma50 &&
            stock.last.sma50 > stock.last.sma100 &&
            stock.last.close > stock.last.resistance[0].level,
          mcap: true || stock.summaryDetail.marketCap > 1e9,
          volume:
            true || stock.last.volume >
            1.6 * stock.summaryDetail.averageVolume10days,
          pa: true || stock.summaryDetail.forwardPE < 35,
          rsi: true || stock.last.rsi14 < 72,
        }),
        progress: (to_go) => {
          setCountdown(to_go);
        },
      });
      setGlobalTopStocks(stocks.slice(0, 10));
    };

    fetchTopStocks();
  }, []);

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f2f2f2",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>
        SPDR Sector SMA Dashboard
      </h1>
      <div style={{ textAlign: "center", fontSize: 18, marginBottom: 10 }}>
        Countdown: {countdown}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Left: Global Top Stocks */}
        <div>
          <h2 style={{ marginBottom: 20 }}>Global Top Stocks</h2>
          {globalTopStocks.map((stock, index) => (
            <div
              key={stock.symbol}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: 8,
                    fontSize: 16,
                  }}
                >
                  [{stock.symbol}] {stock.name}
                </div>
                <div style={{ marginBottom: 8, fontSize: 12 }}>
                  <a
                    href={`https://finance.yahoo.com/chart/${stock.symbol}`}
                    target="_blank"
                  >
                    Yahoo
                  </a>{" "}
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=${stock.symbol}`}
                    target="_blank"
                  >
                    TradingView
                  </a>{" "}
                  <a
                    href={`https://www.tradevision.io/visualizer/?ticker=${stock.symbol}`}
                    target="_blank"
                  >
                    Tradevision
                  </a>{" "}
                  <a
                    href={`https://finviz.com/quote.ashx?t=${stock.symbol}&p=d`}
                    target="_blank"
                  >
                    Finviz
                  </a>
                </div>
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 70, fontWeight: "bold" }}>rsi14:</div>
                    <div>{stock.last.rsi14}</div>
                  </div>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 70, fontWeight: "bold" }}>
                      support:
                    </div>
                    <div>
                      {stock.last.support[0].level.toFixed(2)} /{" "}
                      {stock.last.support[0].tests[0].date.split("T")[0]}
                    </div>
                  </div>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 70, fontWeight: "bold" }}>
                      resistance:
                    </div>
                    <div>
                      {stock.last.resistance[0].level.toFixed(2)} /{" "}
                      {stock.last.resistance[0].tests[0].date.split("T")[0]}
                    </div>
                  </div>
                </div>
              </div>
              <PriceChart
                data={stock.candles}
                priceLines={[
                  {
                    price: stock.last.support[0].level,
                    title: "Support",
                    color: "green",
                  },
                  {
                    price: stock.last.resistance[0].level,
                    title: "Resistance",
                    color: "red",
                  },
                ]}
              />
            </div>
          ))}
        </div>

        {/* Right: Sector ETFs */}
        <div>
          <h2 style={{ marginBottom: 20 }}>Sector Charts</h2>
          {sectors.map(({ symbol, name }) => (
            <div
              key={symbol}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 16,
                marginBottom: 40,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 18,
                  marginBottom: 10,
                }}
              >
                {name}
              </div>
              {/* You’ll need to fetch chart data for each ETF */}
              {/* This assumes you already have `history` field */}
              {/* Replace with real data or load in useEffect */}
              <PriceChart data={[]} height={300} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectorChartsDashboard;
