// SectorDetailPage.jsx
import { useEffect, useState } from "react";
import screen from "./Screener";
import sectors from "./sectors";
import PriceChart from "./PriceChart";

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

const SectorDetailPage = () => {
  const [topStocks, setTopStocks] = useState([]);
  const [countdown, setCountdown] = useState(0);

  const pathnameParts = window.location.pathname.split("/");
  const sectorSymbol = pathnameParts[pathnameParts.length - 1];
  const sectorName = sectors[sectorSymbol];

  useEffect(() => {
    if (sectorName) {
      document.title = `${sectorName}`;
    } else {
      document.title = "Unknown Sector";
    }
  }, [sectorName]);

  useEffect(() => {
    if (!sectorSymbol) return;

    const fetchTopStocks = async () => {
      const stocks = await screen([
        { symbol: sectorSymbol, name: sectorSymbol }
      ], {
        sort: closestToSma(50, true),
        filter: (stock) => ({
          rising:
            stock.last.close > stock.last.sma50 &&
            stock.last.sma50 > stock.last.sma100,
          mcap: stock.summaryDetail.marketCap > 1e9,
          volume:
            stock.last.volume >
            1.2 * stock.summaryDetail.averageVolume10days,
          pa: stock.summaryDetail.forwardPE < 50,
          rsi: stock.last.rsi14 < 73,
        }),
        progress: (to_go) => setCountdown(to_go),
      });
      setTopStocks(stocks.slice(0, 10));
    };

    fetchTopStocks();
  }, [sectorSymbol]);

  if (!sectorSymbol) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Unknown Sector</h2>
        <p>No sector symbol found in path</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f2f2f2",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 10 }}>{sectorName}</h1>
      <div style={{ textAlign: "center", fontSize: 18, marginBottom: 10 }}>
        Countdown: {countdown}
      </div>
      {topStocks.map((stock) => (
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
          <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
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
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <div style={{ display: "flex" }}>
              <div style={{ width: 70, fontWeight: "bold" }}>rsi14:</div>
              <div>{stock.last.rsi14}</div>
            </div>
          </div>
          <PriceChart
            data={stock}
          />
        </div>
      ))}
    </div>
  );
};

export default SectorDetailPage;
