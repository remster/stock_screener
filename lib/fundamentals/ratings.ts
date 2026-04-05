export type Rating = "green" | "yellow" | "red" | "grey";

export interface MetricDefinition {
  key: string;
  label: string;
  category: "Valuation" | "Profitability" | "Growth" | "Financial Health" | "Dividend";
  weight: number;
  description: string;
  score: (value: number) => number;
  format: (value: number) => string;
  path: { module: string; field: string };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function inverseLinear(value: number, best: number, worst: number): number {
  return clamp(((worst - value) / (worst - best)) * 10, 0, 10);
}

function linear(value: number, worst: number, best: number): number {
  return clamp(((value - worst) / (best - worst)) * 10, 0, 10);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const metricDefinitions: MetricDefinition[] = [
  {
    key: "forwardPE", label: "Forward P/E", category: "Valuation", weight: 0.15,
    description: "Current stock price divided by estimated earnings per share for the next 12 months. Tells you how much you're paying per dollar of expected future profit. Lower means cheaper relative to expected earnings. A stock at $100 with $5 expected EPS has a forward P/E of 20. Compare within the same sector — tech typically runs higher than utilities.",
    score: (v) => inverseLinear(v, 10, 40), format: (v) => v.toFixed(1),
    path: { module: "summaryDetail", field: "forwardPE" },
  },
  {
    key: "pegRatio", label: "PEG Ratio", category: "Valuation", weight: 0.10,
    description: "P/E ratio divided by earnings growth rate. Adjusts valuation for growth — a high P/E stock growing fast may still be cheap. PEG of 1.0 means you're paying fair value for growth. Below 1.0 is potentially undervalued, above 2.0 is expensive relative to growth.",
    score: (v) => inverseLinear(v, 0.5, 3.0), format: (v) => v.toFixed(2),
    path: { module: "defaultKeyStatistics", field: "pegRatio" },
  },
  {
    key: "priceToBook", label: "Price/Book", category: "Valuation", weight: 0.05,
    description: "Stock price divided by book value per share (assets minus liabilities). Shows what you're paying relative to the company's net asset value. Below 1.0 means the market values the company below its asset value. Very high P/B (above 8) suggests the stock is priced on growth expectations, not tangible assets.",
    score: (v) => inverseLinear(v, 1, 12), format: (v) => v.toFixed(2),
    path: { module: "defaultKeyStatistics", field: "priceToBook" },
  },
  {
    key: "profitMargin", label: "Profit Margin", category: "Profitability", weight: 0.10,
    description: "Net income as a percentage of revenue. Shows how much profit the company keeps from each dollar of sales after all expenses. Higher margins mean the company is more efficient at converting revenue to profit. Above 20% is strong, below 10% may indicate tight competition or high costs.",
    score: (v) => linear(v, 0, 0.30), format: pct,
    path: { module: "financialData", field: "profitMargins" },
  },
  {
    key: "returnOnEquity", label: "Return on Equity", category: "Profitability", weight: 0.10,
    description: "Net income divided by shareholder equity. Measures how effectively the company uses investor capital to generate profit. ROE of 20% means the company generates $0.20 profit for every $1 of equity. Consistently high ROE (above 15-20%) signals a strong competitive advantage.",
    score: (v) => linear(v, 0, 0.30), format: pct,
    path: { module: "financialData", field: "returnOnEquity" },
  },
  {
    key: "revenueGrowth", label: "Revenue Growth YoY", category: "Growth", weight: 0.10,
    description: "Percentage increase in revenue compared to the same quarter last year. Shows whether the company is expanding its sales. Above 15% is strong growth, 5-15% is moderate, below 5% may signal stagnation. Negative growth means the company is shrinking.",
    score: (v) => linear(v, -0.05, 0.25), format: pct,
    path: { module: "financialData", field: "revenueGrowth" },
  },
  {
    key: "earningsGrowth", label: "Earnings Growth YoY", category: "Growth", weight: 0.10,
    description: "Percentage increase in earnings compared to the same quarter last year. Earnings growth that outpaces revenue growth signals improving efficiency. Strong earnings growth (above 15%) drives stock price appreciation. Negative earnings growth is a warning sign.",
    score: (v) => linear(v, -0.05, 0.25), format: pct,
    path: { module: "financialData", field: "earningsGrowth" },
  },
  {
    key: "debtToEquity", label: "Debt/Equity", category: "Financial Health", weight: 0.10,
    description: "Total debt divided by total shareholder equity. Shows how much the company relies on borrowed money. Below 0.5 means conservative financing, above 1.5 means heavy debt. High debt increases risk during downturns because interest payments are mandatory regardless of revenue.",
    score: (v) => inverseLinear(v, 0, 200), format: (v) => v.toFixed(1),
    path: { module: "financialData", field: "debtToEquity" },
  },
  {
    key: "currentRatio", label: "Current Ratio", category: "Financial Health", weight: 0.10,
    description: "Current assets divided by current liabilities. Measures the company's ability to pay short-term obligations. Above 2.0 means strong liquidity, below 1.0 means the company may struggle to pay its bills. Very high ratios (above 4) may suggest the company is not investing its cash efficiently.",
    score: (v) => linear(v, 0.5, 3.0), format: (v) => v.toFixed(2),
    path: { module: "financialData", field: "currentRatio" },
  },
  {
    key: "dividendYield", label: "Dividend Yield", category: "Dividend", weight: 0.10,
    description: "Annual dividend payment divided by stock price, expressed as a percentage. Shows income return on your investment. 2-4% is a healthy yield. 0% means no dividends (common for growth stocks). Above 8% is a red flag — the dividend may be unsustainable or the stock price has crashed.",
    score: (v) => { if (v === 0) return 3; if (v > 0.08) return 2; return linear(v, 0, 0.04); },
    format: pct,
    path: { module: "summaryDetail", field: "dividendYield" },
  },
];

export function getRating(score: number): Rating {
  if (score >= 8) return "green";
  if (score >= 4) return "yellow";
  return "red";
}
