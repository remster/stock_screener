"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function fmtUsd(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export type Metric = { cost: number; stop: number; now: number };

export function MetricCells({ m }: { m: Metric }) {
  const gain = m.now - m.cost;
  const gainPct = m.cost > 0 ? gain / m.cost : 0;
  const gainColor = gain >= 0 ? "text-green-500" : "text-red-500";
  const gainSign = gain >= 0 ? "+" : "";

  const risked = m.cost - m.stop;
  const riskedPct = m.cost > 0 ? risked / m.cost : 0;
  const stopColor = m.stop >= m.cost ? "text-green-500" : "text-red-500";

  return (
    <>
      <td className="py-1 px-3 text-right tabular-nums">{fmtUsd(m.cost)}</td>
      <td className="py-1 px-3 text-right tabular-nums">{fmtUsd(m.now)}</td>
      <td className={`py-1 px-3 text-right tabular-nums ${stopColor}`}>{fmtUsd(m.stop)}</td>
      <td className={`py-1 px-3 text-right tabular-nums ${gainColor}`}>{gainSign}{fmtUsd(gain)}</td>
      <td className={`py-1 px-3 text-right tabular-nums ${gainColor}`}>{gainSign}{pct(gainPct)}</td>
      <td className="py-1 px-3 text-right tabular-nums text-red-500">{fmtUsd(risked)}</td>
      <td className="py-1 pl-3 text-right tabular-nums text-red-500">{pct(riskedPct)}</td>
    </>
  );
}

export function MetricRow({
  label,
  m,
  labelClass = "",
}: {
  label: ReactNode;
  m: Metric;
  labelClass?: string;
}) {
  return (
    <>
      <td className={`py-1 pr-3 ${labelClass}`}>{label}</td>
      <MetricCells m={m} />
    </>
  );
}

function ColTip({ label, tip, className }: { label: string; tip: string; className?: string }) {
  return (
    <th className={className}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">
            {label}
          </TooltipTrigger>
          <TooltipContent className="max-w-56 text-center">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </th>
  );
}

export function MetricHeader() {
  return (
    <tr className="text-xs text-muted-foreground border-b">
      <th className="text-left py-1 pr-3"></th>
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="Cost Basis"
        tip="Total amount paid for the position (shares × average entry price)."
      />
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="Current"
        tip="Current market value at the last quoted price."
      />
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="Pessimistic"
        tip="Proceeds if every stop order executes at its stop price. Shares with no stop are excluded (treated as a total loss)."
      />
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="$ Gain"
        tip="Unrealised gain or loss in dollars — Current Value minus Cost Basis."
      />
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="% Gain"
        tip="Unrealised gain or loss as a percentage of Cost Basis."
      />
      <ColTip
        className="text-right py-1 px-3 font-normal"
        label="$ Risk"
        tip="Maximum loss in dollars if all stop orders trigger — Cost Basis minus Stop Value. Zero for shares with no stop."
      />
      <ColTip
        className="text-right py-1 pl-3 font-normal"
        label="% Risk"
        tip="Maximum loss as a percentage of Cost Basis if all stop orders trigger. Zero for shares with no stop."
      />
    </tr>
  );
}
