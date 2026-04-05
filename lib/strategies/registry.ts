import { Strategy } from "./types";

const strategies: Strategy[] = [];

export function registerStrategy(strategy: Strategy): void {
  strategies.push(strategy);
}

export function getStrategies(): Strategy[] {
  return [...strategies];
}

export function getStrategy(slug: string): Strategy | undefined {
  return strategies.find((s) => s.slug === slug);
}

