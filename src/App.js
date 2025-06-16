// App.js
import { useEffect } from "react";
import sectors from "./sectors";

const SectorChartsLanding = () => {
  useEffect(() => {
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (window.TradingView) {
      initWidgets();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        initWidgets();
      };
      document.body.appendChild(script);
    }

    function initWidgets() {
      Object.keys(sectors).forEach((symbol, index) => {
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
    }
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", backgroundColor: "#f2f2f2" }}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>
        SPDR Sector SMA Dashboard
      </h1>

      <div>
        <h2 style={{ marginBottom: 20 }}>Sector Charts</h2>
        {Object.entries(sectors).map(([ symbol, name ], index) => (
          <div
            key={symbol}
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 16,
              marginBottom: 40,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              cursor: "pointer"
            }}
            onClick={() => window.open(`/sector/${symbol}`, "_blank")}
          >
            <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>{name}</div>
            <div id={`sector_chart_${index}`} style={{ height: 600 }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectorChartsLanding;
