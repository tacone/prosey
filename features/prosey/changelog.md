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

## 2026-06-16 — v0.3.0 — HTML output + Pairing G typography

Workstation: xoxo | Workspace: prosey

- Added `--format html` / `--html` flag with PicoCSS classless CSS (fetched at runtime)
- Added Pairing G typography (IBM Plex Sans via Google Fonts)
- Browser auto-open on TTY, stdout on pipe, file write with `-o`
- README restructured: logo, quickstart, feature table
- Logo SVG cleaned and straightened

## 2026-06-16 — v0.4.0 — Pairing E + theme switcher + logo

- Switched to Pairing E (Plus Jakarta Sans, scaled sizes)
- Responsive font-size: 120% desktop / 110% mobile
- Prosey logo inlined as data URI `<img>` in generated HTML
- Dark/light/auto theme switcher with localStorage persistence
- Three-state cycle: system-aware auto → light → dark
- Context-aware cycling (order depends on `prefers-color-scheme`)
- Logo grayscale by default, restores color on hover
- `transition: all 0.3s` for smooth state changes

## 2026-06-16 — v0.5.0 — polish

- Theme button: no border, background, box-shadow, or outline
- Improved summarize prompt with structural guidelines
- Theme button syncs icon on page load

## 2026-06-16 — v0.6.0 — structured AI input for summarize

- `prosey summarize` now feeds the same structured content as `prosey read`:
  `INFO:\n{title, channel, truncated description}\n\nTEXT:\n<transcript>`
- TIMESTAMPS excluded from summarize input (chapters still cached for other uses)
- Video details fetched with `videoDetails: true` in summarize path
- `info.json` and `chapters.json` cached alongside transcript in summarize mode
- `--dry-run` works with the new structured content
