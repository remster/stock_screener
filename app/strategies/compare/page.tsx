"use client";

import { useState } from "react";
import { getStrategies } from "@/lib/strategies/index";
import { useScreen } from "@/lib/hooks/use-screen";
import { ProgressBar } from "@/components/progress-bar";
import { StrategyResultsTable } from "@/components/strategy-results-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

function ComparePanel({ slug }: { slug: string }) {
  const strategy = getStrategies().find((s) => s.slug === slug);
  const { results, progress, status, filterBreakdown, run } = useScreen();

  if (!strategy) return null;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{strategy.name}</h3>
        <Button
          size="sm"
          disabled={status === "scanning"}
          onClick={() => {
            const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
            run(slug, getStoredParams(slug, defaults));
          }}
        >
          {status === "idle" ? "Run" : "Re-run"}
        </Button>
      </div>
      <ProgressBar progress={progress} status={status} />
      <StrategyResultsTable results={results} />
    </div>
  );
}

export default function ComparePage() {
  const strategies = getStrategies();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Compare Strategies</h1>
      <div className="flex gap-2 mb-6">
        {strategies.map((s) => (
          <Badge
            key={s.slug}
            variant={selected.includes(s.slug) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggle(s.slug)}
          >
            {s.name}
          </Badge>
        ))}
      </div>

      {selected.length === 0 && (
        <p className="text-muted-foreground">Select strategies above to compare.</p>
      )}

      <div className="flex gap-4 overflow-x-auto">
        {selected.map((slug) => (
          <ComparePanel key={slug} slug={slug} />
        ))}
      </div>
    </div>
  );
}
