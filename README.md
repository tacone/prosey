# Prosey

**Prosey** downloads YouTube transcripts to be printed or saved to a file.

You can read, skim, search, copy, and manipulate the text using the tools you love the most.

```bash
npx prosey https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## Install

### Quick — no install (npx)

```bash
npx prosey dQw4w9WgXcQ
```

### Global install (npm)

```bash
npm install -g prosey
prosey dQw4w9WgXcQ
```

### From source (development)

Uses **[Bun](https://bun.sh)** for development — scripts, package management,
and running the TypeScript source directly.

```bash
git clone https://github.com/tacone/prosey.git
cd prosey
bun install
bun run start -- dQw4w9WgXcQ
```

### Prebuilt binary

Grab a compiled binary from the `dist/` directory (requires no runtime).

## Usage

```
prosey [options] <video-url-or-id>
prosey info [options] <video-url-or-id>
```

Pass a full YouTube URL or a bare video ID. The transcript is printed to
stdout by default, with video details prepended.

### Examples

```bash
# Basic — plain text with details
prosey dQw4w9WgXcQ

# Specify language
prosey https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang es

# Include timestamps
prosey dQw4w9WgXcQ -t

# Save to file
prosey dQw4w9WgXcQ -o transcript.txt

# JSON output (timestamps always included)
prosey dQw4w9WgXcQ --json

# Transcript only, no video details
prosey dQw4w9WgXcQ --no-details

# List available transcript languages
prosey dQw4w9WgXcQ --list

# Show video metadata
prosey info dQw4w9WgXcQ
```

## Options

| Flag | Description |
|---|---|
| `--lang <code>` | Language code (e.g. `en`, `fr`). Auto-detected if omitted. |
| `-t`, `--timestamps` | Prepend `[MM:SS]` to each line in text output. |
| `--list` | List available transcript languages for the video, then exit. |
| `-o`, `--output <path>` | Write output to file instead of stdout. |
| `--json` | Output transcript as a JSON array. Each item includes `text`, `offset` (seconds), `duration`, and `timestamp`. |
| `--text` | Output as plain text (default). |
| `--details` | Prepend video details (title, channel, duration, views, description) to the transcript (default). |
| `--no-details` | Suppress video details, transcript only. |
| `--no-decode-entities` | Preserve raw HTML entities (e.g. `&#39;`). Decoded by default in text mode. |
| `--help` | Show help message and exit. |
| `--version` | Show version number and exit. |

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

## Binary

Build a single-file binary with no external dependencies:

```bash
bun run build
./dist/prosey dQw4w9WgXcQ
```

## Development

This project uses **[Bun](https://bun.sh)** for development.

```bash
bun run typecheck   # TypeScript check
bun run start       # Run the CLI from source
bun run test        # Run unit tests
bun run build       # Compile standalone binary
```

Before publishing to npm, `bun run build:node` compiles the TypeScript source
into a Node-compatible JS bundle at `bin/prosey.js`. This happens automatically
via the `prepack` hook.

## How it works

prosey uses YouTube's Innertube API via the
[youtube-transcript-plus](https://github.com/ericmmartin/youtube-transcript-plus)
library. No API keys or browser automation required.

The tool works with both manually created captions and auto-generated
transcripts (YouTube's speech-to-text). Auto-detection falls through languages
in the order provided by YouTube's player response.
