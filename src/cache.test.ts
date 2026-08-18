import { describe, expect, test, afterEach } from "bun:test";
import { rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  cacheKey,
  cacheDir,
  readCache,
  writeCache,
  extractVideoId,
  dataDir,
  scanDocuments,
} from "./cache";

const testDir = "/tmp/prosey-test/test-cache-spec";
const ORIGINAL_DATA_PATH = process.env.PROSEY_DATA_PATH;
const ORIGINAL_XDG_DATA = process.env.XDG_DATA_HOME;

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  if (ORIGINAL_DATA_PATH) process.env.PROSEY_DATA_PATH = ORIGINAL_DATA_PATH;
  else delete process.env.PROSEY_DATA_PATH;
  if (ORIGINAL_XDG_DATA) process.env.XDG_DATA_HOME = ORIGINAL_XDG_DATA;
  else delete process.env.XDG_DATA_HOME;
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

describe("dataDir", () => {
  test("PROSEY_DATA_PATH takes precedence", () => {
    process.env.PROSEY_DATA_PATH = "/custom/data";
    delete process.env.XDG_DATA_HOME;
    expect(dataDir()).toBe("/custom/data");
  });

  test("config dataDir argument used when set", () => {
    delete process.env.PROSEY_DATA_PATH;
    delete process.env.XDG_DATA_HOME;
    expect(dataDir("/from/config")).toBe("/from/config");
  });

  test("falls back to XDG_DATA_HOME", () => {
    delete process.env.PROSEY_DATA_PATH;
    process.env.XDG_DATA_HOME = "/custom/xdg-data";
    expect(dataDir()).toBe("/custom/xdg-data/prosey");
  });
});

describe("cacheDir", () => {
  test("returns path under the data dir with cache key", () => {
    process.env.PROSEY_DATA_PATH = "/custom/data";
    const key = cacheKey("abc123def45", {});
    const dir = cacheDir("abc123def45", {});
    expect(dir).toBe(`/custom/data/${key}`);
  });
});

describe("extractVideoId", () => {
  test("bare ID passes through", () => {
    expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("full watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=jNAAG3Ma5K8")).toBe("jNAAG3Ma5K8");
  });

  test("watch URL with extra query params", () => {
    expect(
      extractVideoId("https://www.youtube.com/watch?v=jNAAG3Ma5K8&pp=ygUKc3BhY2V4IGlwbw%3D%3D"),
    ).toBe("jNAAG3Ma5K8");
  });

  test("short youtu.be URL", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("embed URL", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("invalid URL without video ID returns null", () => {
    expect(extractVideoId("https://example.com/search?q=hello")).toBeNull();
  });
});

describe("scanDocuments", () => {
  test("lists docs with summary/transcript, reads info.json", async () => {
    const base = join(testDir, "scan");
    await mkdir(join(base, "dQw4w9WgXcQ_62d1ff1b"), { recursive: true });
    await writeFile(
      join(base, "dQw4w9WgXcQ_62d1ff1b", "info.json"),
      JSON.stringify({ title: "Never Gonna Give You Up", channel: "Rick Astley", duration: 212 }),
    );
    await writeFile(join(base, "dQw4w9WgXcQ_62d1ff1b", "summary.md"), "hello world");
    await mkdir(join(base, "not-a-cache-key"), { recursive: true });
    await writeFile(join(base, "not-a-cache-key", "summary.md"), "x");

    const docs = await scanDocuments(base);

    expect(docs).toHaveLength(1);
    expect(docs[0]!.title).toBe("Never Gonna Give You Up");
    expect(docs[0]!.channel).toBe("Rick Astley");
    expect(docs[0]!.duration).toBe(212);
    expect(docs[0]!.summary!.wordCount).toBe(2);
    expect(docs[0]!.summary!.htmlPath).toBeUndefined();
  });

  test("detects transcript-only docs and existing html", async () => {
    const base = join(testDir, "scan2");
    await mkdir(join(base, "BbovUqaQ9Cg_62d1ff1b"), { recursive: true });
    await writeFile(join(base, "BbovUqaQ9Cg_62d1ff1b", "transcript.md"), "one two three");
    await writeFile(join(base, "BbovUqaQ9Cg_62d1ff1b", "transcript.html"), "<html>");

    const docs = await scanDocuments(base);

    expect(docs).toHaveLength(1);
    expect(docs[0]!.summary).toBeUndefined();
    expect(docs[0]!.transcript!.wordCount).toBe(3);
    expect(docs[0]!.transcript!.htmlPath).toBe(
      join(base, "BbovUqaQ9Cg_62d1ff1b", "transcript.html"),
    );
  });

  test("returns [] for missing dir", async () => {
    expect(await scanDocuments(join(testDir, "nonexistent"))).toEqual([]);
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
