import { describe, expect, test } from "bun:test";
import type { TranscriptSegment } from "youtube-transcript-plus";
import { formatTime, decodeEntities, formatWithTimestamps, toText, toJSON } from "./format";

const segments: TranscriptSegment[] = [
  { text: "Hello world", offset: 1.5, duration: 2.0, lang: "en" },
  { text: "This is &#39;text&#39;", offset: 10, duration: 3.0, lang: "en" },
  { text: "Line three", offset: 60, duration: 5.0, lang: "en" },
];

describe("formatTime", () => {
  test("zero", () => expect(formatTime(0)).toBe("00:00"));
  test("seconds only", () => expect(formatTime(5)).toBe("00:05"));
  test("minute boundary", () => expect(formatTime(60)).toBe("01:00"));
  test("minutes and seconds", () => expect(formatTime(65)).toBe("01:05"));
  test("long duration", () => expect(formatTime(3661)).toBe("61:01"));
  test("fractional truncated", () => expect(formatTime(90.7)).toBe("01:30"));
});

describe("decodeEntities", () => {
  test("plain text unchanged", () => expect(decodeEntities("hello")).toBe("hello"));
  test("apostrophe", () => expect(decodeEntities("&#39;")).toBe("'"));
  test("ampersand", () => expect(decodeEntities("&amp;")).toBe("&"));
  test("multiple entities", () =>
    expect(decodeEntities("&#39;hello&#39; &amp; &#39;world&#39;")).toBe("'hello' & 'world'"));
  test("numeric entity", () => expect(decodeEntities("&#38;")).toBe("&"));
});

describe("formatWithTimestamps", () => {
  test("includes timestamps and decodes by default", () => {
    const result = formatWithTimestamps(segments, true);
    expect(result).toBe("[00:01] Hello world\n[00:10] This is 'text'\n[01:00] Line three");
  });

  test("skips decoding when false", () => {
    const result = formatWithTimestamps(segments, false);
    expect(result).toBe("[00:01] Hello world\n[00:10] This is &#39;text&#39;\n[01:00] Line three");
  });
});

describe("toText", () => {
  test("joins segments with space and decodes", () => {
    const result = toText(segments, true);
    expect(result).toBe("Hello world This is 'text' Line three");
  });

  test("skips decoding when false", () => {
    const result = toText(segments, false);
    expect(result).toBe("Hello world This is &#39;text&#39; Line three");
  });
});

describe("toJSON", () => {
  test("includes all fields and always has timestamp", () => {
    const result = JSON.parse(toJSON(segments, true));
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      text: "Hello world",
      offset: 1.5,
      duration: 2.0,
      timestamp: "00:01",
    });
  });

  test("decodes entities by default", () => {
    const result = JSON.parse(toJSON(segments, true));
    expect(result[1].text).toBe("This is 'text'");
  });

  test("preserves entities when decode is false", () => {
    const result = JSON.parse(toJSON(segments, false));
    expect(result[1].text).toBe("This is &#39;text&#39;");
  });
});
