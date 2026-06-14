#!/usr/bin/env node

import { setLevel, info, debug, startTimer, resetTimer, hint } from "./debug";
import type { LogLevel } from "./debug";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { detectPager } from "./pager";
import { fetchTranscript, listLanguages } from "youtube-transcript-plus";
import type { CaptionTrackInfo, VideoDetails, TranscriptSegment } from "youtube-transcript-plus";
import { formatWithTimestamps, toText, toJSON, formatDuration, decodeEntities } from "./format";
import { loadConfig, resetConfig, configPath } from "./config";
import type { ProseyConfig } from "./config";
import { summarize } from "./summarize";
import { cacheDir, readCache, writeCache, extractVideoId } from "./cache";
import { checkVersion } from "./version-check";
import pkg from "../package.json";
import prettier from "prettier";

const NAME = "prosey";
const VERSION = pkg.version;

let latestVersion: string | null = null;
const versionCheck = checkVersion().then((v) => {
  latestVersion = v;
});

function exitProcess(code: number): never {
  if (useHints && code === 0 && latestVersion && latestVersion !== VERSION) {
    hint(
      `📦 New version available: ${latestVersion} — use npm/pnpm/bun -g i ${pkg.name} to upgrade`,
    );
  }
  process.exit(code);
}

function help(): string {
  return `${NAME} v${VERSION}

Usage: ${NAME} [options] <video-url-or-id>
       ${NAME} read [options] <video-url-or-id>
       ${NAME} info [options] <video-url-or-id>
       ${NAME} summarize [options] <video-url-or-id>
       ${NAME} config

Download a YouTube video transcript or show video details.

Commands:
  read                  Download and print a transcript (default command)
  info                  Show video metadata (title, channel, duration, etc.)
  summarize             Pipe transcript to the command configured in [summarize]
  config                Open config file in \$EDITOR

Arguments:
  video-url-or-id        YouTube URL (full or short) or bare video ID

Options:
  --lang <code>          Language code (e.g. en, fr). Auto-detect if omitted.
  -t, --timestamps       Include timestamps [MM:SS] in output.
  --list                 List available transcript languages and exit.
  -o, --output <path>    Write output to file instead of stdout.
  --json                 Output as JSON (suppresses details).
  --text                 Output as plain text (default).
  --details              Prepend video details to transcript (default, text only).
  --no-details           Suppress video details, transcript only.
  --no-decode-entities   Preserve HTML entities (decoded by default).
  --reset-config         Reset config file to defaults and exit.
  --no-cache             Skip cache and overwrite cache files.
  --no-format            Skip prettier formatting.
  --no-pager             Disable pager for stdout output.
  --pager                Use pager for stdout output (default).
  --no-hints             Disable hints.
  --hints                Show hints (default).
  -q, --quiet            Suppress all stderr logging.
  -v, --verbose          Print debug information to stderr.
  --help                 Show this help message.
  --version              Show version.

Examples:
  ${NAME} dQw4w9WgXcQ
  ${NAME} https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang es
  ${NAME} dQw4w9WgXcQ -t -o transcript.txt
  ${NAME} dQw4w9WgXcQ --list
  ${NAME} dQw4w9WgXcQ --json
  ${NAME} dQw4w9WgXcQ --no-details
  ${NAME} info dQw4w9WgXcQ`;
}

function formatDetailsBlock(details: VideoDetails): string {
  const lines: string[] = [
    `Title:    ${decodeEntities(details.title)}`,
    `Channel:  ${details.author}`,
    `Duration: ${formatDuration(details.lengthSeconds)}`,
    `Views:    ${details.viewCount.toLocaleString()}`,
  ];

  if (details.description) {
    const desc =
      details.description.length > 500
        ? details.description.slice(0, 500) + "…"
        : details.description;
    lines.push(`Description:\n  ${desc.replace(/\n/g, "\n  ")}`);
  }

  return lines.join("\n");
}

function printVideoInfo(details: VideoDetails): void {
  const w = Math.max(
    "Title:".length,
    "Channel:".length,
    "Duration:".length,
    "Views:".length,
    "Video ID:".length,
    "Channel ID:".length,
    "Keywords:".length,
    "Description:".length,
  );
  const pad = (s: string) => s.padEnd(w);

  const lines: string[] = [
    `${pad("Title:")}      ${decodeEntities(details.title)}`,
    `${pad("Channel:")}    ${details.author}`,
    `${pad("Duration:")}   ${formatDuration(details.lengthSeconds)}`,
    `${pad("Views:")}      ${details.viewCount.toLocaleString()}`,
    `${pad("Video ID:")}   ${details.videoId}`,
    `${pad("Channel ID:")} ${details.channelId}`,
  ];

  if (details.keywords.length > 0) {
    lines.push(`${pad("Keywords:")}   ${details.keywords.join(", ")}`);
  }

  if (details.description) {
    lines.push(`${pad("Description:")}`);
    const descLines = details.description.split("\n").filter(Boolean);
    for (const line of descLines) {
      lines.push(`  ${line}`);
    }
  }

  console.log(lines.join("\n"));
}

function printLanguages(languages: CaptionTrackInfo[]): void {
  const rows = languages.map((l) => {
    const auto = l.isAutoGenerated ? " (auto-generated)" : "";
    return `  ${l.languageCode.padEnd(8)}${l.languageName}${auto}`;
  });
  console.log(`Available transcripts (${languages.length}):\n${rows.join("\n")}`);
}

async function formatMd(text: string): Promise<string> {
  try {
    return await prettier.format(text, { parser: "markdown" });
  } catch {
    return text;
  }
}

async function outputText(text: string): Promise<void> {
  if (outputPath) {
    await writeFile(outputPath, text, "utf8");
    return;
  }

  if (!pagerCmd || !process.stdout.isTTY) {
    process.stdout.write(text);
    return;
  }

  const parts = pagerCmd.split(/\s+/);
  const proc = spawn(parts[0]!, parts.slice(1), {
    stdio: ["pipe", "inherit", "inherit"],
  }) as import("node:child_process").ChildProcess;

  await new Promise<void>((resolve) => {
    let done = false;
    proc.on("error", () => {
      if (done) return;
      done = true;
      process.stdout.write(text);
      resolve();
    });
    proc.on("exit", () => {
      if (done) return;
      done = true;
      resolve();
    });
    proc.stdin!.write(text);
    proc.stdin!.end();
  });
}

let pagerCmd: string | null = null;

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  console.log(help());
  exitProcess(0);
}

if (args.includes("--version")) {
  console.log(VERSION);
  exitProcess(0);
}

if (args.includes("--reset-config")) {
  const path = await resetConfig();
  console.log(`Config reset to defaults: ${path}`);
  exitProcess(0);
}

const config: ProseyConfig = await loadConfig().catch(() => ({}) as ProseyConfig);

let mode = "read";
const subcmdIndex = args.findIndex(
  (a) => a === "info" || a === "summarize" || a === "config" || a === "read",
);
if (subcmdIndex !== -1) {
  mode = args[subcmdIndex]!;
  args.splice(subcmdIndex, 1);
}

let videoId = "";
let lang: string | undefined;
let timestamps = false;
let listOnly = false;
let outputPath: string | undefined;
let outputJson = false;
let noDecode = false;
let showDetails = true;
let noCache = false;
let noFormat = false;
let usePager = true;
let useHints = true;
let logLevel: LogLevel = "normal";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg) continue;
  if (arg === "--lang") {
    lang = args[++i] ?? undefined;
    if (!lang) {
      console.error("Error: --lang requires a language code");
      exitProcess(1);
    }
  } else if (arg === "--timestamps" || arg === "-t") {
    timestamps = true;
  } else if (arg === "--list") {
    listOnly = true;
  } else if (arg === "-o" || arg === "--output") {
    outputPath = args[++i] ?? undefined;
    if (!outputPath) {
      console.error("Error: -o/--output requires a file path");
      exitProcess(1);
    }
  } else if (arg === "--json") {
    outputJson = true;
  } else if (arg === "--text") {
    outputJson = false;
  } else if (arg === "--details") {
    showDetails = true;
  } else if (arg === "--no-details") {
    showDetails = false;
  } else if (arg === "--no-cache") {
    noCache = true;
  } else if (arg === "--no-format") {
    noFormat = true;
  } else if (arg === "--no-pager") {
    usePager = false;
  } else if (arg === "--pager") {
    usePager = true;
  } else if (arg === "--no-hints") {
    useHints = false;
  } else if (arg === "--hints") {
    useHints = true;
  } else if (arg === "--quiet" || arg === "-q") {
    logLevel = "quiet";
  } else if (arg === "--verbose" || arg === "-v") {
    logLevel = "verbose";
  } else if (arg === "--no-decode-entities") {
    noDecode = true;
  } else if (arg.startsWith("-")) {
    console.error(`Unknown option: ${arg}`);
    exitProcess(1);
  } else {
    videoId = arg;
  }
}

if (mode === "config") {
  const path = configPath();
  const editor = process.env.EDITOR;
  if (editor) {
    await new Promise<void>((resolve) => {
      const proc = spawn(editor, [path], { stdio: "inherit" });
      proc.on("exit", () => resolve());
      proc.on("error", () => resolve());
    });
  } else {
    console.log(`Config file: ${path}`);
  }
  exitProcess(0);
}

if (!videoId) {
  console.error("Error: missing video URL or ID");
  console.log(help());
  exitProcess(1);
}

const extracted = extractVideoId(videoId);

if (!extracted) {
  console.error("Error: invalid YouTube video URL or ID");
  exitProcess(65);
}

videoId = extracted!;

setLevel(logLevel);
resetTimer();
pagerCmd = usePager ? detectPager(config.pager) : null;
debug("Pager:", pagerCmd ?? "none");

{
  const envHints = process.env.PROSEY_HINTS;
  if (envHints !== undefined) {
    useHints = envHints === "yes" || envHints === "1" || envHints === "true";
  } else if (config.hints !== undefined) {
    useHints = config.hints;
  }
}

if (useHints) {
  const hasMarkdownPager =
    pagerCmd === "bat -lmd --style plain" || pagerCmd === "glow -p" || pagerCmd === "mdcat -l -p";
  if (!hasMarkdownPager) {
    hint("Tip: install a markdown highlighter for better output (e.g. bat, glow, mdcat)");
  }
}

debug("Config file:", configPath());
debug("Video ID:", videoId);
debug("Mode:", mode);
if (lang) debug("Language:", lang);

// Give the version check a moment to complete
await Promise.race([versionCheck, new Promise((r) => setTimeout(r, 1000))]);

try {
  if (mode === "info") {
    const result = await fetchTranscript(videoId, { videoDetails: true, lang } as any);
    if (outputJson) {
      console.log(JSON.stringify(result.videoDetails, null, 2));
    } else {
      printVideoInfo(result.videoDetails);
    }
    exitProcess(0);
  }

  if (mode === "summarize") {
    if (!config.summarize?.command) {
      console.error("Error: [summarize] section with a command is required in config");
      exitProcess(1);
    }

    const cacheOpts = { lang, mode: "summarize", noDecode };
    const dir = cacheDir(videoId, cacheOpts);
    let segments: TranscriptSegment[] | null = null;
    let summary: string | null = null;

    startTimer();

    if (!noCache) {
      const cachedSegments = await readCache(dir, "transcript.json");
      const cachedSummary = await readCache(dir, "summary.md");
      if (cachedSegments && cachedSummary) {
        info("Transcript cached");
        debug("Cache hit:", dir);
        segments = JSON.parse(cachedSegments);
        summary = cachedSummary;
      } else {
        debug("Cache miss:", dir);
      }
    } else {
      debug("Cache skipped (--no-cache)");
    }

    if (!segments) {
      info("Fetching transcript...");
      segments = lang ? await fetchTranscript(videoId, { lang }) : await fetchTranscript(videoId);
      info(`Transcript: ${segments.length} segments`);
      await writeCache(dir, "transcript.json", JSON.stringify(segments));
      debug("Cache written: transcript.json");
    }

    const prompt = config.summarize!.prompt ?? "";
    const transcriptText = toText(segments, !noDecode);

    if (!summary) {
      info(`Summarizing...`);
      summary = await summarize({
        prompt,
        command: config.summarize!.command!,
        transcript: transcriptText,
        cwd: dir,
      });
      info("Summary ready");
      await writeCache(dir, "summary.md", summary);
      debug("Cache written: summary.md");
    }

    const formatted = noFormat ? summary : await formatMd(summary);
    await outputText(formatted + "\n");
    exitProcess(0);
  } else if (listOnly) {
    const languages = await listLanguages(videoId);
    printLanguages(languages);
    exitProcess(0);
  }

  const decode = !noDecode;
  const cacheOpts = { lang, timestamps, json: outputJson, noDecode };
  const dir = cacheDir(videoId, cacheOpts);
  let segments: TranscriptSegment[] | null = null;
  let videoDetailsCache: VideoDetails | null = null;

  startTimer();

  if (!noCache) {
    const cached = await readCache(dir, "transcript.json");
    if (cached) {
      info("Transcript cached");
      debug("Cache hit:", dir);
      segments = JSON.parse(cached);
    } else {
      debug("Cache miss:", dir);
    }
  } else {
    debug("Cache skipped (--no-cache)");
  }

  if (!segments) {
    info("Fetching transcript...");
    if (showDetails && !outputJson) {
      const opts = lang ? { lang, videoDetails: true as const } : { videoDetails: true as const };
      const result = (await fetchTranscript(videoId, opts)) as {
        videoDetails: VideoDetails;
        segments: TranscriptSegment[];
      };
      segments = result.segments;
      videoDetailsCache = result.videoDetails;
    } else {
      segments = lang ? await fetchTranscript(videoId, { lang }) : await fetchTranscript(videoId);
    }
    info(`Transcript: ${segments.length} segments`);
    await writeCache(dir, "transcript.json", JSON.stringify(segments));
  }

  if (showDetails && !outputJson) {
    if (!videoDetailsCache) {
      const opts = lang ? { lang, videoDetails: true as const } : { videoDetails: true as const };
      const result = (await fetchTranscript(videoId, opts)) as {
        videoDetails: VideoDetails;
        segments: TranscriptSegment[];
      };
      videoDetailsCache = result.videoDetails;
    }

    const detailsBlock = formatDetailsBlock(videoDetailsCache);
    const transcriptText = timestamps
      ? formatWithTimestamps(segments, decode)
      : toText(segments, decode);
    const output = detailsBlock + "\n\n\n" + transcriptText + "\n";

    await outputText(output);
  } else {
    const output = outputJson
      ? toJSON(segments, decode) + "\n"
      : timestamps
        ? formatWithTimestamps(segments, decode) + "\n"
        : toText(segments, decode) + "\n";

    await outputText(output);
  }
  exitProcess(0);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  exitProcess(1);
}
