import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-toml";

export interface ProseyConfig {
  summarize?: {
    prompt?: string;
    command?: string;
  };
}

async function readDefaultConfig(): Promise<string> {
  const local = join(dirname(fileURLToPath(import.meta.url)), "default-config.toml");
  if (existsSync(local)) return readFile(local, "utf8");
  return readFile(
    join(dirname(fileURLToPath(import.meta.url)), "..", "src", "default-config.toml"),
    "utf8",
  );
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

export async function loadConfig(): Promise<ProseyConfig> {
  const path = configPath();

  if (!existsSync(path)) {
    const dir = configDir();
    await ensureDir(dir);
    await writeFile(path, await readDefaultConfig(), "utf8");
    return {};
  }

  const raw = await readFile(path, "utf8");
  try {
    return load(raw) as ProseyConfig;
  } catch {
    return {};
  }
}

export async function resetConfig(): Promise<string> {
  const path = configPath();
  const dir = configDir();
  await ensureDir(dir);
  await writeFile(path, await readDefaultConfig(), "utf8");
  return path;
}
