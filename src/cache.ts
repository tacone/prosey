import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const RE_YOUTUBE =
  /(?:v=|\/|v\/|embed\/|watch\?.*v=|youtu\.be\/|\/v\/|e\/|watch\?.*vi?=|\/embed\/|\/v\/|vi?\/|watch\?.*vi?=|youtu\.be\/|\/vi?\/|\/e\/)([a-zA-Z0-9_-]{11})/i;
const RE_BARE_ID = /^[a-zA-Z0-9_-]{11}$/;
const RE_CACHE_KEY = /^[a-zA-Z0-9_-]{11}_[0-9a-f]{8}$/;

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

export interface CachedItem {
  mdPath: string;
  htmlPath?: string;
  mtime: number;
  wordCount: number;
}

export interface CachedDocument {
  dir: string;
  title: string;
  channel?: string;
  channelId?: string;
  channelDescription?: string;
  duration: number;
  summary?: CachedItem;
  transcript?: CachedItem;
}

export async function scanDocuments(baseDir: string): Promise<CachedDocument[]> {
  let entries;
  try {
    entries = await readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const docs: CachedDocument[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !RE_CACHE_KEY.test(entry.name)) continue;
    const dir = join(baseDir, entry.name);
    const doc: CachedDocument = { dir, title: entry.name, duration: 0 };

    const infoRaw = await readFile(join(dir, "info.json"), "utf8").catch(() => null);
    if (infoRaw) {
      try {
        const info = JSON.parse(infoRaw);
        doc.title = info.title ?? doc.title;
        doc.channel = info.channel;
        doc.channelId = info.channelId;
        doc.channelDescription = info.channelDescription;
        doc.duration = info.duration ?? 0;
      } catch {
        // keep folder-name fallback
      }
    }

    for (const kind of ["summary", "transcript"] as const) {
      const mdPath = join(dir, `${kind}.md`);
      const mdStat = await stat(mdPath).catch(() => null);
      if (!mdStat) continue;
      const item: CachedItem = {
        mdPath,
        htmlPath: existsSync(join(dir, `${kind}.html`)) ? join(dir, `${kind}.html`) : undefined,
        mtime: mdStat.mtimeMs,
        wordCount: 0,
      };
      const md = await readFile(mdPath, "utf8").catch(() => "");
      item.wordCount = md.split(/\s+/).filter(Boolean).length;
      if (kind === "summary") doc.summary = item;
      else doc.transcript = item;
    }

    if (doc.summary || doc.transcript) docs.push(doc);
  }

  return docs;
}
