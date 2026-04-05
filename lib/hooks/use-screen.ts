"use client";

import { useState, useCallback } from "react";

export interface ScreenResult {
  symbol: string;
  name: string;
  close: number;
  rsi14: number | null;
  fundamentalsScore: number | null;
  filterResult: Record<string, boolean>;
}

export interface ScreenProgress {
  scanned: number;
  total: number;
  matches: number;
  skipped: number;
}

export function useScreen() {
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [progress, setProgress] = useState<ScreenProgress | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [filterBreakdown, setFilterBreakdown] = useState<Record<string, number> | null>(null);

  const run = useCallback((slug: string, params: Record<string, number>, sectors?: string[]) => {
    setResults([]);
    setProgress(null);
    setStatus("scanning");
    setFilterBreakdown(null);

    fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, params, sectors }),
    }).then((res) => {
      const reader = res.body?.getReader();
      if (!reader) { setStatus("error"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      const read = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "progress") setProgress(data);
              else if (currentEvent === "result") setResults((prev) => [...prev, data]);
              else if (currentEvent === "done") {
                setProgress(data);
                setFilterBreakdown(data.filterBreakdown);
                setStatus("done");
              }
              else if (currentEvent === "error") setStatus("error");
            }
          }
          return read();
        });

      read().catch(() => setStatus("error"));
    }).catch(() => setStatus("error"));
  }, []);

  return { results, progress, status, filterBreakdown, run };
}
