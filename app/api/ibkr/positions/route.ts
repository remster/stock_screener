import { NextResponse } from "next/server";
import {
  getAuthStatus,
  getAccounts,
  getPositions,
  getOrders,
  getAccountSummary,
} from "@/lib/ibkr/client";
import { fetchSector } from "@/lib/yahoo";
import type { IbkrSnapshot, Position, Order } from "@/lib/risk/types";

const DISCONNECTED: IbkrSnapshot = {
  connected: false,
  lastUpdated: null,
  positions: [],
  orders: [],
  netLiquidation: null,
};

export async function POST() {
  try {
    const auth = await getAuthStatus();
    if (!auth.authenticated) {
      return NextResponse.json(DISCONNECTED);
    }

    const accounts = await getAccounts();
    if (accounts.length === 0) {
      return NextResponse.json(DISCONNECTED);
    }
    const accountId = accounts[0].id;

    const [rawPositions, rawOrdersResp, summary] = await Promise.all([
      getPositions(accountId),
      getOrders(),
      getAccountSummary(accountId),
    ]);

    const sectors = await Promise.all(
      rawPositions.map((p) => fetchSector(p.ticker ?? p.contractDesc)),
    );

    const positions: Position[] = rawPositions.map((p, i) => ({
      symbol: p.ticker ?? p.contractDesc,
      name: p.contractDesc,
      sector: sectors[i],
      quantity: p.position,
      avgEntryPrice: p.avgCost,
      currentPrice: p.mktPrice,
    }));

    const orders: Order[] = (rawOrdersResp.orders ?? []).map((o) => ({
      symbol: o.ticker,
      side: o.side,
      orderType: o.orderType,
      origOrderType: o.origOrderType,
      quantity: o.remainingQuantity,
      price: o.price,
      status: o.status,
    }));

    const netLiquidation =
      (summary.netliquidation as { amount?: number } | undefined)?.amount ?? null;

    const snapshot: IbkrSnapshot = {
      connected: true,
      lastUpdated: new Date().toISOString(),
      positions,
      orders,
      netLiquidation,
    };

    return NextResponse.json(snapshot);
  } catch (e) {
    console.error("IBKR positions route failed:", e);
    return NextResponse.json(DISCONNECTED);
  }
}
