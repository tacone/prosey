import { describe, expect, test } from "bun:test";
import { summarize } from "./summarize";

describe("summarize", () => {
  test("pipes prompt and transcript to command and returns output", async () => {
    const result = await summarize({
      prompt: "Summarize this:",
      command: "cat",
      transcript: "Hello world. This is the transcript.",
    });
    expect(result).toBe("Summarize this:\n\nHello world. This is the transcript.");
  });

  test("preserves empty prompt", async () => {
    const result = await summarize({
      prompt: "",
      command: "cat",
      transcript: "Just the transcript.",
    });
    expect(result).toBe("\n\nJust the transcript.");
  });

  test("rejects on non-zero exit code", async () => {
    await expect(
      summarize({
        prompt: "test",
        command: "false",
        transcript: "whatever",
      }),
    ).rejects.toThrow(/exited with code 1/);
  });
});
