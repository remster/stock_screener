import { TradeSimulator } from "@/components/trade-simulator";

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trade Simulator</h1>
        <p className="text-muted-foreground mt-1">
          Add hypothetical trades to see how they shift portfolio risk.
        </p>
      </div>
      <TradeSimulator />
    </div>
  );
}
