const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

let enabled = false;

export function enableDebug(): void {
  enabled = true;
}

export function debug(...args: unknown[]): void {
  if (!enabled) return;
  console.error(GRAY, ...args, RESET);
}
