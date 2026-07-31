import { NextRequest, NextResponse } from "next/server";
import { fetchHistory, fetchFundamentals } from "@/lib/yahoo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "150", 10);
  try {
    const [candles, fundamentals] = await Promise.all([
      fetchHistory(symbol, days),
      fetchFundamentals(symbol),
    ]);
    return NextResponse.json({ candles, summary: fundamentals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch history", details: message }, { status: 500 });
  }
}
