import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-toml";

export interface ProseyConfig {
  pager?: string;
  hints?: boolean;
  format?: string;
  ai?: {
    command?: string;
  };
  summarize?: {
    prompt?: string;
    command?: string;
  };
  transcribe?: {
    prompt?: string;
    command?: string;
  };
}

async function readDefaultConfig(): Promise<string> {
  const paths = [
    join(dirname(fileURLToPath(import.meta.url)), "default-config.toml"),
    join(dirname(fileURLToPath(import.meta.url)), "..", "src", "default-config.toml"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return readFile(p, "utf8");
  }
  throw new Error("default-config.toml not found");
}

function configDir(): string {
  const env = process.env.XDG_CONFIG_HOME;
  if (env) return join(env, "prosey");
  return join(homedir(), ".config", "prosey");
}

export function configPath(): string {
  return process.env.PROSEY_CONFIG_PATH ?? join(configDir(), "config.toml");
}

function ensureDir(path: string): Promise<void> {
  return mkdir(path, { recursive: true }) as Promise<void>;
}

export function mergeOverDefaults(user: ProseyConfig, defaults: ProseyConfig): ProseyConfig {
  return {
    pager: user.pager ?? defaults.pager,
    hints: user.hints ?? defaults.hints,
    format: user.format ?? defaults.format,
    ai: user.ai?.command !== undefined ? user.ai : defaults.ai,
    summarize: {
      command: user.summarize?.command ?? defaults.summarize?.command,
      prompt: user.summarize?.prompt ?? defaults.summarize?.prompt,
    },
    transcribe: {
      command: user.transcribe?.command ?? defaults.transcribe?.command,
      prompt: user.transcribe?.prompt ?? defaults.transcribe?.prompt,
    },
  };
}

async function parseOrEmpty(text: string): Promise<ProseyConfig> {
  try {
    return load(text) as ProseyConfig;
  } catch {
    return {};
  }
}

export async function loadConfig(): Promise<ProseyConfig> {
  const defaultConfig = await parseOrEmpty(await readDefaultConfig());
  const path = configPath();

  if (!existsSync(path)) {
    const dir = configDir();
    await ensureDir(dir);
    await writeFile(path, await readDefaultConfig(), "utf8");
    return defaultConfig;
  }

  const userConfig = await parseOrEmpty(await readFile(path, "utf8"));
  return mergeOverDefaults(userConfig, defaultConfig);
}

export async function resetConfig(): Promise<string> {
  const path = configPath();
  const dir = configDir();
  await ensureDir(dir);
  const raw = await readDefaultConfig();
  const commented = raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) return line;
      return line.replace(trimmed, `# ${trimmed}`);
    })
    .join("\n");
  await writeFile(path, commented, "utf8");
  return path;
}
