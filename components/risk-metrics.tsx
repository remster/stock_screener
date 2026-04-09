"use client";

import type { ReactNode } from "react";

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
  const risked = m.cost - m.stop;
  const riskedPct = m.cost > 0 ? risked / m.cost : 0;
  const stopColor = m.stop >= m.cost ? "text-green-500" : "text-red-500";
  const nowColor = m.now >= m.cost ? "text-green-500" : "text-red-500";
  return (
    <>
      <td className="py-1 px-3 text-right tabular-nums">{fmtUsd(m.cost)}</td>
      <td className="py-1 px-3 text-right tabular-nums text-red-500">
        {fmtUsd(risked)} / {pct(riskedPct)}
      </td>
      <td className={`py-1 px-3 text-right tabular-nums ${stopColor}`}>{fmtUsd(m.stop)}</td>
      <td className={`py-1 pl-3 text-right tabular-nums ${nowColor}`}>{fmtUsd(m.now)}</td>
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

export function MetricHeader() {
  return (
    <tr className="text-xs text-muted-foreground border-b">
      <th className="text-left py-1 pr-3"></th>
      <th className="text-right py-1 px-3 font-normal">Cost Basis</th>
      <th className="text-right py-1 px-3 font-normal">Risk</th>
      <th className="text-right py-1 px-3 font-normal">Pessimistic</th>
      <th className="text-right py-1 pl-3 font-normal">Current</th>
    </tr>
  );
}
