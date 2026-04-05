import { Candle, SupportResistanceLevel } from "@/lib/types";

interface SRResult {
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  rawSupports: Array<Candle & { level: number; type: string }>;
  rawResistances: Array<Candle & { level: number; type: string }>;
}

export function supportResistance(
  data: Candle[], window: number = 3, volumeThreshold: number = 1.2, priceClusterThreshold: number = 0.02
): SRResult {
  const supports: Array<Candle & { level: number; type: string }> = [];
  const resistances: Array<Candle & { level: number; type: string }> = [];

  for (let i = window; i < data.length - window; i++) {
    const current = data[i];
    let isSwingLow = true, isSwingHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (current.low >= data[j].low) isSwingLow = false;
      if (current.high <= data[j].high) isSwingHigh = false;
    }
    const neighborVolumes: number[] = [];
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      neighborVolumes.push(data[j].volume);
    }
    const avgVol = neighborVolumes.reduce((a, b) => a + b, 0) / neighborVolumes.length;
    const hasVolume = current.volume >= avgVol * volumeThreshold;
    if (isSwingLow && hasVolume) supports.push({ ...current, level: current.low, type: "support" });
    if (isSwingHigh && hasVolume) resistances.push({ ...current, level: current.high, type: "resistance" });
  }

  const clusterLevels = (
    levels: Array<Candle & { level: number; type: string }>,
    type: "support" | "resistance"
  ): SupportResistanceLevel[] => {
    if (levels.length === 0) return [];
    const sorted = [...levels].sort((a, b) => a.level - b.level);
    const clusters: Array<typeof levels> = [];
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i].level - current[0].level) / current[0].level;
      if (diff <= priceClusterThreshold) current.push(sorted[i]);
      else { clusters.push(current); current = [sorted[i]]; }
    }
    clusters.push(current);
    return clusters.map((cluster) => {
      const avgLevel = cluster.reduce((s, p) => s + p.level, 0) / cluster.length;
      const totalVolume = cluster.reduce((s, p) => s + p.volume, 0);
      const testCount = cluster.length;
      return {
        level: avgLevel, type, strength: testCount, totalVolume,
        tests: cluster, significance: testCount * Math.log(totalVolume + 1),
      };
    }).sort((a, b) => b.significance - a.significance);
  };

  return {
    supports: clusterLevels(supports, "support"),
    resistances: clusterLevels(resistances, "resistance"),
    rawSupports: supports, rawResistances: resistances,
  };
}

export function breaksResistance(candles: Candle[], window: number = 3): boolean {
  const sr = supportResistance(candles.slice(-150), window);
  if (sr.resistances.length === 0) return false;
  return candles[candles.length - 1].close > sr.resistances[0].level;
}
