import { NextRequest, NextResponse } from "next/server";
import { fetchHoldings } from "@/lib/yahoo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const holdings = await fetchHoldings(ticker);
    return NextResponse.json(holdings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch ETF holdings", details: message }, { status: 500 });
  }
}
