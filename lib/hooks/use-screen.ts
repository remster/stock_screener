"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

type ScreenStatus = "idle" | "scanning" | "done" | "error";

interface ScreenSnapshot {
  results: ScreenResult[];
  progress: ScreenProgress | null;
  status: ScreenStatus;
  filterBreakdown: Record<string, number> | null;
}

const cache = new Map<string, ScreenSnapshot>();

export function useScreen(cacheKey?: string) {
  const cached = cacheKey ? cache.get(cacheKey) : undefined;

  const [results, setResults] = useState<ScreenResult[]>(cached?.results ?? []);
  const [progress, setProgress] = useState<ScreenProgress | null>(cached?.progress ?? null);
  const [status, setStatus] = useState<ScreenStatus>(cached?.status ?? "idle");
  const [filterBreakdown, setFilterBreakdown] = useState<Record<string, number> | null>(cached?.filterBreakdown ?? null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  // Persist to cache on completion
  useEffect(() => {
    if (cacheKeyRef.current && status === "done") {
      cache.set(cacheKeyRef.current, { results, progress, status, filterBreakdown });
    }
  }, [status, results, progress, filterBreakdown]);

  const run = useCallback((slug: string, params: Record<string, number>, sectors?: string[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResults([]);
    setProgress(null);
    setStatus("scanning");
    setFilterBreakdown(null);

    fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, params, sectors }),
      signal: controller.signal,
    }).then((res) => {
      const reader = res.body?.getReader();
      if (!reader) { setStatus("error"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      const read = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done || controller.signal.aborted) return;
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
              else if (currentEvent === "result") setResults((prev) =>
                prev.some((r) => r.symbol === data.symbol) ? prev : [...prev, data]
              );
              else if (currentEvent === "done") {
                setProgress(data);
                setFilterBreakdown(data.filterBreakdown);
                setStatus("done");
              }
              else if (currentEvent === "error") {
                if (data.message?.startsWith("Screen failed")) setStatus("error");
                else console.warn("Sector warning:", data.message ?? data);
              }
            }
          }
          return read();
        });

      read().catch((e) => {
        if (e?.name !== "AbortError") setStatus("error");
      });
    }).catch((e) => {
      if (e?.name !== "AbortError") setStatus("error");
    });
  }, []);

  return { results, progress, status, filterBreakdown, run };
}
