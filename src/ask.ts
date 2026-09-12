import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasCommand } from "./pager";

export const QUESTION_SEPARATOR = "\n\n\n";

export function documentName(dir: string): string {
  return (
    dir
      .replace(/[\\/]+$/, "")
      .split(/[\\/]/)
      .pop() ?? dir
  );
}

export function buildAskPayload(summary: string, question?: string): string {
  const content = summary.trimEnd();
  return question ? `${content}${QUESTION_SEPARATOR}${question}\n` : `${content}\n`;
}

export function detectClipboard(
  cfgClipboard?: string,
  has: (cmd: string) => boolean = hasCommand,
): string | null {
  if (cfgClipboard !== undefined && cfgClipboard !== "" && cfgClipboard !== "auto")
    return cfgClipboard;

  if (has("wl-copy")) return "wl-copy";
  if (has("xclip")) return "xclip -selection clipboard";
  if (has("xsel")) return "xsel --clipboard --input";
  if (has("pbcopy")) return "pbcopy";
  if (has("clip")) return "clip";
  return null;
}

export function copyToClipboard(command: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], { shell: true, stdio: ["pipe", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr!.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err: Error) => reject(err));

    proc.on("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`clipboard command exited with code ${code}: ${stderr.trim()}`));
    });

    proc.stdin!.write(text);
    proc.stdin!.end();
  });
}

export function resolveDocument(arg: string, baseDir: string): { name: string; dir: string } {
  const dir = existsSync(arg) ? arg : join(baseDir, arg);
  if (!existsSync(dir)) throw new Error(`document not found: ${arg}`);
  return { name: documentName(dir), dir };
}

export async function readSummary(dir: string): Promise<string | null> {
  const path = join(dir, "summary.md");
  if (!existsSync(path)) return null;
  return readFile(path, "utf8");
}
