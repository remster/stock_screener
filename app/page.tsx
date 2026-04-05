"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStrategies } from "@/lib/strategies/index";
import { useScreen } from "@/lib/hooks/use-screen";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Strategy } from "@/lib/strategies/types";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

function defaultParams(strategy: Strategy): Record<string, number> {
  return Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const router = useRouter();
  const { results, progress, status, run } = useScreen();

  useEffect(() => {
    const params = getStoredParams(strategy.slug, defaultParams(strategy));
    run(strategy.slug, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy.slug]);

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.scanned / progress.total) * 100)
      : 0;

  const hasResults = status === "done" && results.length > 0;
  const noResults = status === "done" && results.length === 0;

  const borderClass = hasResults
    ? "ring-green-500/60 bg-green-500/5"
    : noResults
    ? "ring-yellow-500/60 bg-yellow-500/5"
    : "";

  const handleClick = () => {
    if (status === "done") {
      router.push(`/strategies/${strategy.slug}`);
    }
  };

  return (
    <Card
      className={`transition-colors ${borderClass} ${status === "done" ? "cursor-pointer hover:ring-2" : ""}`}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle>{strategy.name}</CardTitle>
        <CardDescription>{strategy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "idle" && (
          <p className="text-sm text-muted-foreground">Starting scan...</p>
        )}
        {status === "scanning" && progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-muted-foreground">Scanning</span>
              <span className="text-muted-foreground tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} />
          </div>
        )}
        {status === "scanning" && !progress && (
          <p className="text-sm text-muted-foreground">Initializing...</p>
        )}
        {status === "done" && (
          <p className="text-sm font-medium">
            {results.length} match{results.length !== 1 ? "es" : ""}
            {progress && (
              <span className="text-muted-foreground font-normal ml-1">
                out of {progress.total} stocks
              </span>
            )}
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-destructive">Scan failed.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const strategies = getStrategies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Live results for all strategies using your saved parameters.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <StrategyCard key={strategy.slug} strategy={strategy} />
        ))}
      </div>
    </div>
  );
}
