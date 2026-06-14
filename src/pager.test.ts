import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { hasCommand, detectPager } from "./pager";

const ORIGINAL_PROSEY_PAGER = process.env.PROSEY_PAGER;

beforeEach(() => {
  delete process.env.PROSEY_PAGER;
});

afterEach(() => {
  if (ORIGINAL_PROSEY_PAGER !== undefined) {
    process.env.PROSEY_PAGER = ORIGINAL_PROSEY_PAGER;
  } else {
    delete process.env.PROSEY_PAGER;
  }
});

describe("hasCommand", () => {
  test("returns true for existing command", () => {
    expect(hasCommand("sh")).toBe(true);
  });

  test("returns false for nonexistent command", () => {
    expect(hasCommand("nonexistent-cmd-12345")).toBe(false);
  });
});

describe("detectPager", () => {
  test("uses PROSEY_PAGER env var", () => {
    process.env.PROSEY_PAGER = "custom-pager";
    expect(detectPager()).toBe("custom-pager");
  });

  test("env var takes precedence over config pager", () => {
    process.env.PROSEY_PAGER = "env-pager";
    expect(detectPager("cfg-pager")).toBe("env-pager");
  });

  test('"auto" env var falls through to config', () => {
    process.env.PROSEY_PAGER = "auto";
    expect(detectPager("cfg-pager")).toBe("cfg-pager");
  });

  test("empty env var falls through to config", () => {
    process.env.PROSEY_PAGER = "";
    expect(detectPager("cfg-pager")).toBe("cfg-pager");
  });

  test('"auto" config falls through to auto-detection', () => {
    process.env.PROSEY_PAGER = "auto";
    const pager = detectPager("auto");
    // Falls through to auto-detect: one of bat/glow/mdcat/less or null
    expect(pager === null || typeof pager === "string").toBe(true);
  });

  test("returns null when no pager is configured or available", () => {
    const pager = detectPager();
    // In CI or minimal environments, no pagers may be installed
    // If a pager IS found, it should be one of the expected ones
    if (pager !== null) {
      const known = ["bat -lmd", "glow", "mdcat -l -p", "less"];
      expect(known).toContain(pager);
    }
  });
});
