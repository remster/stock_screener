import https from "node:https";
import { URL } from "node:url";

const GATEWAY_URL = process.env.IBKR_GATEWAY_URL ?? "https://localhost:5000/v1/portal";

// Gateway uses a self-signed (and often expired) cert — bypass TLS verification.
const agent = new https.Agent({ rejectUnauthorized: false });

function request<T>(method: "GET" | "POST", path: string): Promise<T> {
  const url = new URL(`${GATEWAY_URL}${path}`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        agent,
        headers: {
          Accept: "application/json",
          "User-Agent": "stock-screener/1.0",
          ...(method === "POST" ? { "Content-Length": "0" } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`IBKR ${path} failed: ${res.statusCode} ${res.statusMessage}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(new Error(`IBKR ${path} invalid JSON: ${(e as Error).message}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
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
  return request<IbkrAuthStatus>("POST", "/iserver/auth/status");
}

export function getAccounts(): Promise<IbkrAccount[]> {
  return request<IbkrAccount[]>("GET", "/portfolio/accounts");
}

export function getPositions(accountId: string): Promise<IbkrPosition[]> {
  return request<IbkrPosition[]>("GET", `/portfolio/${accountId}/positions/0`);
}

export function getOrders(): Promise<{ orders: IbkrOrder[] }> {
  return request<{ orders: IbkrOrder[] }>("GET", "/iserver/account/orders");
}

export function getAccountSummary(accountId: string): Promise<IbkrAccountSummary> {
  return request<IbkrAccountSummary>("GET", `/portfolio/${accountId}/summary`);
}
