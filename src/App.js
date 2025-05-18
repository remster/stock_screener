import { useEffect, useState } from "react";
import screenSector from "./SectorScreener";

const sectors = [
  { symbol: "AMEX:XLK", name: "Technology (XLK)" },
  { symbol: "AMEX:XLF", name: "Financials (XLF)" },
  { symbol: "AMEX:XLV", name: "Health Care (XLV)" },
  { symbol: "AMEX:XLE", name: "Energy (XLE)" },
  { symbol: "AMEX:XLI", name: "Industrials (XLI)" },
  { symbol: "AMEX:XLY", name: "Consumer Discretionary (XLY)" },
  { symbol: "AMEX:XLP", name: "Consumer Staples (XLP)" },
  { symbol: "AMEX:XLU", name: "Utilities (XLU)" },
  { symbol: "AMEX:XLB", name: "Materials (XLB)" },
  { symbol: "AMEX:XLRE", name: "Real Estate (XLRE)" },
  { symbol: "AMEX:XLC", name: "Communication (XLC)" },
];

const SectorChartsDashboard = () => {
  const [topStocks, setTopStocks] = useState([]);

  // Step 1: Fetch stock data and update state
  useEffect(() => {
    const fetchTopStocks = async () => {
      try {
        let result = await screenSector("XLK");
        setTopStocks(result.slice(0, 5) || []);
      } catch (error) {
        console.error("Error loading top stocks:", error);
      }
    };

    fetchTopStocks();
  }, []);

  // Step 2: When topStocks state updates, initialize widgets
  useEffect(() => {
    if (!topStocks.length || !window.TradingView) return;

    topStocks.forEach((stock, index) => {
      const containerId = `top_stock_chart_${index}`;
      const container = document.getElementById(containerId);
      if (!container) return; // Wait for DOM to render

      new window.TradingView.widget({
        container_id: containerId,
        autosize: true,
        symbol: stock.ticker,
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
        ],
        withdateranges: true,
        details: false,
        hideideas: true
      });
    });
  }, [topStocks]);

  useEffect(() => {
    const loadWidgets = () => {
      sectors.forEach(({ symbol }, index) => {
        new window.TradingView.widget({
          container_id: `tv_chart_${index}`,
          autosize: true,
          symbol,
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
      });
    };

    if (window.TradingView) {
      loadWidgets();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = loadWidgets;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", backgroundColor: "#f2f2f2" }}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>SPDR Sector Charts Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
          gap: 20,
        }}
      >
        {sectors.map(({ name }, index) => (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: 8,
              padding: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 8, fontSize: 18 }}>
              {name}
            </div>
            <div id={`tv_chart_${index}`} style={{ height: 400 }}></div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 60 }}>
        <h2 style={{ textAlign: "center" }}>Top 5 Stocks Above 50-Day SMA</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
          {topStocks.map(({ name }, index) => (
            <div
              key={index}
              style={{
                background: "white",
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: 8, fontSize: 18 }}>
                {name}
              </div>
              <div id={`top_stock_chart_${index}`} style={{ height: 400 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectorChartsDashboard;
