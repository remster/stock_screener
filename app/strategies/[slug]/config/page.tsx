"use client";

import { use, useState, useEffect } from "react";
import { getStrategy } from "@/lib/strategies/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

function getStoredParams(slug: string, defaults: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(`strategy-params-${slug}`);
  return stored ? JSON.parse(stored) : defaults;
}

export default function StrategyConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const strategy = getStrategy(slug);
  const defaults = strategy
    ? Object.fromEntries(strategy.params.map((p) => [p.key, p.default]))
    : {};
  const [values, setValues] = useState<Record<string, number>>(defaults);

  useEffect(() => {
    if (!strategy) return;
    const d = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    setValues(getStoredParams(slug, d));
  }, [slug]);

  if (!strategy) {
    return <div className="text-red-500">Strategy &quot;{slug}&quot; not found.</div>;
  }

  const save = () => {
    localStorage.setItem(`strategy-params-${slug}`, JSON.stringify(values));
  };

  const reset = () => {
    const d = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]));
    setValues(d);
    localStorage.removeItem(`strategy-params-${slug}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Configure: {strategy.name}</h1>
        <Link href={`/strategies/${slug}`}>
          <Button variant="outline" size="sm">Back to Results</Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{strategy.description}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.params.map((p) => (
            <div key={p.key}>
              <label className="text-sm font-medium mb-1 block">
                {p.label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={p.min ?? 0}
                  max={p.max ?? 100}
                  step={p.step ?? 1}
                  value={values[p.key] ?? p.default}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={p.min ?? 0}
                  max={p.max ?? 100}
                  step={p.step ?? 1}
                  value={values[p.key] ?? p.default}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                  }
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Default: {p.default}
                {p.min != null && ` · Min: ${p.min}`}
                {p.max != null && ` · Max: ${p.max}`}
              </p>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button onClick={save}>Save</Button>
            <Button variant="outline" onClick={reset}>Reset to Defaults</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
