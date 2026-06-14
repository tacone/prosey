# Prosey

**Prosey** downloads YouTube transcripts to be printed or saved to a file.

You can read, skim, search, copy, and manipulate the text using the tools you love the most.

## Features

| Feature                              | Description                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **📋&nbsp;Transcript&nbsp;download** | Fetch YouTube transcripts as plain text or JSON                                                 |
| **🤖&nbsp;AI&nbsp;summarization**    | Pipe transcripts to any AI agent (opencode, Claude, Copilot, Codex)                             |
| **🎨&nbsp;Smart&nbsp;pager**         | Automatic syntax highlighting if bat, glow or mdcat are installed (or configure your own pager) |
| **🛠️&nbsp;Customization**            | Use `prosey config` to access and edit your configuration                                       |
| **💾&nbsp;Disk&nbsp;caching**        | Transcripts and summaries cached for instant repeat                                             |
| **📄&nbsp;Supported&nbsp;formats**   | Plain text and JSON                                                                             |

## Quickstart

Try it out immediately with npx:

```bash
npx @tacone/prosey 771PQEDeRmw
npx @tacone/prosey https://youtu.be/771PQEDeRmw --lang es -o transcript.txt
```

## Install

Install globally with your favorite package manager:

```bash
npm install -g @tacone/prosey
# or
yarn global add @tacone/prosey
# or
pnpm add -g @tacone/prosey
# or
bun install -g @tacone/prosey
```

Then use it anywhere:

```bash
prosey 771PQEDeRmw
```

### From source (development)

Uses **[Bun](https://bun.sh)** for development — scripts, package management,
and running the TypeScript source directly.

```bash
git clone https://github.com/tacone/prosey.git
cd prosey
bun install
bun run start -- 771PQEDeRmw
```

### Prebuilt binary

Grab a compiled binary from the `dist/` directory (requires no runtime).

## Usage

```
prosey [options] <video-url-or-id>
prosey info [options] <video-url-or-id>
prosey summarize [options] <video-url-or-id>
prosey config
```

Pass a full YouTube URL or a bare video ID. The transcript is printed to
stdout by default, with video details prepended.

The `summarize` command fetches a transcript, prepends the prompt from the
`[summarize]` config section, and pipes the result to the configured command.

The `config` command opens your config file in `$EDITOR` for editing. If
`$EDITOR` is not set, the config file path is printed.

### Examples

```bash
# Basic — plain text with details
prosey 771PQEDeRmw

# Specify language
prosey https://youtu.be/771PQEDeRmw --lang es

# Include timestamps
prosey 771PQEDeRmw -t

# Save to file
prosey 771PQEDeRmw -o transcript.txt

# JSON output (timestamps always included)
prosey 771PQEDeRmw --json

# Transcript only, no video details
prosey 771PQEDeRmw --no-details

# List available transcript languages
prosey 771PQEDeRmw --list

# Show video metadata
prosey info 771PQEDeRmw

# Summarize via the configured command
prosey summarize 771PQEDeRmw

# Edit config in $EDITOR
prosey config
```

## Options

| Flag                    | Description                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--lang <code>`         | Language code (e.g. `en`, `fr`). Auto-detected if omitted.                                                     |
| `-t`, `--timestamps`    | Prepend `[MM:SS]` to each line in text output.                                                                 |
| `--list`                | List available transcript languages for the video, then exit.                                                  |
| `-o`, `--output <path>` | Write output to file instead of stdout.                                                                        |
| `--json`                | Output transcript as a JSON array. Each item includes `text`, `offset` (seconds), `duration`, and `timestamp`. |
| `--text`                | Output as plain text (default).                                                                                |
| `--details`             | Prepend video details (title, channel, duration, views, description) to the transcript (default).              |
| `--no-details`          | Suppress video details, transcript only.                                                                       |
| `--no-decode-entities`  | Preserve raw HTML entities (e.g. `&#39;`). Decoded by default in text mode.                                    |
| `--no-cache`            | Skip cache reads and force a fresh fetch.                                                                      |
| `--no-format`           | Skip prettier markdown formatting on summarize output.                                                         |
| `-q`, `--quiet`         | Suppress all stderr logging.                                                                                   |
| `-v`, `--verbose`       | Print debug information to stderr.                                                                             |
| `--no-pager`            | Disable pager for stdout output (auto-detected by default).                                                    |
| `--pager`               | Use pager for stdout output (default).                                                                         |
| `--reset-config`        | Reset config file to defaults and exit.                                                                        |
| `--help`                | Show help message and exit.                                                                                    |
| `--version`             | Show version number and exit.                                                                                  |

## JSON format

When `--json` is used, the output is an array of objects:

```json
[
  {
    "text": "♪ We're no strangers to love ♪",
    "offset": 18.64,
    "duration": 3.24,
    "timestamp": "00:18"
  }
]
```

`timestamp` is always present in JSON mode. Video details are suppressed
(silently) since JSON is structured data.

## Development

This project uses **[Bun](https://bun.sh)** for development.

```bash
bun run typecheck   # TypeScript check
bun run start       # Run the CLI from source
bun run test        # Run unit tests
bun run build       # Compile Node bundle to bin/prosey
```

Before publishing to npm, `bun run build` runs automatically via the `prepack`
hook, producing a Node-compatible JS bundle at `bin/prosey`.

## Configuration

Prosey reads configuration from a TOML file. The location follows the
[XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
(`~/.config/prosey/config.toml`), or you can set the `PROSEY_CONFIG_PATH`
environment variable to use a custom path.

The config file is created automatically on first run with default values.
Use `--reset-config` to restore the defaults at any time.

### `pager`

Pager command for transcript and summary output. Defaults to `"auto"`, which
detects the first available of: `bat -lmd --style plain` → `glow -p` → `mdcat -l -p` → `less`.
Set to a custom command (e.g. `"less -R"`) to override. The `PROSEY_PAGER`
environment variable takes precedence over this setting.

### `[summarize]`

The `[summarize]` section configures the `summarize` command:

| Key       | Description                                      |
| --------- | ------------------------------------------------ |
| `prompt`  | Instruction prepended to the transcript          |
| `command` | Shell command that receives the prompt via stdin |

### `PROSEY_PAGER`

Environment variable to set the pager command. Takes precedence over the
`pager` config value. Set to `"auto"` or empty to use auto-detection.

## Cache

Transcripts and summaries are cached to `/tmp/prosey/`. Repeated invocations
for the same video and options are instant and work offline. Use `--no-cache`
to skip cache reads and force a fresh fetch.

When running `prosey summarize`, the command runs inside the cache directory
for that video. This prevents the AI agent from picking up project-specific
files like `AGENTS.md` or `CLAUDE.md` from the current folder, and limits its
ability to modify files outside that directory.

## Exit codes

| Code | Meaning                 |
| ---- | ----------------------- |
| `0`  | Success                 |
| `65` | Invalid video URL or ID |

## How it works

prosey uses YouTube's Innertube API via the
[youtube-transcript-plus](https://github.com/ericmmartin/youtube-transcript-plus)
library. No API keys or browser automation required.

The tool works with both manually created captions and auto-generated
transcripts (YouTube's speech-to-text). Auto-detection falls through languages
in the order provided by YouTube's player response.
