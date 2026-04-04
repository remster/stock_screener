export default function StrategyResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Strategy Results</h1>
      <p className="text-muted-foreground">Results table will appear here.</p>
    </div>
  );
}
