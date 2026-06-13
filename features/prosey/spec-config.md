# Prosey — Machine-wide Configuration

## 1. Purpose

Machine-wide TOML configuration file for prosey, designed for future
extensibility. CLI flags always take precedence over config file values.

## 2. Config location

Default path follows the XDG Base Directory spec:

- `$XDG_CONFIG_HOME/prosey/config.toml` → falls back to
  `~/.config/prosey/config.toml`
- macOS follows the same XDG convention.
- Override with the `PROSEY_CONFIG_PATH` environment variable.

## 3. Initialization

A default config template is bundled with the package. On first invocation, if
no config file exists, it is auto-copied to the config path. The user is free
to edit it afterward.

## 4. TOML schema

```toml
# Default prosey configuration
# Created automatically on first run. Edit as needed.

[summarize]
# Prompt sent to the command via stdin.
# Customize this to change how transcripts are summarized.
prompt = """
Summarize the following transcript.
Focus on the key points and main arguments.
"""

# Command to execute with the prompt piped via stdin.
command = "ai summarize"
```

## 5. Tech stack

- Format: TOML
- Parser: `js-toml` (https://github.com/sunnyadn/js-toml)
