# Prosey — Disk Cache

## 1. Purpose

Cache fetched transcripts and AI summaries to disk so repeated invocations for
the same video are instant and offline-capable.

## 2. Cache location

```
/tmp/prosey/<video-id>/
```

The video ID is the bare 11-character YouTube ID (normalised from any URL
form). The directory is created on first cache write.

## 3. Cache layout

```
/tmp/prosey/<video-id>/
├── transcript.txt      # Plain text transcript (decoded, no timestamps)
├── details.txt         # Video metadata (title, channel, duration, views)
└── summary.md          # Output of the last summarize command run
```

## 4. Cache lifecycle

- **Write**: after a successful fetch or summarization, the result is written
  to the corresponding cache file.
- **Read**: before fetching the transcript, check for `transcript.txt`. Before
  running the summarize command, check for both `transcript.txt` and
  `summary.md`. If all required files exist and are non-empty, use them
  instead of making network calls or re-running the command.
- **Invalidation**: `--no-cache` flag skips all cache reads and overwrites
  cache files on success.

## 5. Summarize security

When running the summarize command, the working directory is set to
`/tmp/prosey/<video-id>/`. The command runs inside the cache directory so
its file access is scoped to that directory.

## 6. Flags

| Flag         | Description                                         |
| ------------ | --------------------------------------------------- |
| `--no-cache` | Skip cache reads. Overwrite cache files on success. |

`--no-cache` applies to both the transcript fetch and the AI summary step.

## 7. Non-goals

- No cache expiry / TTL (manual invalidation via `--no-cache` or `rm -rf`).
- No cache compression or encryption.
- No cache for language listings (`--list`).

## 8. Tech stack

- Filesystem (POSIX): `node:fs/promises`
- Temp directory: hardcoded `/tmp/prosey/` (Linux/macOS standard)
