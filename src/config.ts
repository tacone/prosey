import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-toml";

export interface ProseyConfig {
  pager?: string;
  hints?: boolean;
  summarize?: {
    prompt?: string;
    command?: string;
  };
}

const FALLBACK_CONFIG_TOML = `# Default prosey configuration
# Created automatically on first run. Edit as needed.

# Pager command for transcript and summary output.
# Defaults to "auto": bat -lmd --style plain → glow -p → mdcat -l -p → less
# Set to a custom command (e.g. "less -R") to override.
# Can also be set via the PROSEY_PAGER env var (takes precedence).
pager = "auto"

# Show hints for missing tools (e.g. markdown highlighter).
# Can also be set via PROSEY_HINTS env var (yes, no, 1, 0, true, false).
hints = true

[summarize]
# Prompt sent to the command via stdin.
# Customize this to change how transcripts are summarized.
prompt = """
Write a comprehensive summary of the following transcription.
"""

# Command to execute with the prompt and transcript piped via stdin.
# The transcript is appended to the prompt automatically.
#
# Available options:
#
#   opencode run                    — full access (default)
#   opencode run --permissions read  — read-only (view files, no edits)
#
#   claude -p "" --print            — full access (--print for clean output)
#   claude --permission-mode plan -p "" --print  — read-only (plan/read only)
#
#   copilot -sp ""                  — full access (-s = silent, -p = prompt)
#   copilot -sp "" --deny-all-tools — read-only (no shell/write access)
#
#   codex --sandbox default -p ""   — full access
#   codex --sandbox read-only -p "" — read-only
command = "opencode run"
`;

async function readDefaultConfig(): Promise<string> {
  const paths = [
    join(dirname(fileURLToPath(import.meta.url)), "default-config.toml"),
    join(dirname(fileURLToPath(import.meta.url)), "..", "src", "default-config.toml"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return readFile(p, "utf8");
  }
  return FALLBACK_CONFIG_TOML;
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
