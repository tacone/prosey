# YouTube Transcript CLI

## 1. Purpose

A command-line tool that extracts transcripts from YouTube videos so users can
read, skim, search, copy, and manipulate the text instead of watching the
video. Supports all video types (talks, tutorials, podcasts, lectures, etc.).

## 2. Input

Accept a YouTube **URL** (full or short) or a bare **video ID** as the
positional argument.

## 3. Output

- **Default**: plain text transcript printed to stdout (pipe-friendly).
- **File**: optional `-o <path>` flag writes to a file.
- **Timestamps**: optional `--timestamps` flag prepends `[MM:SS]` to each
  segment. Off by default.

## 4. Flags

| Flag            | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `--lang <code>` | Language code (e.g. `en`, `fr`). Auto-detect if omitted.      |
| `--timestamps`  | Include timestamps in output.                                 |
| `--list`        | List available transcript languages for the video, then exit. |
| `-o <path>`     | Write output to file instead of stdout.                       |
| `--help`        | Show usage.                                                   |
| `--version`     | Show version.                                                 |

## 5. Tech Stack

- **Runtime**: Bun
- **Library**: `youtube-transcript-plus` (Node.js, zero dependencies, MIT)
- **Distribution**: single-file Bun binary or direct `bun run`

## 6. Non-goals

- No batch processing (single video per invocation).
- No format conversion (SRT, VTT, JSON) — plain text only.
- No proxy/auth support (for now).
- No search or metadata extraction.
