import { describe, expect, test, afterEach } from "bun:test";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildAskPayload,
  copyToClipboard,
  detectClipboard,
  documentName,
  readSummary,
  resolveDocument,
} from "./ask";

const testBase = "/tmp/prosey-test/test-ask-spec";

afterEach(async () => {
  await rm(testBase, { recursive: true, force: true });
});

describe("buildAskPayload", () => {
  test("returns the summary with a trailing newline", () => {
    expect(buildAskPayload("# Title\n\nBody")).toBe("# Title\n\nBody\n");
  });

  test("drops trailing whitespace", () => {
    expect(buildAskPayload("Body\n\n\n")).toBe("Body\n");
  });

  test("appends the question after two empty lines", () => {
    expect(buildAskPayload("Body", "What changed?")).toBe("Body\n\n\nWhat changed?\n");
  });
});

describe("documentName", () => {
  test("strips directories and trailing slashes", () => {
    expect(documentName("/data/prosey/dQw4w9WgXcQ_62d1ff1b")).toBe("dQw4w9WgXcQ_62d1ff1b");
    expect(documentName("/data/prosey/dQw4w9WgXcQ_62d1ff1b/")).toBe("dQw4w9WgXcQ_62d1ff1b");
  });
});

describe("detectClipboard", () => {
  test("uses the configured command as-is", () => {
    expect(detectClipboard("my-clip --flag")).toBe("my-clip --flag");
  });

  test("auto prefers wl-copy", () => {
    const available = ["wl-copy", "xclip", "xsel"];
    expect(detectClipboard("auto", (c) => available.includes(c))).toBe("wl-copy");
  });

  test("auto falls back to xclip", () => {
    const available = ["xclip", "xsel"];
    expect(detectClipboard("auto", (c) => available.includes(c))).toBe(
      "xclip -selection clipboard",
    );
  });

  test("auto falls back to xsel", () => {
    const available = ["xsel"];
    expect(detectClipboard("auto", (c) => available.includes(c))).toBe("xsel --clipboard --input");
  });

  test("returns null when nothing is available", () => {
    expect(detectClipboard("auto", () => false)).toBeNull();
  });

  test("auto uses real detection when not overridden", () => {
    expect(detectClipboard("auto")).toBe("wl-copy");
  });
});

describe("copyToClipboard", () => {
  test("pipes the text to the command on stdin", async () => {
    await mkdir(testBase, { recursive: true });
    const out = join(testBase, "out.txt");
    await copyToClipboard(`cat > ${out}`, "payload text");
    expect(await readFile(out, "utf8")).toBe("payload text");
  });

  test("rejects when the command fails", async () => {
    await expect(copyToClipboard("exit 3", "x")).rejects.toThrow(/exited with code 3/);
  });
});

describe("resolveDocument", () => {
  test("resolves a folder name under the data dir", async () => {
    const key = "dQw4w9WgXcQ_62d1ff1b";
    await mkdir(join(testBase, key), { recursive: true });
    const target = resolveDocument(key, testBase);
    expect(target).toEqual({ name: key, dir: join(testBase, key) });
  });

  test("accepts an existing path", async () => {
    const dir = join(testBase, "dQw4w9WgXcQ_62d1ff1b");
    await mkdir(dir, { recursive: true });
    expect(resolveDocument(dir, "/somewhere/else").dir).toBe(dir);
  });

  test("throws on an unknown document", () => {
    expect(() => resolveDocument("nope_12345678", testBase)).toThrow(/document not found/);
  });
});

describe("readSummary", () => {
  test("returns null when the folder has no summary", async () => {
    const dir = join(testBase, "dQw4w9WgXcQ_62d1ff1b");
    await mkdir(dir, { recursive: true });
    expect(await readSummary(dir)).toBeNull();
  });

  test("returns the summary content", async () => {
    const dir = join(testBase, "dQw4w9WgXcQ_62d1ff1b");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "summary.md"), "# Hi");
    expect(await readSummary(dir)).toBe("# Hi");
  });
});
