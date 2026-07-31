import { StockData } from "@/lib/types";

export interface StrategyParam {
  key: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface Strategy {
  slug: string;
  name: string;
  description: string;
  sectors: string[];
  params: StrategyParam[];
  filter: (stock: StockData, params: Record<string, number>) => Record<string, boolean>;
  sort: (a: StockData, b: StockData) => number;
}
