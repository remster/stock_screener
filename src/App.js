import React, { useEffect } from "react";

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
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      sectors.forEach(({ symbol }, index) => {
        new window.TradingView.widget({
          container_id: `tv_chart_${index}`,
          autosize: true,
          symbol: symbol,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          toolbar_bg: "#f1f3f6",
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          studies: [
            {
              id: "MASimple@tv-basicstudies",
              inputs: { length: 50 },
            },
            {
              id: "MASimple@tv-basicstudies",
              inputs: { length: 150 },
            },
          ],
          withdateranges: true,
          details: false,
          hideideas: true,
        });
      });
    };
    document.body.appendChild(script);
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

      {/* TradingView Screener Widget */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ textAlign: "center" }}>S&P 500 Stock Screener</h2>
        <div className="tradingview-widget-container" style={{ height: 600 }}>
          <iframe
            title="Stock Screener"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_c2c6e&symbol=SPX:SPX&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&watchlist=SPX%3ASPX&studies=[]&theme=light&style=1&timezone=Etc%2FUTC&widgetbar=watchlist&toolbarbg=f1f3f6"
            style={{ width: "100%", height: "600px", border: "none" }}
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default SectorChartsDashboard;
