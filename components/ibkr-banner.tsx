"use client";

import type { IbkrSnapshot } from "@/lib/risk/types";

export function IbkrBanner({ snapshot, loading, onRefresh }: {
  snapshot: IbkrSnapshot;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (!snapshot.connected) {
    return (
      <div className="rounded-md border border-yellow-500/60 bg-yellow-500/10 p-3 text-sm flex items-center justify-between">
        <span>
          IBKR Disconnected — log in at{" "}
          <a className="underline" href="https://localhost:5000" target="_blank" rel="noreferrer">
            https://localhost:5000
          </a>
        </span>
        <button onClick={onRefresh} className="text-xs underline" disabled={loading}>
          {loading ? "Checking..." : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-green-500/60 bg-green-500/10 p-3 text-sm flex items-center justify-between">
      <span>
        Connected · Last updated{" "}
        {snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleTimeString() : "—"}
      </span>
      <button onClick={onRefresh} className="text-xs underline" disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
