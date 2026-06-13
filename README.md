# prosey

**prosey** downloads YouTube video transcripts so you can read, skim, search,
copy, and manipulate the text — no watching required.

```bash
prosey https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## Install

```bash
git clone <repo>
cd prosey
bun install
```

Or grab a prebuilt binary from the `dist/` directory.

## Usage

```
prosey [options] <video-url-or-id>
```

Pass a full YouTube URL or a bare video ID. The transcript is printed to
stdout by default.

### Examples

```bash
# Basic — plain text to stdout
prosey dQw4w9WgXcQ

# Specify language
prosey https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang es

# Include timestamps
prosey dQw4w9WgXcQ -t

# Save to file
prosey dQw4w9WgXcQ -o transcript.txt

# JSON output (timestamps always included)
prosey dQw4w9WgXcQ --json

# List available transcript languages
prosey dQw4w9WgXcQ --list
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

`timestamp` is always present in JSON mode regardless of the `-t` flag.

## Binary

Build a single-file binary with no external dependencies:

```bash
bun run build
./dist/prosey dQw4w9WgXcQ
```

## Development

```bash
bun run typecheck   # TypeScript check
bun run start       # Run the CLI
bun run build       # Compile binary
```

## How it works

prosey uses YouTube's Innertube API via the
[youtube-transcript-plus](https://github.com/ericmmartin/youtube-transcript-plus)
library. No API keys or browser automation required.

The tool works with both manually created captions and auto-generated
transcripts (YouTube's speech-to-text). Auto-detection falls through languages
in the order provided by YouTube's player response.
