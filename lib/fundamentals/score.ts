import { metricDefinitions, getRating, Rating } from "./ratings";

export interface MetricResult {
  key: string;
  label: string;
  category: string;
  value: number | null;
  score: number;
  rating: Rating;
  formatted: string;
  description: string;
  wikiUrl: string;
  justify: string;
  weight: number;
}

export interface FundamentalsResult {
  composite: number;
  metrics: MetricResult[];
}

export function extractMetricValue(data: Record<string, unknown>, module: string, field: string): number | null {
  const mod = data[module] as Record<string, unknown> | undefined;
  if (!mod) return null;
  const val = mod[field];
  if (typeof val !== "number" || isNaN(val)) return null;
  return val;
}

export function computeFundamentalsScore(data: Record<string, unknown>): FundamentalsResult {
  const metrics: MetricResult[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const def of metricDefinitions) {
    const value = extractMetricValue(data, def.path.module, def.path.field);
    if (value === null) {
      metrics.push({
        key: def.key, label: def.label, category: def.category, value: null,
        score: 5, rating: "grey", formatted: "N/A", description: def.description,
        wikiUrl: def.wikiUrl, justify: "No data available for this metric.", weight: def.weight,
      });
      continue;
    }
    const score = def.score(value);
    const rating = getRating(score);
    const formatted = def.format(value);
    metrics.push({
      key: def.key, label: def.label, category: def.category, value, score, rating,
      formatted, description: def.description, wikiUrl: def.wikiUrl,
      justify: def.justify(value, formatted), weight: def.weight,
    });
    weightedSum += score * def.weight;
    totalWeight += def.weight;
  }

  const composite = totalWeight > 0 ? weightedSum / totalWeight : 5;
  return { composite, metrics };
}
