import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

export function cacheDir(videoId: string, opts: CacheOptions): string {
  return join("/tmp", "prosey", cacheKey(videoId, opts));
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
