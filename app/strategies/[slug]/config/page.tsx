export default function StrategyConfigPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Strategy Configuration</h1>
      <p className="text-muted-foreground">Threshold sliders will appear here.</p>
    </div>
  );
}
