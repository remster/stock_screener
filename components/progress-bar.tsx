"use client";

import { Progress } from "@/components/ui/progress";

interface ScanProgress {
  scanned: number;
  total: number;
  matches: number;
  skipped?: number;
}

interface ProgressBarProps {
  progress: ScanProgress | null;
  status: "idle" | "scanning" | "done" | "error";
}

export function ProgressBar({ progress, status }: ProgressBarProps) {
  if (status === "idle" || !progress) return null;

  const percent = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  if (status === "done") {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-medium">Scan complete</span>
        <span className="text-muted-foreground ml-2">
          {progress.matches} match{progress.matches !== 1 ? "es" : ""} out of {progress.total} stocks
          {progress.skipped != null && progress.skipped > 0 && ` (${progress.skipped} skipped)`}
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Scan failed. Please try again.
      </div>
    );
  }

  // scanning
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">Scanning</span>
        <span className="text-muted-foreground tabular-nums">{percent}%</span>
      </div>
      <Progress value={percent} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {progress.scanned} / {progress.total} scanned &mdash; {progress.matches} match{progress.matches !== 1 ? "es" : ""}
        {progress.skipped != null && progress.skipped > 0 && `, ${progress.skipped} skipped`}
      </p>
    </div>
  );
}
