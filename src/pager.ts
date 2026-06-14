import { execSync } from "node:child_process";

export function hasCommand(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function detectPager(cfgPager?: string): string | null {
  const env = process.env.PROSEY_PAGER;
  if (env !== undefined && env !== "" && env !== "auto") return env;

  if (cfgPager !== undefined && cfgPager !== "" && cfgPager !== "auto") return cfgPager;

  if (hasCommand("bat")) return "bat -lmd --style plain";
  if (hasCommand("glow")) return "glow -p";
  if (hasCommand("mdcat")) return "mdcat -l -p";
  if (hasCommand("less")) return "less";
  return null;
}
