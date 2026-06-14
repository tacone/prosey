const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

export type LogLevel = "quiet" | "normal" | "verbose";

let level: LogLevel = "normal";

export function setLevel(l: LogLevel): void {
  level = l;
}

let lastTime = performance.now();
let resumed = false;

function stamp(): string {
  const now = performance.now();
  if (resumed) {
    lastTime = now;
    resumed = false;
  }
  const elapsed = now - lastTime;
  lastTime = now;
  const text = elapsed < 1000 ? `${elapsed.toFixed(0)}ms` : `${(elapsed / 1000).toFixed(1)}s`;
  return text.padStart(5);
}

const INFO_BEFORE = "\x1b[0m\x1b[2m\x1b[1m";
const INFO_AFTER = "\x1b[0m";

export function info(...args: unknown[]): void {
  if (level === "quiet") return;
  console.error(INFO_BEFORE, `[${stamp()}]`, ...args, INFO_AFTER);
}

export function debug(...args: unknown[]): void {
  if (level !== "verbose") return;
  console.error(GRAY, `[${stamp()}]`, ...args, RESET);
}

export function startTimer(): void {
  resumed = true;
}

export function resetTimer(): void {
  lastTime = performance.now();
  resumed = false;
}

const YELLOW = "\x1b[33m";

export function hint(message: string): void {
  console.error(
    YELLOW + message + RESET + " " + GRAY + "[use prosey config to disable hints]" + RESET,
  );
}
