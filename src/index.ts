#!/usr/bin/env node

import { setLevel, info, debug, startTimer, resetTimer, hint } from "./debug";
import type { LogLevel } from "./debug";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { detectPager } from "./pager";
import { fetchTranscript, listLanguages } from "youtube-transcript-plus";
import type { CaptionTrackInfo, VideoDetails, TranscriptSegment } from "youtube-transcript-plus";
import { formatWithTimestamps, toText, toJSON, formatDuration, decodeEntities } from "./format";
import { loadConfig, resetConfig, configPath } from "./config";
import type { ProseyConfig } from "./config";
import { summarize } from "./summarize";
import {
  resolveSummarizeCmd,
  resolveSummarizePrompt,
  resolveTranscribeCmd,
  resolveTranscribePrompt,
} from "./config-resolve";
import { cacheDir, readCache, writeCache, extractVideoId } from "./cache";
import { extractChapters, formatChaptersAsText, formatChaptersAsJson } from "./extract-chapters";
import { generateHtml, openInBrowser } from "./html";
import { checkVersion } from "./version-check";
import pkg from "../package.json";
import prettier from "prettier";

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
});

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
       ${NAME} help

Download a YouTube video transcript or show video details.

Commands:
  summarize             Pipe transcript to the AI command (default command)
  read                  Download and print a richly formatted transcript
  info                  Show video metadata (title, channel, duration, etc.)
  config                Open config file in \$EDITOR
  help                  Show this help message

Arguments:
  video-url-or-id        YouTube URL (full or short) or bare video ID

Options:
  --lang <code>          Language code (e.g. en, fr). Auto-detect if omitted.
  -t, --timestamps       Include timestamps [MM:SS] in output.
  --list                 List available transcript languages and exit.
  -o, --output <path>    Write output to file instead of stdout.
  --format <type>        Output format: markdown (default), text, json, or html.
  --json                 Shortcut for --format json.
  --text                 Shortcut for --format text.
  --markdown             Shortcut for --format markdown.
  --html                 Shortcut for --format html (opens in browser).
  --details              Prepend video details to transcript (default, text only).
  --no-details           Suppress video details, transcript only.
  --no-decode-entities   Preserve HTML entities (decoded by default).
  --reset-config         Reset config file to defaults and exit.
  --no-cache             Skip cache and overwrite cache files.
  --no-format            Skip prettier formatting.
  --dry-run              Print what would be sent to the AI command and exit.
  --extract-timestamps   Extract chapter timestamps from video description.
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

if (args.length === 0 || args.includes("--help") || args.includes("help")) {
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

let mode = "summarize";
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
let format: "text" | "json" | "markdown" | "html" = "markdown";
let noDecode = false;
let showDetails = true;
let noCache = false;
let noFormat = false;
let usePager = true;
let useHints = true;
let dryRun = false;
let extractTimestamps = false;
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
    format = "json";
  } else if (arg === "--text") {
    outputJson = false;
    format = "text";
  } else if (arg === "--markdown") {
    format = "markdown";
  } else if (arg === "--html") {
    format = "html";
  } else if (arg === "--format") {
    const val = args[++i];
    if (val === "json") {
      format = "json";
      outputJson = true;
    } else if (val === "text") {
      format = "text";
      outputJson = false;
    } else if (val === "markdown") {
      format = "markdown";
      outputJson = false;
    } else if (val === "html") {
      format = "html";
      outputJson = false;
    } else {
      console.error("Error: --format must be text, json, markdown, or html");
      exitProcess(1);
    }
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
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--extract-timestamps") {
    extractTimestamps = true;
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

if (extractTimestamps) {
  startTimer();
  info("Fetching transcript...");
  const result = (await fetchTranscript(videoId, {
    videoDetails: true,
    lang,
  } as any)) as {
    videoDetails: VideoDetails;
    segments: TranscriptSegment[];
  };
  info("Transcript fetched");
  const chapters = extractChapters(result.videoDetails.description);
  const output = outputJson
    ? JSON.stringify(chapters, null, 2) + "\n"
    : formatChaptersAsText(chapters) + "\n";
  await outputText(output);
  exitProcess(0);
}

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
    const sumCmd = resolveSummarizeCmd(config);
    if (!sumCmd) {
      console.error(
        "Error: no command configured for summarize. Set [ai].command or [summarize].command in config.",
      );
      exitProcess(1);
    }

    const cacheOpts = { lang, mode: "summarize", noDecode };
    const dir = cacheDir(videoId, cacheOpts);
    let segments: TranscriptSegment[] | null = null;
    let summary: string | null = null;
    let cachedInfo: string | null = null;

    startTimer();

    if (!noCache) {
      const cachedSegments = await readCache(dir, "transcript.json");
      const cachedSummary = await readCache(dir, "summary.md");
      cachedInfo = await readCache(dir, "info.json");
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

    const prompt = resolveSummarizePrompt(config) ?? "";
    if (!prompt) {
      console.error(
        "Error: no prompt configured. Set a prompt in the [summarize] section of your config.",
      );
      exitProcess(1);
    }

    let structuredContent: string;

    if (!segments) {
      info("Fetching transcript...");
      const opts = lang ? { lang, videoDetails: true as const } : { videoDetails: true as const };
      const result = (await fetchTranscript(videoId, opts)) as {
        videoDetails: VideoDetails;
        segments: TranscriptSegment[];
      };
      segments = result.segments;
      const infoJson = JSON.stringify({
        title: result.videoDetails.title,
        channel: result.videoDetails.author,
        description: result.videoDetails.description,
      });
      cachedInfo = infoJson;
      const chapterValue = formatChaptersAsJson(extractChapters(result.videoDetails.description));
      const truncatedInfo = JSON.stringify({
        title: result.videoDetails.title,
        channel: result.videoDetails.author,
        description: result.videoDetails.description.slice(0, 1000),
      });
      const transcriptText = toText(segments, !noDecode);
      structuredContent = `INFO:\n${truncatedInfo}\n\nTEXT:\n${transcriptText}`;

      if (dryRun) {
        await outputText(`${prompt}\n\n${structuredContent}\n`);
        exitProcess(0);
      }

      info(`Transcript: ${segments.length} segments`);
      await writeCache(dir, "transcript.json", JSON.stringify(segments));
      await writeCache(dir, "info.json", infoJson);
      await writeCache(dir, "chapters.json", chapterValue);
      debug("Cache written: transcript.json, info.json, chapters.json");
    } else {
      let chapterValue: string;
      if (!cachedInfo) {
        debug("Cache missing info.json, re-fetching video details");
        const fallbackOpts = lang
          ? { lang, videoDetails: true as const }
          : { videoDetails: true as const };
        const fallbackResult = (await fetchTranscript(videoId, fallbackOpts)) as {
          videoDetails: VideoDetails;
          segments: TranscriptSegment[];
        };
        cachedInfo = JSON.stringify({
          title: fallbackResult.videoDetails.title,
          channel: fallbackResult.videoDetails.author,
          description: fallbackResult.videoDetails.description,
        });
        await writeCache(dir, "info.json", cachedInfo);
        chapterValue = formatChaptersAsJson(
          extractChapters(fallbackResult.videoDetails.description),
        );
        await writeCache(dir, "chapters.json", chapterValue);
        debug("Cache written: info.json, chapters.json");
      } else {
        const cachedChapters = await readCache(dir, "chapters.json");
        chapterValue = cachedChapters ?? "not available";
      }
      const transcriptText = toText(segments, !noDecode);
      const cachedInfoObj = JSON.parse(cachedInfo);
      const truncatedInfo = JSON.stringify({
        title: cachedInfoObj.title,
        channel: cachedInfoObj.channel,
        description: cachedInfoObj.description.slice(0, 1000),
      });
      structuredContent = `INFO:\n${truncatedInfo}\n\nTEXT:\n${transcriptText}`;
    }

    if (dryRun) {
      await outputText(`${prompt}\n\n${structuredContent}\n`);
      exitProcess(0);
    }

    if (!summary) {
      info(`Summarizing...`);
      summary = await summarize({
        prompt,
        command: sumCmd,
        transcript: structuredContent,
        cwd: dir,
      });
      info("Summary ready");
      await writeCache(dir, "summary.md", summary);
      debug("Cache written: summary.md");
    }

    const formatted = noFormat ? summary : await formatMd(summary);
    if (format === "html") {
      const htmlContent = await generateHtml(formatted);
      const htmlPath = join(dir, "summary.html");
      await writeFile(htmlPath, htmlContent, "utf8");
      debug("HTML written:", htmlPath);
      if (outputPath) {
        await writeFile(outputPath, htmlContent, "utf8");
      } else if (!process.stdout.isTTY) {
        process.stdout.write(htmlContent);
      } else {
        await openInBrowser(htmlPath);
      }
    } else {
      await outputText(formatted + "\n");
    }
    exitProcess(0);
  } else if (listOnly) {
    const languages = await listLanguages(videoId);
    printLanguages(languages);
    exitProcess(0);
  }

  if (format === "markdown" || format === "html") {
    const transcribeCmd = resolveTranscribeCmd(config);
    if (!transcribeCmd) {
      console.error(
        "Error: no command configured for transcribe. Set [transcribe].command, [ai].command, or [summarize].command in config.",
      );
      exitProcess(1);
    }

    const cacheOpts = { lang, mode: "transcribe", noDecode };
    const dir = cacheDir(videoId, cacheOpts);
    let segments: TranscriptSegment[] | null = null;
    let md: string | null = null;

    startTimer();

    let cachedInfo: string | null = null;

    if (!noCache) {
      const cachedSegments = await readCache(dir, "transcript.json");
      const cachedMd = await readCache(dir, "transcript.md");
      cachedInfo = await readCache(dir, "info.json");
      if (cachedSegments && cachedMd) {
        info("Transcript cached");
        debug("Cache hit:", dir);
        segments = JSON.parse(cachedSegments);
        md = cachedMd;
      } else {
        debug("Cache miss:", dir);
      }
    } else {
      debug("Cache skipped (--no-cache)");
    }

    const prompt = resolveTranscribePrompt(config) ?? "";
    if (!prompt) {
      console.error(
        "Error: no prompt configured. Set a prompt in the [transcribe] or [summarize] section of your config.",
      );
      exitProcess(1);
    }

    if (!segments) {
      info("Fetching transcript...");
      const opts = lang ? { lang, videoDetails: true as const } : { videoDetails: true as const };
      const result = (await fetchTranscript(videoId, opts)) as {
        videoDetails: VideoDetails;
        segments: TranscriptSegment[];
      };
      segments = result.segments;
      const infoJson = JSON.stringify({
        title: result.videoDetails.title,
        channel: result.videoDetails.author,
        description: result.videoDetails.description,
      });
      cachedInfo = infoJson;
      const chapterValue = formatChaptersAsJson(extractChapters(result.videoDetails.description));
      const truncatedInfo = JSON.stringify({
        title: result.videoDetails.title,
        channel: result.videoDetails.author,
        description: result.videoDetails.description.slice(0, 1000),
      });
      const transcriptText = toText(segments, !noDecode);
      const structuredContent = `INFO:\n${truncatedInfo}\n\nTIMESTAMPS:\n${chapterValue}\n\nTEXT:\n${transcriptText}`;

      if (dryRun) {
        await outputText(`${prompt}\n\n${structuredContent}\n`);
        exitProcess(0);
      }

      info(`Transcript: ${segments.length} segments`);
      await writeCache(dir, "transcript.json", JSON.stringify(segments));
      await writeCache(dir, "info.json", infoJson);
      await writeCache(dir, "chapters.json", chapterValue);
      debug("Cache written: transcript.json, info.json, chapters.json");

      if (!md) {
        info(`Transcribing...`);
        md = await summarize({
          prompt,
          command: transcribeCmd,
          transcript: structuredContent,
          cwd: dir,
        });
        info("Transcription ready");
        await writeCache(dir, "transcript.md", md);
        debug("Cache written: transcript.md");
      }
    } else {
      let chapterValue: string;
      if (!cachedInfo) {
        debug("Cache missing info.json, re-fetching video details");
        const fallbackOpts = lang
          ? { lang, videoDetails: true as const }
          : { videoDetails: true as const };
        const fallbackResult = (await fetchTranscript(videoId, fallbackOpts)) as {
          videoDetails: VideoDetails;
          segments: TranscriptSegment[];
        };
        cachedInfo = JSON.stringify({
          title: fallbackResult.videoDetails.title,
          channel: fallbackResult.videoDetails.author,
          description: fallbackResult.videoDetails.description,
        });
        await writeCache(dir, "info.json", cachedInfo);
        chapterValue = formatChaptersAsJson(
          extractChapters(fallbackResult.videoDetails.description),
        );
        await writeCache(dir, "chapters.json", chapterValue);
        debug("Cache written: info.json, chapters.json");
      } else {
        const cachedChapters = await readCache(dir, "chapters.json");
        chapterValue = cachedChapters ?? "not available";
      }
      const transcriptText = toText(segments, !noDecode);
      const cachedInfoObj = JSON.parse(cachedInfo);
      const truncatedInfo = JSON.stringify({
        title: cachedInfoObj.title,
        channel: cachedInfoObj.channel,
        description: cachedInfoObj.description.slice(0, 1000),
      });
      const structuredContent = `INFO:\n${truncatedInfo}\n\nTIMESTAMPS:\n${chapterValue}\n\nTEXT:\n${transcriptText}`;

      if (!md) {
        info(`Transcribing...`);
        md = await summarize({
          prompt,
          command: transcribeCmd,
          transcript: structuredContent,
          cwd: dir,
        });
        info("Transcription ready");
        await writeCache(dir, "transcript.md", md);
        debug("Cache written: transcript.md");
      }
    }

    const formatted = noFormat ? md : await formatMd(md);
    if (format === "html") {
      const htmlContent = await generateHtml(formatted);
      const htmlPath = join(dir, "transcript.html");
      await writeFile(htmlPath, htmlContent, "utf8");
      debug("HTML written:", htmlPath);
      if (outputPath) {
        await writeFile(outputPath, htmlContent, "utf8");
      } else if (!process.stdout.isTTY) {
        process.stdout.write(htmlContent);
      } else {
        await openInBrowser(htmlPath);
      }
    } else {
      await outputText(formatted + "\n");
    }
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

  const prompt = resolveTranscribePrompt(config) ?? "";
  if (!prompt) {
    console.error(
      "Error: no prompt configured. Set a prompt in the [transcribe] or [summarize] section of your config.",
    );
    exitProcess(1);
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
