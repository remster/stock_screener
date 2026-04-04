import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { cacheRead, cacheWrite, isCacheFresh, pruneCache } from "@/lib/cache";

const TEST_CACHE_DIR = path.join(__dirname, "../.cache-test");

describe("cache", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
  });
  afterEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) fs.rmSync(TEST_CACHE_DIR, { recursive: true });
  });

  it("writes and reads JSON from cache", () => {
    const data = { symbol: "AAPL", close: 150 };
    cacheWrite(TEST_CACHE_DIR, "AAPL/2024-01-01.json", data);
    const result = cacheRead(TEST_CACHE_DIR, "AAPL/2024-01-01.json");
    expect(result).toEqual(data);
  });

  it("returns null for missing cache file", () => {
    expect(cacheRead(TEST_CACHE_DIR, "MISSING/file.json")).toBeNull();
  });

  it("returns null and deletes corrupt JSON", () => {
    const filePath = path.join(TEST_CACHE_DIR, "bad.json");
    fs.writeFileSync(filePath, "not json{{{");
    expect(cacheRead(TEST_CACHE_DIR, "bad.json")).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("checks TTL freshness", () => {
    cacheWrite(TEST_CACHE_DIR, "fresh.json", { a: 1 });
    expect(isCacheFresh(TEST_CACHE_DIR, "fresh.json", 60_000)).toBe(true);
    expect(isCacheFresh(TEST_CACHE_DIR, "missing.json", 60_000)).toBe(false);
  });

  it("prunes files older than maxAge", () => {
    const filePath = path.join(TEST_CACHE_DIR, "old.json");
    fs.writeFileSync(filePath, "{}");
    const oldTime = new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(filePath, oldTime, oldTime);
    const freshPath = path.join(TEST_CACHE_DIR, "new.json");
    fs.writeFileSync(freshPath, "{}");
    pruneCache(TEST_CACHE_DIR, 6 * 30 * 24 * 60 * 60 * 1000);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(fs.existsSync(freshPath)).toBe(true);
  });
});
