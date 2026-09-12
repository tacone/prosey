import { describe, expect, test, afterEach } from "bun:test";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { generateHtml, generateIndexHtml, rebuildIndex, renderAll } from "./html";
import type { CachedDocument } from "./cache";

const testBase = join(import.meta.dir, "..", "tmp-test-data");
const META_SEP = '<span style="opacity: 0.4">&nbsp;&nbsp;|&nbsp;&nbsp;</span>';

afterEach(async () => {
  await rm(testBase, { recursive: true, force: true });
});

function doc(over: Partial<CachedDocument> = {}): CachedDocument {
  return {
    dir: "/tmp/prosey-test/html/dQw4w9WgXcQ_62d1ff1b",
    title: "Never Gonna Give You Up",
    channel: "Rick Astley",
    duration: 212,
    summary: { mdPath: "summary.md", mtime: 1000, wordCount: 200 },
    ...over,
  };
}

describe("generateHtml", () => {
  test("wraps markdown in HTML with PicoCSS", async () => {
    const html = await generateHtml("# Hello\n\nWorld", "Test");
    expect(html).toStartWith("<!DOCTYPE html>");
    expect(html).toContain("<title>Test - Prosey</title>");
    expect(html).toContain("<style>");
    expect(html).toContain("--pico-");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<p>World</p>");
    expect(html).toContain("</html>");
  });

  test("uses default title when none given", async () => {
    const html = await generateHtml("hello");
    expect(html).toContain("<title>Prosey</title>");
  });

  test("escapes HTML in title", async () => {
    const html = await generateHtml("hello", '<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  test("logo links to the index", async () => {
    const html = await generateHtml("# Hi", "T");
    expect(html).toContain('<a href="../index.html"');
    expect(html).toContain('alt="Prosey"');
  });

  test("adds the copy link and payload when given one", async () => {
    const html = await generateHtml(
      "# Hi",
      "T",
      { videoId: "dQw4w9WgXcQ", duration: 212, wordCount: 200, channelName: "Rick Astley" },
      "# Hi\n",
    );
    expect(html).toContain('id="ask-btn"');
    expect(html).toContain(">Copy</button>");
    expect(html).toContain('<script type="application/json" id="ask-payload">');
    expect(html).not.toContain("ask-menu");
    expect(html).not.toContain("chatgpt.com");
    expect(html).not.toContain("claude.ai");

    // channel | watch | read | Copy — one separator each, same spacing
    expect(html.split(META_SEP).length - 1).toBe(3);
    const readTime = html.indexOf("min read");
    expect(readTime).toBeGreaterThan(-1);
    expect(html.slice(readTime, html.indexOf('<span id="ask-wrap">'))).toContain(META_SEP);
    expect(html.indexOf('id="theme-btn"')).toBeGreaterThan(html.indexOf('id="ask-btn"'));
  });

  test("omits the copy link without a payload", async () => {
    const html = await generateHtml("# Hi", "T");
    expect(html).not.toContain('id="ask-btn"');
    expect(html).not.toContain('id="ask-payload"');
  });

  test("escapes markup inside the payload", async () => {
    const html = await generateHtml("# Hi", "T", undefined, "</script><b>x</b>");
    expect(html).not.toContain("</script><b>");
    expect(html).toContain("\\u003c/script>");
  });
});

describe("generateIndexHtml", () => {
  test("lists documents with badges and meta", async () => {
    const html = await generateIndexHtml([doc()]);
    expect(html).toContain("<title>Index - Prosey</title>");
    expect(html).toContain("Never Gonna Give You Up");
    expect(html).toContain("Rick Astley");
    expect(html).toContain('href="dQw4w9WgXcQ_62d1ff1b/summary.md"');
    expect(html).toContain("[Summary]");
    expect(html).toContain("1 document");
    expect(html).not.toContain('<a href="../index.html"');
    expect(html).not.toContain("<h1>Index</h1>");
    expect(html).not.toContain("<article");
    expect(html).not.toContain('id="ask-btn"');
  });

  test("links to html pages and both badges when present", async () => {
    const html = await generateIndexHtml([
      doc({
        duration: 180,
        summary: { mdPath: "summary.md", htmlPath: "summary.html", mtime: 1000, wordCount: 200 },
        transcript: {
          mdPath: "transcript.md",
          htmlPath: "transcript.html",
          mtime: 2000,
          wordCount: 500,
        },
      }),
    ]);
    expect(html).toContain('href="dQw4w9WgXcQ_62d1ff1b/summary.html"');
    expect(html).toContain('href="dQw4w9WgXcQ_62d1ff1b/transcript.html"');
    expect(html).toContain("[Transcript]");
    expect(html).toContain("3 min watch");
    expect(html).toContain("3 min read");
    expect(html).toContain("&nbsp;&nbsp;|&nbsp;&nbsp;");
  });

  test("sorts newest first", async () => {
    const html = await generateIndexHtml([
      doc({ title: "OlderVideoTitle", summary: { mdPath: "s.md", mtime: 1000, wordCount: 1 } }),
      doc({ title: "NewerVideoTitle", summary: { mdPath: "s.md", mtime: 2000, wordCount: 1 } }),
    ]);
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    expect(main.indexOf("NewerVideoTitle")).toBeLessThan(main.indexOf("OlderVideoTitle"));
  });
});

describe("rebuildIndex", () => {
  test("renders missing html pages and writes index.html", async () => {
    const base = testBase;
    const key = "dQw4w9WgXcQ_62d1ff1b";
    await mkdir(join(base, key), { recursive: true });
    await writeFile(
      join(base, key, "info.json"),
      JSON.stringify({ title: "Test Video", channel: "Chan", duration: 60 }),
    );
    await writeFile(join(base, key, "summary.md"), "# Hello\n\nWorld");

    const indexPath = await rebuildIndex(base);

    expect(indexPath).toBe(join(base, "index.html"));
    expect(existsSync(join(base, key, "summary.html"))).toBe(true);
    const indexHtml = await readFile(indexPath!, "utf8");
    expect(indexHtml).toContain("Test Video");
    expect(indexHtml).toContain("[Summary]");
  });

  test("adds the ask menu to summary pages only", async () => {
    const base = testBase;
    const key = "dQw4w9WgXcQ_62d1ff1b";
    await mkdir(join(base, key), { recursive: true });
    await writeFile(join(base, key, "summary.md"), "# Summary");
    await writeFile(join(base, key, "transcript.md"), "# Transcript");

    await rebuildIndex(base);

    const summary = await readFile(join(base, key, "summary.html"), "utf8");
    const transcript = await readFile(join(base, key, "transcript.html"), "utf8");
    expect(summary).toContain('id="ask-btn"');
    expect(summary).toContain("Summary");
    expect(transcript).toContain("<h1>Transcript</h1>");
    expect(transcript).not.toContain('id="ask-btn"');
  });

  test("regenerates stale html pages but keeps fresh ones", async () => {
    const base = testBase;
    const staleKey = "dQw4w9WgXcQ_62d1ff1b";
    const freshKey = "BbovUqaQ9Cg_62d1ff1b";
    await mkdir(join(base, staleKey), { recursive: true });
    await mkdir(join(base, freshKey), { recursive: true });
    await writeFile(join(base, staleKey, "summary.md"), "# Stale");
    await writeFile(join(base, staleKey, "summary.html"), "<html>old, no marker</html>");
    await writeFile(join(base, freshKey, "transcript.md"), "# Fresh");
    await writeFile(
      join(base, freshKey, "transcript.html"),
      "<!-- generated by prosey:content-v3 -->KEEP ME",
    );

    await rebuildIndex(base);

    const stale = await readFile(join(base, staleKey, "summary.html"), "utf8");
    expect(stale).toContain("generated by prosey:content-v3");
    const fresh = await readFile(join(base, freshKey, "transcript.html"), "utf8");
    expect(fresh).toContain("KEEP ME");
  });
});

describe("renderAll", () => {
  test("regenerates every html page and the index", async () => {
    const base = testBase;
    const key = "dQw4w9WgXcQ_62d1ff1b";
    await mkdir(join(base, key), { recursive: true });
    await writeFile(join(base, key, "info.json"), JSON.stringify({ title: "Test Video" }));
    await writeFile(join(base, key, "summary.md"), "# Hello\n\nWorld");
    await writeFile(join(base, key, "summary.html"), "<!-- generated by prosey:content-v3 -->OLD");

    const pages = await renderAll(base);

    expect(pages).toBe(1);
    const html = await readFile(join(base, key, "summary.html"), "utf8");
    expect(html).toContain("generated by prosey:content-v3");
    expect(html).not.toContain("OLD");
    expect(html).toContain("<h1>Hello</h1>");
    expect(existsSync(join(base, "index.html"))).toBe(true);
  });
});
