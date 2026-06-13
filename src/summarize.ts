import { spawn } from "node:child_process";

export interface SummarizeOptions {
  prompt: string;
  command: string;
  transcript: string;
}

function executeCommand(command: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], { shell: true, stdio: "pipe" });

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
}

export async function summarize(options: SummarizeOptions): Promise<string> {
  const { prompt, command, transcript } = options;
  const fullPrompt = `${prompt}\n\n${transcript}`;
  const output = await executeCommand(command, fullPrompt);
  return output.replace(fullPrompt, "").replace(/\n+$/, "");
}
