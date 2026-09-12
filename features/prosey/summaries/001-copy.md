# 001 — copy command and Copy link

## What was built

- `prosey copy <folder> [--question <text>]` — puts `<folder>/summary.md` on the
  clipboard, nothing else. Unknown folder → error; folder without a summary → error.
- A **Copy** link on the `summary.html` meta line, right of the reading time and behind
  the usual pipe separator: click it, the summary lands on the clipboard.
- `summarize` and markdown/html `read` runs print the document folder name (not the
  path) as their last stderr line, e.g. `[  413ms] dQw4w9WgXcQ_62d1ff1b`.
- `clipboard` config key, default `"auto"` (wl-copy → xclip → xsel → pbcopy → clip),
  overridable with any shell command that reads the text on stdin.

## What's next

- `prosey copy` by title or partial key (currently exact folder name or path only).
- Global install still points at 0.12.0: run `bun i -g .` after committing to get
  `prosey copy` on the PATH.

## Gotchas

- Prefill links were removed on purpose: they worked in Chromium but inconsistently in
  Firefox/Zen, and a full summary never fit comfortably in a URL.
- The payload is `summary.md` **raw**, not the prettier-formatted markdown the page
  renders, so `prosey copy` and the page button copy byte-identical text.
- Summary pages grow by the size of the summary (~25-45 KB here) since the payload is
  embedded; the index deliberately gets no payload and no button.
- `-q` was requested but is already `--quiet`, hence `--question`.
- The Ask button needs a genuine click: `navigator.clipboard.writeText()` throws
  `NotAllowedError` on synthetic calls from a `file://` page; the textarea +
  `execCommand` fallback covers browsers without the async clipboard API.
- Template marker bumped to `content-v3`, so pre-existing pages regenerate once on the
  next summarize/transcribe or `prosey render`.

## Verification

- 164 unit tests pass (`bun test`), `tsc --noEmit` clean, `bun run build` rebuilt
  `bin/prosey`.
- Real runs against a scratch data dir: default wl-copy copy, `--question` separator
  (two blank lines), custom `clipboard` command via config, failing clipboard command,
  the three error paths.
- Browser: menu opens, `Copy` yields exactly `summary.md` content, chat hrefs are
  `?q=`-encoded with `target="_blank"`, and the button renders right of the reading time.
- Encoding audited end to end while the prefill links existed: all 39 links decoded back to
  their `summary.md` byte for byte, no raw non-ASCII, `#`/`&`/`?`/`%`/`+`/newlines escaped, and
  Firefox 155/Zen delivered 3.2 KB, 14 KB and 60 KB payloads intact to a local server
  (sha256 of the decoded query == sha256 of the summary).
- `prosey render` on the real data dir: 39 summary pages got the payload and menu, the
  single transcript page did not, the index did not, and all embedded payloads match
  their `summary.md` byte for byte.
