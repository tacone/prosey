# prosey

CLI tool that downloads YouTube video transcripts so you can read, skim,
search, copy, and manipulate the text — no watching required.

## Install

```bash
bun install
```

## Usage

```
bun run src/index.ts <video-url-or-id>
```

### Examples

```bash
# Basic — fetch transcript, print to stdout
bun run src/index.ts dQw4w9WgXcQ

# Specify language
bun run src/index.ts https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang es

# Include timestamps
bun run src/index.ts dQw4w9WgXcQ --timestamps

# Save to file
bun run src/index.ts dQw4w9WgXcQ -o transcript.txt

# List available transcript languages
bun run src/index.ts dQw4w9WgXcQ --list
```

## Options

| Flag | Description |
|---|---|
| `--lang <code>` | Language code (e.g. en, fr). Auto-detect if omitted. |
| `--timestamps` | Include `[MM:SS]` timestamps in output. |
| `--list` | List available transcript languages. |
| `-o, --output <path>` | Write to file instead of stdout. |
| `--help` | Show help. |
| `--version` | Show version. |

## Binary

Build a single-file binary:

```bash
bun build src/index.ts --compile --outfile prosey
./prosey dQw4w9WgXcQ
```
