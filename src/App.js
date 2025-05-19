import { useEffect, useState, useRef } from "react";
import screenSector from "./SectorScreener";

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
  const [sectorTopStocks, setSectorTopStocks] = useState({});
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchAllSectors = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      const data = {};
      for (const { symbol } of sectors) {
        try {
          const results = await screenSector(symbol);
          data[symbol] = results.slice(0, 3);
        } catch (err) {
          console.error(`Failed to fetch top stocks for ${symbol}`, err);
        }
      }
      setSectorTopStocks(data);
    };

    fetchAllSectors();
  }, []);

  useEffect(() => {
    if (!window.TradingView || Object.keys(sectorTopStocks).length === 0) return;

    sectors.forEach(({ symbol }, sectorIndex) => {
      const sectorContainerId = `sector_chart_${sectorIndex}`;
      const sectorContainer = document.getElementById(sectorContainerId);
      if (sectorContainer) {
        new window.TradingView.widget({
          container_id: sectorContainerId,
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

      const topStocks = sectorTopStocks[symbol] || [];
      topStocks.forEach((stock, index) => {
        const stockContainerId = `stock_chart_${symbol}_${index}`;
        const stockContainer = document.getElementById(stockContainerId);
        if (stockContainer) {
          new window.TradingView.widget({
            container_id: stockContainerId,
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
            hideideas: true,
          });
        }
      });
    });
  }, [sectorTopStocks]);

  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        //console.log("TradingView loaded.");
      };
      document.body.appendChild(script);
    }
  }, []);


  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", backgroundColor: "#f2f2f2" }}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>SPDR Sector SMA Dashboard</h1>

      {sectors.map(({ symbol, name }, sectorIndex) => (
        <div
          key={symbol}
          style={{
            marginBottom: 60,
            background: "#fff",
            borderRadius: 10,
            padding: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          <h2 style={{ marginBottom: 10 }}>{name}</h2>

          {/* Sector Chart */}
          <div id={`sector_chart_${sectorIndex}`} style={{ height: 600, marginBottom: 20 }}></div>

          {/* Top 4 Stock Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
              gap: 20
            }}
          >
            {(sectorTopStocks[symbol] || []).map((stock, index) => (
              <div key={index}>
                <div style={{ fontWeight: "bold", marginBottom: 8, fontSize: 16 }}>{stock.name}</div>
                <div id={`stock_chart_${symbol}_${index}`} style={{ height: 400 }}></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectorChartsDashboard;
