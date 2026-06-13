# Prosey — Disk Cache

## 1. Purpose

Cache fetched transcripts and AI summaries to disk so repeated invocations for
the same video (with the same options) are instant and offline-capable.

## 2. Cache location

```
/tmp/prosey/<cache-key>/
```

## 3. Cache key

The cache key is `<video-id>_<hash>`, where:

- **`video-id`** — bare 11-character YouTube ID (normalised from any URL form).
- **`hash`** — short hash (first 8 hex chars of SHA-256) of the serialised
  options that affect the output. In scope:
  - `--lang` (language code)
  - `--timestamps` / `-t`
  - `--json` / `--text`
  - `--no-decode-entities`
  - `summarize` subcommand (distinct from transcript mode)

  This means `prosey dQw4w9WgXcQ --lang en` and
  `prosey dQw4w9WgXcQ --lang fr` produce different cache keys.

## 4. Cache layout

```
/tmp/prosey/<cache-key>/
├── transcript.txt      # Plain text transcript (decoded, no timestamps)
└── summary.md          # Output of the last summarize command run
```

Only `transcript.txt` is written in transcript mode. Both files are written
in `summarize` mode.

Video metadata (`details.txt`) is **not** cached — `prosey info` always
fetches fresh data.

## 5. Cache lifecycle

- **Write**: after a successful fetch or summarization, the result is written
  to the corresponding cache file(s).
- **Read**: before fetching the transcript, check for `transcript.txt`. Before
  running the summarize command, check for both `transcript.txt` and
  `summary.md`. If all required files exist and are non-empty, use them
  instead of making network calls or re-running the command.
- **Invalidation**: `--no-cache` flag skips all cache reads and overwrites
  cache files on success.

## 6. Summarize security

When running the summarize command, the working directory is set to
`/tmp/prosey/<cache-key>/`. The command runs inside the cache directory so
its file access is scoped to that directory.

## 7. Flags

| Flag         | Description                                         |
| ------------ | --------------------------------------------------- |
| `--no-cache` | Skip cache reads. Overwrite cache files on success. |

`--no-cache` applies to both the transcript fetch and the AI summary step.

## 8. Non-goals

- No cache expiry / TTL (manual invalidation via `--no-cache` or `rm -rf`).
- No cache compression or encryption.
- No cache for language listings (`--list`).
- No cache for `prosey info`.

## 9. Tech stack

- Filesystem (POSIX): `node:fs/promises`
- Temp directory: hardcoded `/tmp/prosey/` (Linux/macOS standard)
- Hash: SHA-256 via `node:crypto`, truncated to 8 hex chars
