# 002 — opencode v2 default command and non-interactive `prosey config`

## What was built

- The bundled `[ai] command` is now plain `opencode run` (no pinned model, and
  none of the removed opencode v1 flags), so opencode uses whichever model it is
  configured with; pinning an id rots as soon as opencode renames one.
- `prosey config` prints the config file path (and exits 0) whenever there is no
  usable terminal, and only opens `$EDITOR` when attached to a TTY.
- `loadConfig` warns on stderr about top-level config keys it ignores, naming the
  sections that define them.
- README + help text updated; regression tests added.

## What's next

- None known. The globally installed prosey still carries the old bundle; reinstall
  to pick these up (not done — the user chose to commit and push instead).

## Gotchas

- **Only `[ai].command` is read**, but that gap is now announced: a config file
  whose `[ai]` header is commented out while `command = "…"` is live parses
  `command` as a _top-level_ key, and `loadConfig` warns about it. This is what
  made the original bug so confusing — the user's edit looked like it did nothing.
- The warning is emitted from `loadConfig` before the log level is set, so it
  shows even under `--quiet`. It fires only on genuinely unrecognized top-level
  keys.
- `--pure` and `--variant` no longer exist in opencode v2 (installed: v2.0.29).
  Variants are now part of the model string (`provider/model#variant`), and tool
  access is already denied by the `OPENCODE_PERMISSION` env var in the same
  command. The default avoids variant syntax entirely by not pinning a model.
- Model ids rot: the old default pinned `opencode/deepseek-v4-flash-free`, which
  `opencode models` no longer lists. Rather than pin another free model (an
  earlier attempt used `opencode/deepseek-v4.1-flash-free#low`), the default now
  pins nothing and defers to the user's opencode configuration.
- `readDefaultConfig()` resolves `src/default-config.toml` relative to
  `import.meta.url`, so an installed prosey reads that file at runtime — editing
  it does not require a rebuild, but `bin/prosey` (the bundle) does.

## Verification

- `bun test` → 185 pass.
- `bun run typecheck` → clean.
- End-to-end, user config (`[ai]` active): real run summarized 507 segments.
- End-to-end, config _without_ `[ai]` (bundled default path): real run summarized
  507 segments, using the repaired default command.
- Probe before writing the default: `opencode run` with the `OPENCODE_PERMISSION`
  env and the prompt on stdin, no `--model` → exit 0 (opencode used its own
  configured default model).
