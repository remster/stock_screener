// PriceChart.js
import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const PriceChart = ({ data, height = 400 }) => {
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
    series.setData(data.candles.map(item => ({
      time: item.date.split('T')[0], // Convert "2024-08-12T13:30:00.000Z" to "2024-08-12"
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    })));

    //
    // support and resistance
    //
    let max_resistance = 2;
    data.last.resistance.slice(0,max_resistance).forEach((r, i) => {
      series.createPriceLine({
        price: r.level,
        color: "red",
        lineWidth: max_resistance-i,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "res",
      });
    });
    data.last.support.slice(0,max_resistance).forEach((r, i) => {
      series.createPriceLine({
        price: r.level,
        color: "green",
        lineWidth: max_resistance-i,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "sup",
      });
    });

    //
    // SMAs
    //
    const smas = Object.keys(data.last).filter((k) => k.startsWith("sma")).sort(function (a, b) {
      if (a.length == b.length) {
        return a > b ? 1 : -1;
      }
      return a.length > b.length ? 1 : -1;
    });
    const sma_colors = ['#FF0000', '#2962FF', "#000000"];
    smas.forEach((sma, i) => {
      chart.addSeries(
        LineSeries, { color: sma_colors[i], lineWidth: 1 }
      ).setData(data.candles.map(item => ({
        time: item.date.split('T')[0], // Convert "2024-08-12T13:30:00.000Z" to "2024-08-12"
        value: item[sma]
      })));
    });

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: "100%" }} />;
};

export default PriceChart;