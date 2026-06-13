import { describe, expect, test } from "bun:test";
import { summarize } from "./summarize";

describe("summarize", () => {
  test("strips input text from output", async () => {
    const result = await summarize({
      prompt: "Summarize this:",
      command: "cat",
      transcript: "Hello world. This is the transcript.",
    });
    expect(result).toBe("");
  });

  test("strips input text from output with empty prompt", async () => {
    const result = await summarize({
      prompt: "",
      command: "cat",
      transcript: "Just the transcript.",
    });
    expect(result).toBe("");
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
