"use client";

import { useCallback, useEffect, useState } from "react";
import type { IbkrSnapshot } from "@/lib/risk/types";

const EMPTY: IbkrSnapshot = {
  connected: false,
  lastUpdated: null,
  positions: [],
  orders: [],
  netLiquidation: null,
};

export function useIbkr() {
  const [snapshot, setSnapshot] = useState<IbkrSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ibkr/positions", { method: "POST" });
      const data = (await res.json()) as IbkrSnapshot;
      setSnapshot(data);
    } catch {
      setSnapshot(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { snapshot, loading, refresh };
}
