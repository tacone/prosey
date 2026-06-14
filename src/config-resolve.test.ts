import { describe, expect, test } from "bun:test";
import {
  resolveSummarizeCmd,
  resolveSummarizePrompt,
  resolveTranscribeCmd,
  resolveTranscribePrompt,
} from "./config-resolve";
import type { ProseyConfig } from "./config";

describe("resolveSummarizeCmd", () => {
  test("returns summarize.command when present", () => {
    const config: ProseyConfig = {
      summarize: { command: "my-sum-cmd", prompt: "x" },
      ai: { command: "ai-cmd" },
    };
    expect(resolveSummarizeCmd(config)).toBe("my-sum-cmd");
  });

  test("falls back to ai.command when summarize.command is missing", () => {
    const config: ProseyConfig = {
      summarize: { prompt: "x" },
      ai: { command: "ai-cmd" },
    };
    expect(resolveSummarizeCmd(config)).toBe("ai-cmd");
  });

  test("returns null when no command is configured", () => {
    const config: ProseyConfig = {};
    expect(resolveSummarizeCmd(config)).toBeNull();
  });
});

describe("resolveTranscribeCmd", () => {
  test("returns transcribe.command when present", () => {
    const config: ProseyConfig = {
      transcribe: { command: "my-transcribe-cmd", prompt: "x" },
      ai: { command: "ai-cmd" },
    };
    expect(resolveTranscribeCmd(config)).toBe("my-transcribe-cmd");
  });

  test("falls back to ai.command when transcribe.command is missing", () => {
    const config: ProseyConfig = {
      ai: { command: "ai-cmd" },
      transcribe: { prompt: "x" },
    };
    expect(resolveTranscribeCmd(config)).toBe("ai-cmd");
  });

  test("falls back to summarize.command when both transcribe and ai are missing", () => {
    const config: ProseyConfig = {
      summarize: { command: "old-sum-cmd", prompt: "x" },
    };
    expect(resolveTranscribeCmd(config)).toBe("old-sum-cmd");
  });

  test("returns null when no command is configured", () => {
    const config: ProseyConfig = {};
    expect(resolveTranscribeCmd(config)).toBeNull();
  });
});

describe("resolveTranscribePrompt", () => {
  test("returns transcribe.prompt when present", () => {
    const config: ProseyConfig = {
      transcribe: { prompt: "my-transcribe-prompt" },
    };
    expect(resolveTranscribePrompt(config)).toBe("my-transcribe-prompt");
  });

  test("falls back to summarize.prompt when transcribe.prompt is missing", () => {
    const config: ProseyConfig = {
      summarize: { prompt: "my-sum-prompt" },
    };
    expect(resolveTranscribePrompt(config)).toBe("my-sum-prompt");
  });

  test("returns null when neither transcribe nor summarize prompts exist", () => {
    const config: ProseyConfig = {};
    expect(resolveTranscribePrompt(config)).toBeNull();
  });

  test("transcribe.prompt takes precedence over summarize.prompt", () => {
    const config: ProseyConfig = {
      transcribe: { prompt: "trans-prompt" },
      summarize: { prompt: "sum-prompt" },
    };
    expect(resolveTranscribePrompt(config)).toBe("trans-prompt");
  });
});

describe("resolveSummarizePrompt", () => {
  test("returns summarize.prompt when present", () => {
    const config: ProseyConfig = {
      summarize: { prompt: "my-sum-prompt" },
    };
    expect(resolveSummarizePrompt(config)).toBe("my-sum-prompt");
  });

  test("returns null when summarize.prompt is missing", () => {
    const config: ProseyConfig = {};
    expect(resolveSummarizePrompt(config)).toBeNull();
  });
});
