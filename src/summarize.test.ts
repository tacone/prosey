import { describe, expect, test } from "bun:test";
import { summarize } from "./summarize";
import type { ExecuteCommand } from "./summarize";

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
    ).rejects.toThrow("No prompt configured");
  });

  test("preserves response text beyond the input", async () => {
    const result = await summarize({
      prompt: "Summarize:",
      command: "sh -c 'cat -; echo \"RESPONSE\"'",
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

  test("prompt text is included in stdin sent to the command", async () => {
    let capturedInput = "";
    const exec: ExecuteCommand = async (_cmd, input) => {
      capturedInput = input;
      return "done";
    };
    await summarize({ prompt: "TEST_PROMPT", command: "any", transcript: "SOME_TEXT" }, exec);
    expect(capturedInput).toContain("TEST_PROMPT");
    expect(capturedInput).toContain("\n\n");
    expect(capturedInput).toContain("SOME_TEXT");
  });

  test("transcript text is included in stdin along with the prompt", async () => {
    let capturedInput = "";
    const exec: ExecuteCommand = async (_cmd, input) => {
      capturedInput = input;
      return "done";
    };
    await summarize({ prompt: "PROMPT:", command: "any", transcript: "SAMPLE_TRANSCRIPT" }, exec);
    expect(capturedInput).toContain("SAMPLE_TRANSCRIPT");
  });

  test("prompt appears before transcript text in stdin", async () => {
    let capturedInput = "";
    const exec: ExecuteCommand = async (_cmd, input) => {
      capturedInput = input;
      return "done";
    };
    await summarize({ prompt: "FIRST_LINE", command: "any", transcript: "SECOND_LINE" }, exec);
    const lines = capturedInput.split("\n");
    expect(lines[0]).toBe("FIRST_LINE");
    expect(lines[lines.length - 1]).toBe("SECOND_LINE");
  });

  test("rejects when prompt is empty string", async () => {
    const exec: ExecuteCommand = async () => "some output";
    await expect(
      summarize({ prompt: "", command: "any", transcript: "text" }, exec),
    ).rejects.toThrow("No prompt configured");
  });

  test("execCommand receives the correct content via stdin", async () => {
    const exec: ExecuteCommand = async (_cmd, input) => {
      expect(input).toBe("My Prompt\n\nMy Transcript");
      return "result";
    };
    const result = await summarize(
      { prompt: "My Prompt", command: "any", transcript: "My Transcript" },
      exec,
    );
    expect(result).toBe("result");
  });

  test("strips echoed input from command output", async () => {
    // Simulate command that echoes the full input then adds response
    const exec: ExecuteCommand = async (_cmd, input) => {
      return `${input}EXTRA_RESPONSE`;
    };
    const result = await summarize({ prompt: "P", command: "any", transcript: "T" }, exec);
    expect(result).toBe("EXTRA_RESPONSE");
  });

  test("throws when execCommand returns only the input", async () => {
    const exec: ExecuteCommand = async (_cmd, input) => {
      return `${input}\n`;
    };
    await expect(summarize({ prompt: "P", command: "any", transcript: "T" }, exec)).rejects.toThrow(
      "Summarization command returned no meaningful output",
    );
  });
});
