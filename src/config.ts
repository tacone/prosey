import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { load } from "js-toml";

export interface ProseyConfig {
  summarize?: {
    prompt?: string;
    command?: string;
  };
}

const DEFAULT_CONFIG_TOML = `# Default prosey configuration
# Created automatically on first run. Edit as needed.

[summarize]
# Prompt sent to the command via stdin.
# Customize this to change how transcripts are summarized.
prompt = """
Summarize the following transcript.
Focus on the key points and main arguments.
"""

# Command to execute with the prompt piped via stdin.
command = "ai summarize"
`;

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
    await writeFile(path, DEFAULT_CONFIG_TOML, "utf8");
    return {};
  }

  const raw = await readFile(path, "utf8");
  try {
    return load(raw) as ProseyConfig;
  } catch {
    return {};
  }
}
