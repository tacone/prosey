import { describe, expect, test, afterEach } from "bun:test";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cacheKey, cacheDir, readCache, writeCache } from "./cache";

const testDir = "/tmp/prosey/test-cache-spec";

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("cacheKey", () => {
  test("includes video ID and hash", () => {
    const key = cacheKey("dQw4w9WgXcQ", {});
    expect(key).toStartWith("dQw4w9WgXcQ_");
    expect(key.length).toBe(20); // 11 + 1 + 8
  });

  test("different lang produces different key", () => {
    const a = cacheKey("dQw4w9WgXcQ", { lang: "en" });
    const b = cacheKey("dQw4w9WgXcQ", { lang: "fr" });
    expect(a).not.toBe(b);
  });

  test("different flags produce different key", () => {
    const a = cacheKey("dQw4w9WgXcQ", {});
    const b = cacheKey("dQw4w9WgXcQ", { timestamps: true });
    expect(a).not.toBe(b);
  });

  test("mode distinguishes transcript from summarize", () => {
    const a = cacheKey("dQw4w9WgXcQ", {});
    const b = cacheKey("dQw4w9WgXcQ", { mode: "summarize" });
    expect(a).not.toBe(b);
  });
});

describe("cacheDir", () => {
  test("returns path under /tmp/prosey with cache key", () => {
    const key = cacheKey("abc123def45", {});
    const dir = cacheDir("abc123def45", {});
    expect(dir).toBe(`/tmp/prosey/${key}`);
  });
});

describe("readCache / writeCache", () => {
  test("writes and reads a file", async () => {
    await writeCache(testDir, "test.txt", "hello world");
    const content = await readCache(testDir, "test.txt");
    expect(content).toBe("hello world");
  });

  test("returns null for missing file", async () => {
    const content = await readCache(testDir, "nonexistent.txt");
    expect(content).toBeNull();
  });

  test("creates directory on write", async () => {
    expect(existsSync(testDir)).toBe(false);
    await writeCache(testDir, "createdir.txt", "data");
    expect(existsSync(testDir)).toBe(true);
  });
});
