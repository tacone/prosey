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
  if (elapsed < 1000) return `+${elapsed.toFixed(0)}ms`;
  return `+${(elapsed / 1000).toFixed(1)}s`;
}

export function info(...args: unknown[]): void {
  if (level === "quiet") return;
  console.error(`[${stamp()}]`, ...args);
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
