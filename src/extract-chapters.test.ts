import { describe, expect, test } from "bun:test";
import { extractChapters, formatChaptersAsText, formatChaptersAsJson } from "./extract-chapters";

describe("extractChapters", () => {
  test("extracts chapters from standard format", () => {
    const desc = `00:00 Intro
01:00 Karpathy's Viral Tweet
02:26 The Age of Meat Computers`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Karpathy's Viral Tweet" },
      { time: 146, title: "The Age of Meat Computers" },
    ]);
  });

  test("handles single-digit minutes (M:SS)", () => {
    const desc = `0:00 Intro
1:30 First Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 90, title: "First Topic" },
    ]);
  });

  test("handles hours (HH:MM:SS)", () => {
    const desc = `00:00:00 Start
01:30:00 Midway
02:15:45 End`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Start" },
      { time: 5400, title: "Midway" },
      { time: 8145, title: "End" },
    ]);
  });

  test("handles brackets [MM:SS]", () => {
    const desc = `[00:00] Intro
[01:00] Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles parentheses (MM:SS)", () => {
    const desc = `(00:00) Intro
(01:00) Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles dash separator", () => {
    const desc = `00:00 - Intro
01:00 - Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles en-dash separator", () => {
    const desc = `00:00 – Intro\n01:00 – Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles em-dash separator", () => {
    const desc = `00:00 — Intro\n01:00 — Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles colon separator", () => {
    const desc = `00:00: Intro\n01:00: Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("handles dot separator", () => {
    const desc = `00:00 . Intro\n01:00 . Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Topic" },
    ]);
  });

  test("strips leading whitespace", () => {
    const desc = `  00:00 Intro
    01:00 Indented Topic`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Intro" },
      { time: 60, title: "Indented Topic" },
    ]);
  });

  test("sorts by time order even if input is out of order", () => {
    const desc = `03:00 Last
01:00 Middle
00:00 First`;
    const chapters = extractChapters(desc);
    expect(chapters.map((c) => c.title)).toEqual(["First", "Middle", "Last"]);
  });

  test("deduplicates by time (keeps first)", () => {
    const desc = `01:00 First
01:00 Second
02:00 Third`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 60, title: "First" },
      { time: 120, title: "Third" },
    ]);
  });

  test("skips malformed lines", () => {
    const desc = `This is not a chapter
00:00 Real Chapter
Just some text without a timestamp
01:30 Another Chapter`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([
      { time: 0, title: "Real Chapter" },
      { time: 90, title: "Another Chapter" },
    ]);
  });

  test("skips timestamp with no title", () => {
    const desc = `00:00
01:00 Title`;
    const chapters = extractChapters(desc);
    expect(chapters).toEqual([{ time: 60, title: "Title" }]);
  });

  test("returns empty array for empty description", () => {
    expect(extractChapters("")).toEqual([]);
  });

  test("returns empty array for description with no timestamps", () => {
    const desc = `Hello world
This is a video description
With no timestamps at all`;
    expect(extractChapters(desc)).toEqual([]);
  });

  test("extracts the sample format from the user", () => {
    const desc = `00:00 Intro
01:00 Karpathy's Viral Tweet
01:41 The Overnight 11% Breakthrough
02:26 "The Age of Meat Computers Is Over"
03:03 85,000 Stars & Shopify's Results
04:07 Gary Tan & Applying It to Business
04:53 Chamath's Content Engine Use Case
05:32 How the System Works: The 3 Files
06:27 The Self-Improvement Loop Explained
07:42 701x Faster: 36,500 Experiments a Year
08:24 The 3 Must-Have Rules
10:11 The 3 Nice-to-Haves
11:51 What You Can Point It At
14:35 The One-Line Master Prompt
15:06 Live Test 1: A Faster Website (800ms to 90ms)
17:34 Live Test 2: Cold Email Subject Lines
19:55 Live Test 3: Facebook Ads on Autopilot`;
    const chapters = extractChapters(desc);
    expect(chapters).toHaveLength(17);
    expect(chapters[0]).toEqual({ time: 0, title: "Intro" });
    expect(chapters[16]).toEqual({
      time: 1195,
      title: "Live Test 3: Facebook Ads on Autopilot",
    });
  });
});

describe("formatChaptersAsJson", () => {
  test("formats chapters as key-value JSON", () => {
    const chapters = [
      { time: 0, title: "Intro" },
      { time: 90, title: "Chapter 1" },
    ];
    const result = JSON.parse(formatChaptersAsJson(chapters));
    expect(result).toEqual({ "00:00": "Intro", "01:30": "Chapter 1" });
  });

  test("formats chapters with hours", () => {
    const chapters = [{ time: 3661, title: "After 1 Hour" }];
    const result = JSON.parse(formatChaptersAsJson(chapters));
    expect(result).toEqual({ "01:01:01": "After 1 Hour" });
  });

  test("returns not available for empty chapters", () => {
    expect(formatChaptersAsJson([])).toBe("not available");
  });
});

describe("formatChaptersAsText", () => {
  test("formats chapters without hours", () => {
    const chapters = [
      { time: 0, title: "Intro" },
      { time: 90, title: "Chapter 1" },
    ];
    expect(formatChaptersAsText(chapters)).toBe("00:00 Intro\n01:30 Chapter 1");
  });

  test("formats chapters with hours", () => {
    const chapters = [
      { time: 0, title: "Start" },
      { time: 3661, title: "After 1 Hour" },
    ];
    expect(formatChaptersAsText(chapters)).toBe("00:00 Start\n01:01:01 After 1 Hour");
  });
});
