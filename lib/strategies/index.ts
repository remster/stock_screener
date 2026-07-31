// Side-effect imports register all strategies into the registry.
// Import from this module (not registry.ts directly) to ensure all strategies are registered.
import "./elliots";
import "./sector-breakout";

export { registerStrategy, getStrategies, getStrategy } from "./registry";
export type { Strategy, StrategyParam } from "./types";
