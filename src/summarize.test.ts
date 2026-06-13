import { describe, expect, test } from "bun:test";
import { summarize } from "./summarize";

describe("summarize", () => {
  test("rejects when command only echoes input", async () => {
    await expect(
      summarize({
        prompt: "Summarize this:",
        command: "cat",
        transcript: "Hello world. This is the transcript.",
      }),
    ).rejects.toThrow("Summarization command returned no meaningful output");
  });

  test("rejects when command only echoes input with empty prompt", async () => {
    await expect(
      summarize({
        prompt: "",
        command: "cat",
        transcript: "Just the transcript.",
      }),
    ).rejects.toThrow("Summarization command returned no meaningful output");
  });

  test("preserves response text beyond the input", async () => {
    const cmd = "sh -c 'cat -; echo \"RESPONSE\"'";
    const result = await summarize({
      prompt: "Summarize:",
      command: cmd,
      transcript: "Transcript text.",
    });
    expect(result).toBe("RESPONSE");
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
