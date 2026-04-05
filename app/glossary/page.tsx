"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { metricDefinitions } from "@/lib/fundamentals/ratings";

export default function GlossaryPage() {
  const [search, setSearch] = useState("");

  const filtered = metricDefinitions.filter(
    (m) =>
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = new Map<string, typeof metricDefinitions>();
  for (const m of filtered) {
    const list = categories.get(m.category) ?? [];
    list.push(m);
    categories.set(m.category, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Glossary</h1>
      <Input
        placeholder="Search metrics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mb-6"
      />

      {Array.from(categories.entries()).map(([category, metrics]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{category}</h2>
          <div className="space-y-3">
            {metrics.map((m) => (
              <Card key={m.key}>
                <CardHeader>
                  <CardTitle className="text-base">{m.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {m.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-muted-foreground">No metrics match &quot;{search}&quot;</p>
      )}
    </div>
  );
}
