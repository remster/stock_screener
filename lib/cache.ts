import fs from "fs";
import path from "path";

export function ensureCacheDir(cacheDir: string): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

export function cacheWrite(cacheDir: string, key: string, data: unknown): void {
  const filePath = path.join(cacheDir, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function cacheRead(cacheDir: string, key: string): unknown | null {
  const filePath = path.join(cacheDir, key);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.length) return null;
  try {
    return JSON.parse(content);
  } catch {
    fs.unlinkSync(filePath);
    return null;
  }
}

export function isCacheFresh(cacheDir: string, key: string, ttlMs: number): boolean {
  const filePath = path.join(cacheDir, key);
  if (!fs.existsSync(filePath)) return false;
  const stats = fs.statSync(filePath);
  return Date.now() - stats.mtimeMs < ttlMs;
}

export function pruneCache(cacheDir: string, maxAgeMs: number = 6 * 30 * 24 * 60 * 60 * 1000): void {
  if (!fs.existsSync(cacheDir)) return;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        if (Date.now() - stats.mtimeMs > maxAgeMs) fs.unlinkSync(fullPath);
      }
    }
  };
  walk(cacheDir);
}
