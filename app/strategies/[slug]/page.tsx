"use client";

import { useEffect, use } from "react";
import { useScreen } from "@/lib/hooks/use-screen";
import { ProgressBar } from "@/components/progress-bar";
import { StrategyResultsTable } from "@/components/strategy-results-table";
import { SectorBreakoutResults } from "@/components/sector-breakout-results";
import { getStrategy } from "@/lib/strategies/index";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

export default function StrategyResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const strategy = getStrategy(slug);
  const { results, progress, status, filterBreakdown, sectorStrengths, run } = useScreen();

  useEffect(() => {
    if (!strategy) return;
    const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    const p = getStoredParams(slug, defaults);
    run(slug, p);
  }, [slug]);

  if (!strategy) {
    return <div className="text-red-500">Strategy &quot;{slug}&quot; not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{strategy.name}</h1>
        <div className="flex gap-2">
          <Link href={`/strategies/${slug}/config`}>
            <Button variant="outline" size="sm">Configure</Button>
          </Link>
          <Button
            size="sm"
            disabled={status === "scanning"}
            onClick={() => {
              const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
              run(slug, getStoredParams(slug, defaults));
            }}
          >
            Re-run
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
      <ProgressBar progress={progress} status={status} />
      {slug === "sector-breakout"
        ? <SectorBreakoutResults results={results} sectorStrengths={sectorStrengths} />
        : <StrategyResultsTable results={results} />
      }
    </div>
  );
}
