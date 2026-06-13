# Changelog — Prosey

## 2026-06-13 (7) — Add machine-wide config support

Workstation: xoxo | Workspace: prosey

- Added config module (src/config.ts) using js-toml
- Config path: $XDG_CONFIG_HOME/prosey/config.toml, override with PROSEY_CONFIG_PATH
- Default config auto-created on first run
- [summarize] section with prompt (long string, piped via stdin) and command
- Rebuilt binaries

## 2026-06-13 (6) — --json silently suppresses details

Workstation: xoxo | Workspace: prosey

- --json no longer errors with --details; silently outputs just the JSON array
- Updated help text and examples

## 2026-06-13 (5) — Add --details / --no-details flags

Workstation: xoxo | Workspace: prosey

- Added `--details` / `--no-details` flags (default: --details)
- Details block shows title, channel, duration, views, description (truncated 500 chars)
- Separated from transcript by 2 blank lines
- --details + --json errors with a clear message
- Rebuilt binary

## 2026-06-13 (4) — Add info command

Workstation: xoxo | Workspace: prosey

- Added `prosey info <url|id>` subcommand for video metadata
- Added `formatDuration` helper for human-readable duration
- Rebuilt binary

## 2026-06-13 (3) — Add unit tests

Workstation: xoxo | Workspace: prosey

- Extracted formatting functions into `src/format.ts`
- Added 18 unit tests covering formatTime, decodeEntities,
  formatWithTimestamps, toText, toJSON
- Added `bun test` script

## 2026-06-13 (2) — Add -t, --json, --text, --no-decode-entities

Workstation: xoxo | Workspace: prosey

- Added `-t` shortcut for `--timestamps`
- Added `--json` output format
- Added `--text` explicit text mode flag
- Added `--no-decode-entities` to preserve HTML entities
- HTML entities decoded by default in text mode
- Rebuilt binary

## 2026-06-13 (1) — Feature created

Workstation: xoxo | Workspace: prosey

Created feature skeleton and wrote spec document.
