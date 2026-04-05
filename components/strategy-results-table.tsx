"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ScreenResult {
  symbol: string;
  name: string;
  close: number;
  rsi14: number | null;
  fundamentalsScore: number | null;
  filterResult: Record<string, boolean>;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

function getValue(row: ScreenResult, key: string): number | string | null {
  switch (key) {
    case "symbol": return row.symbol;
    case "name": return row.name;
    case "close": return row.close;
    case "rsi14": return row.rsi14;
    case "fundamentalsScore": return row.fundamentalsScore;
    default: return row.filterResult[key] ? 1 : 0;
  }
}

function compare(a: ScreenResult, b: ScreenResult, sort: SortState): number {
  const aVal = getValue(a, sort.key);
  const bVal = getValue(b, sort.key);

  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;
  if (bVal === null) return -1;

  const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  return sort.direction === "asc" ? result : -result;
}

interface SortableHeadProps {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
}

function SortableHead({ label, sortKey, sort, onSort, className }: SortableHeadProps) {
  const active = sort.key === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-muted-foreground text-xs">
          {active ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </span>
    </TableHead>
  );
}

interface StrategyResultsTableProps {
  results: ScreenResult[];
}

export function StrategyResultsTable({ results }: StrategyResultsTableProps) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ key: "fundamentalsScore", direction: "desc" });

  const filterKeys = results.length > 0 ? Object.keys(results[0].filterResult) : [];

  function handleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" }
    );
  }

  const sorted = [...results].sort((a, b) => compare(a, b, sort));

  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No results yet. Run a scan to see matches.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Symbol" sortKey="symbol" sort={sort} onSort={handleSort} />
          <SortableHead label="Name" sortKey="name" sort={sort} onSort={handleSort} className="min-w-32" />
          <SortableHead label="Price" sortKey="close" sort={sort} onSort={handleSort} />
          <SortableHead label="RSI(14)" sortKey="rsi14" sort={sort} onSort={handleSort} />
          <SortableHead label="Score" sortKey="fundamentalsScore" sort={sort} onSort={handleSort} />
          {filterKeys.map((key) => (
            <SortableHead key={key} label={key} sortKey={key} sort={sort} onSort={handleSort} />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow
            key={row.symbol}
            className="cursor-pointer"
            onClick={() => router.push(`/stock/${row.symbol}`)}
          >
            <TableCell className="font-medium">{row.symbol}</TableCell>
            <TableCell className="max-w-48 truncate">{row.name}</TableCell>
            <TableCell className="tabular-nums">${row.close.toFixed(2)}</TableCell>
            <TableCell className="tabular-nums">{row.rsi14 != null ? row.rsi14.toFixed(1) : "—"}</TableCell>
            <TableCell className="tabular-nums">{row.fundamentalsScore != null ? row.fundamentalsScore.toFixed(1) : "—"}</TableCell>
            {filterKeys.map((key) => (
              <TableCell key={key}>
                <span
                  className={`inline-block size-2.5 rounded-full ${row.filterResult[key] ? "bg-green-500" : "bg-red-500"}`}
                  aria-label={row.filterResult[key] ? "pass" : "fail"}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
