"use client";

import { useState } from "react";
import { FundamentalsResult, MetricResult } from "@/lib/fundamentals/score";
import { getRating } from "@/lib/fundamentals/ratings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CATEGORIES = ["Valuation", "Profitability", "Growth", "Financial Health", "Dividend"] as const;

function ratingColor(rating: string): string {
  switch (rating) {
    case "green": return "bg-green-500";
    case "yellow": return "bg-yellow-500";
    case "red": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function scoreToRating(score: number): string {
  return getRating(score);
}

function CompositeScore({ score }: { score: number }) {
  const rating = scoreToRating(score);
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={`inline-block size-3 rounded-full shrink-0 ${ratingColor(rating)}`} />
      <span className="text-sm font-medium text-muted-foreground">Composite Score</span>
      <span className="ml-auto font-semibold tabular-nums">{score.toFixed(1)}<span className="text-muted-foreground font-normal">/10</span></span>
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricResult }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`inline-block size-2.5 rounded-full shrink-0 ${ratingColor(metric.rating)}`} />
      <TooltipProvider closeDelay={300}>
        <Tooltip>
          <TooltipTrigger className="text-sm flex-1 truncate text-left cursor-help underline decoration-dotted underline-offset-2">
            {metric.label}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-72 space-y-2 p-3">
            <a
              href={metric.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {metric.label} ↗
            </a>
            <p className="leading-snug text-neutral-300">{metric.description}</p>
            <p className="text-yellow-300">{metric.justify}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog>
        <DialogTrigger
          render={<Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Info for ${metric.label}`} />}
        >
          ?
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{metric.label}</DialogTitle>
            <DialogDescription>{metric.description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Value: <span className="font-medium text-foreground">{metric.formatted}</span>
            </div>
            <Badge variant={metric.rating === "green" ? "default" : metric.rating === "red" ? "destructive" : "secondary"}>
              {metric.score.toFixed(1)}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
      <span className="text-sm tabular-nums w-10 text-right">{metric.formatted}</span>
      <Badge
        variant={metric.rating === "green" ? "default" : metric.rating === "red" ? "destructive" : "secondary"}
        className="w-10 justify-center"
      >
        {metric.score.toFixed(1)}
      </Badge>
    </div>
  );
}

interface FundamentalsCardProps {
  fundamentals: FundamentalsResult;
}

export function FundamentalsCard({ fundamentals }: FundamentalsCardProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const metricsByCategory = CATEGORIES.reduce<Record<string, MetricResult[]>>((acc, cat) => {
    acc[cat] = fundamentals.metrics.filter((m) => m.category === cat);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <CompositeScore score={fundamentals.composite} />
      <div className="space-y-2">
        {CATEGORIES.map((category) => {
          const metrics = metricsByCategory[category];
          if (!metrics || metrics.length === 0) return null;
          const isOpen = openCategory === category;
          return (
            <div key={category} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setOpenCategory(isOpen ? null : category)}
                aria-expanded={isOpen}
              >
                <span>{category}</span>
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="border-t px-3 pb-2 pt-1">
                  {metrics.map((metric) => (
                    <MetricRow key={metric.key} metric={metric} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
