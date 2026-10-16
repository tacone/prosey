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
  dataDir?: string;
  clipboard?: string;
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
  youtube?: {
    poToken?: string;
    visitorData?: string;
    languages?: string[];
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
    dataDir: user.dataDir ?? defaults.dataDir,
    clipboard: user.clipboard ?? defaults.clipboard,
    ai: user.ai?.command !== undefined ? user.ai : defaults.ai,
    summarize: {
      command: user.summarize?.command ?? defaults.summarize?.command,
      prompt: user.summarize?.prompt ?? defaults.summarize?.prompt,
    },
    transcribe: {
      command: user.transcribe?.command ?? defaults.transcribe?.command,
      prompt: user.transcribe?.prompt ?? defaults.transcribe?.prompt,
    },
    youtube: {
      poToken: user.youtube?.poToken ?? defaults.youtube?.poToken,
      visitorData: user.youtube?.visitorData ?? defaults.youtube?.visitorData,
      languages: user.youtube?.languages ?? defaults.youtube?.languages,
    },
  };
}

function camelizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] =
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? camelizeKeys(value as Record<string, unknown>)
        : value;
  }
  return out;
}

async function parseOrEmpty(text: string): Promise<ProseyConfig> {
  try {
    return camelizeKeys(load(text) as Record<string, unknown>) as ProseyConfig;
  } catch {
    return {};
  }
}

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "pager",
  "hints",
  "format",
  "dataDir",
  "clipboard",
  "ai",
  "summarize",
  "transcribe",
  "youtube",
]);

const SECTION_KEYS: Record<string, string[]> = {
  ai: ["command"],
  summarize: ["prompt", "command"],
  transcribe: ["prompt", "command"],
  youtube: ["poToken", "visitorData", "languages"],
};

/**
 * Config keys prosey will never read. The usual cause is a value whose section
 * header is commented out: it silently lands at the top level instead (e.g. a
 * stray `command` that belongs in [ai]).
 */
export function unusedConfigKeyWarnings(config: ProseyConfig): string[] {
  const warnings: string[] = [];

  for (const key of Object.keys(config as Record<string, unknown>)) {
    if (KNOWN_TOP_LEVEL_KEYS.has(key)) continue;

    const sections = Object.entries(SECTION_KEYS)
      .filter(([, keys]) => keys.includes(key))
      .map(([section]) => `[${section}]`);
    const where =
      sections.length > 0
        ? ` It belongs in ${sections.join(", ")} — check that the section header isn't commented out.`
        : "";

    warnings.push(`Warning: unused config key "${key}" (ignored).${where}`);
  }

  return warnings;
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
  for (const warning of unusedConfigKeyWarnings(userConfig)) {
    console.error(warning);
  }
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
      if (trimmed === "" || trimmed.startsWith("#") || /^\[[a-z][a-z0-9_-]*\]$/.test(trimmed)) {
        return line;
      }
      return line.replace(trimmed, `# ${trimmed}`);
    })
    .join("\n");
  await writeFile(path, commented, "utf8");
  return path;
}
