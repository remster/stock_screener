"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import { StockData } from "@/lib/types";

interface PriceChartProps {
  data: StockData;
  height?: number;
}

export function PriceChart({ data, height = 400 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: "transparent" }, textColor: "#888" },
      grid: { vertLines: { color: "rgba(0,0,0,0.06)" }, horzLines: { color: "rgba(0,0,0,0.06)" } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries);
    candleSeries.setData(
      data.candles.map((c) => ({ time: c.date.split("T")[0], open: c.open, high: c.high, low: c.low, close: c.close }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0, bottom: 0.3 } });
    volumeSeries.setData(
      data.candles.map((c) => ({ time: c.date.split("T")[0], value: c.volume, color: c.close >= c.open ? "#26a69a" : "#ef5350" }))
    );

    const maxLines = 2;
    data.last?.resistance?.slice(0, maxLines).forEach((r, i) => {
      candleSeries.createPriceLine({ price: r.level, color: "red", lineWidth: (maxLines - i) as 1 | 2 | 3 | 4, lineStyle: 0, axisLabelVisible: true, title: "res" });
    });
    data.last?.support?.slice(0, maxLines).forEach((s, i) => {
      candleSeries.createPriceLine({ price: s.level, color: "green", lineWidth: (maxLines - i) as 1 | 2 | 3 | 4, lineStyle: 0, axisLabelVisible: true, title: "sup" });
    });

    const smaColors = ["#FF0000", "#2962FF", "#000000"];
    ["sma50", "sma100", "sma150"].forEach((key, i) => {
      const smaData = data.candles.filter((c) => typeof c[key] === "number").map((c) => ({ time: c.date.split("T")[0], value: c[key] as number }));
      if (smaData.length > 0) chart.addSeries(LineSeries, { color: smaColors[i], lineWidth: 1 }).setData(smaData);
    });

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, [data, height]);

  return <div ref={containerRef} className="w-full" />;
}
