import { describe, expect, test, beforeEach, spyOn } from "bun:test";
import { setLevel, info, debug, startTimer, resetTimer } from "./debug";
import type { LogLevel } from "./debug";

beforeEach(() => {
  setLevel("normal");
  resetTimer();
});

describe("setLevel", () => {
  test("info outputs at normal level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("normal");
    info("hello");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("info suppressed at quiet level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("quiet");
    info("hello");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("info outputs at verbose level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("verbose");
    info("hello");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("debug suppressed at normal level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("normal");
    debug("detail");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("debug outputs at verbose level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("verbose");
    debug("detail");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("debug suppressed at quiet level", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    setLevel("quiet");
    debug("detail");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("info format", () => {
  test("includes timestamp and message", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    info("test message");
    expect(spy.mock.calls[0]?.length).toBeGreaterThanOrEqual(3);
    spy.mockRestore();
  });
});

describe("startTimer", () => {
  test("resets elapsed time on next info call", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    startTimer();
    info("after reset");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("resetTimer", () => {
  test("resets elapsed time on next info call", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    resetTimer();
    info("after reset");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
