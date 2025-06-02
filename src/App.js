import { useEffect, useState, useRef } from "react";
import screen from "./Screener";

const sectors = [
  { symbol: "XLK", name: "Technology (XLK)" },
  { symbol: "XLF", name: "Financials (XLF)" },
  { symbol: "XLV", name: "Health Care (XLV)" },
  { symbol: "XLE", name: "Energy (XLE)" },
  { symbol: "XLI", name: "Industrials (XLI)" },
  { symbol: "XLY", name: "Consumer Discretionary (XLY)" },
  { symbol: "XLP", name: "Consumer Staples (XLP)" },
  { symbol: "XLU", name: "Utilities (XLU)" },
  { symbol: "XLB", name: "Materials (XLB)" },
  { symbol: "XLRE", name: "Real Estate (XLRE)" },
  { symbol: "XLC", name: "Communication (XLC)" },
];

const SectorChartsDashboard = () => {
  const [globalTopStocks, setGlobalTopStocks] = useState([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchTopStocks = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      const stocks = await screen(sectors);
      setGlobalTopStocks(stocks.slice(0,5));
    };
    fetchTopStocks();
  }, []);

  // Load TradingView script if needed
  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Render widgets when TradingView and stock data are ready
  useEffect(() => {
    if (!window.TradingView || globalTopStocks.length === 0) return;

    globalTopStocks.forEach((stock, index) => {
      const containerId = `global_stock_chart_${index}`;
      const el = document.getElementById(containerId);
      if (el) {
        new window.TradingView.widget({
          container_id: containerId,
          autosize: true,
          symbol: `NASDAQ:${stock.symbol}`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          toolbar_bg: "#f1f3f6",
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          studies: [{ id: "MASimple@tv-basicstudies", inputs: { length: 50 } }],
          withdateranges: true,
          details: false,
          hideideas: true,
        });
      }
    });

    sectors.forEach(({ symbol }, index) => {
      const containerId = `sector_chart_${index}`;
      const el = document.getElementById(containerId);
      if (el) {
        new window.TradingView.widget({
          container_id: containerId,
          autosize: true,
          symbol: `AMEX:${symbol}`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          toolbar_bg: "#f1f3f6",
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          studies: [
            { id: "MASimple@tv-basicstudies", inputs: { length: 50 } },
            { id: "MASimple@tv-basicstudies", inputs: { length: 150 } },
          ],
          withdateranges: true,
          details: false,
          hideideas: true,
        });
      }
    });
  }, [globalTopStocks]);

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f2f2f2"
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>SPDR Sector SMA Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20
        }}
      >
        {/* Left Column: Global Top Stock Charts */}
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 8, fontSize: 16 }}>{stock.name}</div>
              <div id={`global_stock_chart_${index}`} style={{ height: 400 }}></div>
            </div>
          ))}
        </div>

        {/* Right Column: Sector Charts */}
        <div>
          <h2 style={{ marginBottom: 20 }}>Sector Charts</h2>
          {sectors.map(({ symbol, name }, index) => (
            <div
              key={symbol}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 16,
                marginBottom: 40,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>{name}</div>
              <div id={`sector_chart_${index}`} style={{ height: 600 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectorChartsDashboard;
