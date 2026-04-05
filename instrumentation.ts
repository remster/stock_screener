export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { pruneCache } = await import("@/lib/cache");
    const path = await import("path");
    const cacheDir = path.resolve(process.cwd(), ".cache");
    console.log("Pruning old cache files...");
    pruneCache(cacheDir);
    console.log("Cache pruning complete.");
  }
}
