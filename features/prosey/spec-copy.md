# Prosey Copy — Spec

## 1. Overview

Hand a document's **summary** to the clipboard, ready to paste into a web
chat for analysis the local AI command cannot give.

Two surfaces:

- **CLI** — `prosey copy <folder>`: clipboard only, never opens a browser.
- **HTML** — a **Copy** link on the meta line of `summary.html`, right of the
  reading time.

Only summaries are supported. A folder without `summary.md` is an error; the
feature does not work on transcriptions.

## 2. Payload

- Source: `<folder>/summary.md`, verbatim.
- Optional question appended (`prosey copy --question "…"`), separated from the
  content by **two empty lines**.
- No prompt prefix, no `INFO:` / `TIMESTAMPS:` block.
- Trailing newline at the end. Import: `buildAskPayload()` in `src/ask.ts`.

## 3. CLI

```
prosey copy <folder-name-or-path> [--question <text>]
```

- Folder resolution: an existing directory is used as-is, otherwise the arg is
  resolved under the data dir. Unknown → `Error: document not found`.
- No summary → `Error: no summary in <folder>`.
- Clipboard only — no browser launch, no `--claude` / `--chatgpt` / `--print`
  flags.
- stderr feedback: `Copied <n> characters to clipboard`.
- `--question` (not `-q`, which is already `--quiet`).

## 4. Clipboard

`clipboard` config key, default `"auto"`:

- `auto` → first available of `wl-copy`, `xclip -selection clipboard`,
  `xsel --clipboard --input`, `pbcopy`, `clip`.
- any other value → that shell command, the payload arriving on stdin.
- nothing available → clear error, exit 1.

## 5. Copy link (HTML)

- Rendered **only on summary pages** — not on transcript pages, not on the index.
- Sits on the meta line, right of the reading time, separated by the same pipe
  separator used between the other meta fields:
  `Channel | 2 min watch | 2 min read | Copy`.
- The payload is embedded in the page (`<script type="application/json"
id="ask-payload">`), so the link works offline over `file://`.
- Clicking it copies the payload to the clipboard and flashes `Copied` next to
  the link (absolutely positioned, so the centered meta line never moves).
- Clipboard write happens on a genuine click; a `textarea` + `execCommand`
  fallback covers browsers without `navigator.clipboard`.

No ChatGPT / Claude prefilled links: prefill worked inconsistently outside
Chromium, so the clipboard is the only transport.

## 6. Completion output

After a successful `summarize` or markdown/html `read` run, prosey prints the
document **folder name** (not the path) as the last stderr line, so it can be
pasted straight into `prosey copy`:

```
[  0.3s] Summary ready
[  3ms] dQw4w9WgXcQ_62d1ff1b
```

## 7. Verified assumptions

- `navigator.clipboard.writeText()` works on a `file://` page **only on a real
  click** — a synthetic call returns `NotAllowedError: Write permission denied`.
  Hence the gesture-bound handler plus the `execCommand` fallback.
- Clipboards commands and their detection order were verified on this machine
  (`wl-copy` present, Wayland session) and with faked `PATH` lookups.

## 8. Template version

The page template changes (ask button + payload), so `HTML_MARKER` moves
`content-v2` → `content-v3`: existing pages are regenerated on the next rebuild,
or explicitly with `prosey render`.

## 9. Tests

- `src/ask.test.ts` — payload building (with/without question, separator),
  clipboard command resolution, target/summary resolution errors.
- `src/html.test.ts` — ask button + payload on summary pages, absent on
  transcript pages and on the index.
