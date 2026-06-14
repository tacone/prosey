import { spawn } from "node:child_process";

export interface SummarizeOptions {
  prompt: string;
  command: string;
  transcript: string;
  cwd?: string;
}

export type ExecuteCommand = (command: string, input: string, cwd?: string) => Promise<string>;

export const defaultExecuteCommand: ExecuteCommand = (
  command: string,
  input: string,
  cwd?: string,
) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], { shell: true, stdio: "pipe", cwd });

    let stdout = "";
    let stderr = "";

    proc.stdout!.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr!.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command exited with code ${code}: ${stderr}`));
    });

    proc.on("error", (err: Error) => reject(err));

    proc.stdin!.write(input);
    proc.stdin!.end();
  });
};

export async function summarize(
  options: SummarizeOptions,
  execCommand: ExecuteCommand = defaultExecuteCommand,
): Promise<string> {
  const { prompt, command, transcript, cwd } = options;

  if (!prompt) {
    throw new Error("No prompt configured. A prompt is required in the config.");
  }

  const fullPrompt = `${prompt}\n\n${transcript}`;
  const output = await execCommand(command, fullPrompt, cwd);

  const cleaned = output.startsWith(fullPrompt)
    ? output.slice(fullPrompt.length).replace(/\n+$/, "")
    : output.replace(/\n+$/, "");

  if (!cleaned || cleaned === transcript) {
    throw new Error("Summarization command returned no meaningful output");
  }

  return cleaned;
}
