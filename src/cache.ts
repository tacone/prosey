import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const RE_YOUTUBE =
  /(?:v=|\/|v\/|embed\/|watch\?.*v=|youtu\.be\/|\/v\/|e\/|watch\?.*vi?=|\/embed\/|\/v\/|vi?\/|watch\?.*vi?=|youtu\.be\/|\/vi?\/|\/e\/)([a-zA-Z0-9_-]{11})/i;
const RE_BARE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function extractVideoId(input: string): string | null {
  if (RE_BARE_ID.test(input)) return input;
  const match = input.match(RE_YOUTUBE);
  if (match) return match[1] || null;
  return null;
}

export interface CacheOptions {
  lang?: string;
  timestamps?: boolean;
  json?: boolean;
  noDecode?: boolean;
  mode?: string;
}

function hashOptions(opts: CacheOptions): string {
  return createHash("sha256").update(JSON.stringify(opts)).digest("hex").slice(0, 8);
}

export function cacheKey(videoId: string, opts: CacheOptions): string {
  return `${videoId}_${hashOptions(opts)}`;
}

export function dataDir(configDataDir?: string): string {
  const env = process.env.PROSEY_DATA_PATH;
  if (env) return env;
  if (configDataDir) return configDataDir;
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return join(xdg, "prosey");
  return join(homedir(), ".local", "share", "prosey");
}

export function cacheDir(videoId: string, opts: CacheOptions, baseDir?: string): string {
  return join(baseDir ?? dataDir(), cacheKey(videoId, opts));
}

export async function readCache(dir: string, filename: string): Promise<string | null> {
  try {
    return await readFile(join(dir, filename), "utf8");
  } catch {
    return null;
  }
}

export async function writeCache(dir: string, filename: string, data: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), data, "utf8");
}
