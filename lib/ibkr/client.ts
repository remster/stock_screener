import https from "https";

const GATEWAY_URL = process.env.IBKR_GATEWAY_URL ?? "https://localhost:5000/v1/portal";

const agent = new https.Agent({ rejectUnauthorized: false });

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    // @ts-expect-error - Node fetch accepts agent via dispatcher in newer versions; this works under Next.js runtime
    agent,
  });
  if (!res.ok) {
    throw new Error(`IBKR ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface IbkrAuthStatus {
  authenticated: boolean;
  competing: boolean;
  connected?: boolean;
}

export interface IbkrAccount {
  id: string;
  accountId?: string;
}

export interface IbkrPosition {
  conid: number;
  contractDesc: string;
  ticker?: string;
  position: number;
  avgCost: number;
  mktPrice: number;
  mktValue: number;
  unrealizedPnl: number;
}

export interface IbkrOrder {
  ticker: string;
  side: "BUY" | "SELL";
  orderType: string;
  origOrderType: string;
  price: number;
  remainingQuantity: number;
  filledQuantity: number;
  status: string;
  conid: number;
}

export interface IbkrAccountSummary {
  netliquidation?: { amount: number };
  [key: string]: unknown;
}

export function getAuthStatus(): Promise<IbkrAuthStatus> {
  return get<IbkrAuthStatus>("/iserver/auth/status");
}

export function getAccounts(): Promise<IbkrAccount[]> {
  return get<IbkrAccount[]>("/portfolio/accounts");
}

export function getPositions(accountId: string): Promise<IbkrPosition[]> {
  return get<IbkrPosition[]>(`/portfolio/${accountId}/positions/0`);
}

export function getOrders(): Promise<{ orders: IbkrOrder[] }> {
  return get<{ orders: IbkrOrder[] }>("/iserver/account/orders");
}

export function getAccountSummary(accountId: string): Promise<IbkrAccountSummary> {
  return get<IbkrAccountSummary>(`/portfolio/${accountId}/summary`);
}
