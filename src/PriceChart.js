// PriceChart.js
import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from 'lightweight-charts';

const PriceChart = ({ data, priceLines = [], height = 400 }) => {
  const chartContainerRef = useRef();

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "#fff" },
        textColor: "#000",
      },
      grid: {
        vertLines: { color: "#eee" },
        horzLines: { color: "#eee" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    if (data.length === 0) {
      return;
    }

    // Create candlestick series using the correct API
    const series = chart.addSeries(CandlestickSeries);

    // Convert ISO datetime to yyyy-mm-dd format expected by lightweight-charts
    series.setData(data.map(item => ({
      time: item.date.split('T')[0], // Convert "2024-08-12T13:30:00.000Z" to "2024-08-12"
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    })));

    // Draw price lines (e.g., support, resistance)
    priceLines.forEach(({ price, color, title }) => {
      series.createPriceLine({
        price,
        color: color || "red",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: title || "",
      });
    });

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [data, priceLines]);

  return <div ref={chartContainerRef} style={{ width: "100%" }} />;
};

export default PriceChart;