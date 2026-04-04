export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Stock Detail</h1>
      <p className="text-muted-foreground">Chart and fundamentals will appear here.</p>
    </div>
  );
}
