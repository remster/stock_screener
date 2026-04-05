import { NextRequest, NextResponse } from "next/server";
import { fetchFundamentals } from "@/lib/yahoo";
import { computeFundamentalsScore } from "@/lib/fundamentals/score";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  try {
    const data = await fetchFundamentals(symbol);
    if (!data) {
      return NextResponse.json({ error: "No fundamentals data available" }, { status: 404 });
    }
    const scored = computeFundamentalsScore(data);
    return NextResponse.json({ raw: data, score: scored });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch fundamentals", details: message }, { status: 500 });
  }
}
