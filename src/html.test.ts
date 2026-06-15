import { describe, expect, test } from "bun:test";
import { generateHtml } from "./html";

describe("generateHtml", () => {
  test("wraps markdown in HTML with PicoCSS", async () => {
    const html = await generateHtml("# Hello\n\nWorld", "Test");
    expect(html).toStartWith("<!DOCTYPE html>");
    expect(html).toContain("<title>Test</title>");
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
});
