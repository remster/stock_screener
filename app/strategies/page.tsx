"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStrategies } from "@/lib/strategies/index";

export default function StrategiesPage() {
  const router = useRouter();
  const strategies = getStrategies();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Strategies</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((s) => (
          <Card key={s.slug}>
            <CardHeader>
              <CardTitle>{s.name}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/strategies/${s.slug}`)}>
                  Run
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push(`/strategies/${s.slug}/config`)}>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push("/strategies/compare")}>
          Compare Side by Side
        </Button>
      </div>
    </div>
  );
}
