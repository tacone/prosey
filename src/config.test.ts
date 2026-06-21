import { describe, expect, test, afterEach } from "bun:test";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { configPath, loadConfig, resetConfig, mergeOverDefaults } from "./config";
import type { ProseyConfig } from "./config";

const ORIGINAL_XDG = process.env.XDG_CONFIG_HOME;
const ORIGINAL_PROSEY_CONFIG = process.env.PROSEY_CONFIG_PATH;

afterEach(() => {
  if (ORIGINAL_XDG) process.env.XDG_CONFIG_HOME = ORIGINAL_XDG;
  else delete process.env.XDG_CONFIG_HOME;
  if (ORIGINAL_PROSEY_CONFIG) process.env.PROSEY_CONFIG_PATH = ORIGINAL_PROSEY_CONFIG;
  else delete process.env.PROSEY_CONFIG_PATH;
});

describe("configPath", () => {
  test("default path uses XDG_CONFIG_HOME when set", () => {
    process.env.XDG_CONFIG_HOME = "/custom/xdg";
    delete process.env.PROSEY_CONFIG_PATH;
    expect(configPath()).toBe("/custom/xdg/prosey/config.toml");
  });

  test("default path falls back to ~/.config", () => {
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.PROSEY_CONFIG_PATH;
    expect(configPath()).toBe(join(homedir(), ".config", "prosey", "config.toml"));
  });

  test("PROSEY_CONFIG_PATH overrides everything", () => {
    process.env.XDG_CONFIG_HOME = "/custom/xdg";
    process.env.PROSEY_CONFIG_PATH = "/override/path/config.toml";
    expect(configPath()).toBe("/override/path/config.toml");
  });
});

describe("loadConfig", () => {
  const tmpConfig = join(import.meta.dir, "..", "tmp-test-config.toml");

  afterEach(async () => {
    try {
      await rm(tmpConfig);
    } catch {}
  });

  test("auto-creates config file when missing", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;
    expect(existsSync(tmpConfig)).toBe(false);

    const config = await loadConfig();
    expect(config.pager).toBe("auto");
    expect(config.hints).toBe(true);
    expect(config.format).toBe("html");
    expect(config.ai?.command).toBeString();
    expect(config.summarize?.prompt).toBeString();
    expect(existsSync(tmpConfig)).toBe(true);

    const content = await readFile(tmpConfig, "utf8");
    expect(content).toContain("[ai]");
    expect(content).toContain("[summarize]");
    expect(content).toContain("[transcribe]");
    expect(content).toContain("command = ");
  });

  test("reads existing config file", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;

    await loadConfig();
    const config = await loadConfig();
    expect(config.summarize?.prompt).toBeString();
    expect(config.ai?.command).toBeString();
  });

  test("handles invalid TOML gracefully", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;
    await Bun.write(tmpConfig, "invalid [[\ntoml{{{");

    const config = await loadConfig();
    expect(config.pager).toBe("auto");
    expect(config.hints).toBe(true);
    expect(config.format).toBe("html");
    expect(config.ai?.command).toBeString();
  });
});

describe("resetConfig", () => {
  const tmpConfig = join(import.meta.dir, "..", "tmp-reset-config.toml");

  afterEach(async () => {
    try {
      await rm(tmpConfig);
    } catch {}
  });

  test("reset + load returns full defaults", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;

    await resetConfig();
    const config = await loadConfig();
    expect(config.pager).toBe("auto");
    expect(config.hints).toBe(true);
    expect(config.format).toBe("html");
    expect(config.ai?.command).toBeString();
    expect(config.summarize?.prompt).toBeString();
    expect(config.transcribe?.prompt).toBeString();
  });

  test("overwrites existing file with commented defaults", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;

    await Bun.write(tmpConfig, "# garbage");
    const path = await resetConfig();
    expect(path).toBe(tmpConfig);

    const content = await readFile(tmpConfig, "utf8");
    expect(content).toContain("# [summarize]");
    expect(content).toContain("# command = ");
  });
});

describe("mergeOverDefaults", () => {
  const defaults: ProseyConfig = {
    pager: "auto",
    hints: true,
    format: "html",
    ai: { command: "opencode run" },
    summarize: { prompt: "default summary", command: "opencode run" },
    transcribe: { prompt: "default transcribe" },
  };

  test("empty user config returns defaults", () => {
    const result = mergeOverDefaults({}, defaults);
    expect(result.pager).toBe("auto");
    expect(result.hints).toBe(true);
    expect(result.format).toBe("html");
    expect(result.ai?.command).toBe("opencode run");
    expect(result.summarize?.prompt).toBe("default summary");
    expect(result.transcribe?.prompt).toBe("default transcribe");
  });

  test("user pager overrides default", () => {
    const result = mergeOverDefaults({ pager: "less" }, defaults);
    expect(result.pager).toBe("less");
    expect(result.hints).toBe(true);
  });

  test("user hints overrides default", () => {
    const result = mergeOverDefaults({ hints: false }, defaults);
    expect(result.hints).toBe(false);
    expect(result.pager).toBe("auto");
  });

  test("user format overrides default", () => {
    const result = mergeOverDefaults({ format: "markdown" }, defaults);
    expect(result.format).toBe("markdown");
    expect(result.hints).toBe(true);
  });

  test("user ai.command overrides default", () => {
    const result = mergeOverDefaults({ ai: { command: "my-cmd" } }, defaults);
    expect(result.ai?.command).toBe("my-cmd");
    expect(result.summarize?.prompt).toBe("default summary");
  });

  test("user summarize.prompt overrides default", () => {
    const result = mergeOverDefaults({ summarize: { prompt: "my prompt" } }, defaults);
    expect(result.summarize?.prompt).toBe("my prompt");
    expect(result.summarize?.command).toBe("opencode run");
  });

  test("user transcribe.prompt overrides default", () => {
    const result = mergeOverDefaults({ transcribe: { prompt: "my transcribe" } }, defaults);
    expect(result.transcribe?.prompt).toBe("my transcribe");
    expect(result.summarize?.prompt).toBe("default summary");
  });

  test("all user values override all defaults", () => {
    const result = mergeOverDefaults(
      {
        pager: "custom",
        hints: false,
        ai: { command: "custom-ai" },
        summarize: { command: "custom-sum", prompt: "custom-sum-prompt" },
        transcribe: { command: "custom-trans", prompt: "custom-trans-prompt" },
      },
      defaults,
    );
    expect(result.pager).toBe("custom");
    expect(result.hints).toBe(false);
    expect(result.ai?.command).toBe("custom-ai");
    expect(result.summarize?.command).toBe("custom-sum");
    expect(result.summarize?.prompt).toBe("custom-sum-prompt");
    expect(result.transcribe?.command).toBe("custom-trans");
    expect(result.transcribe?.prompt).toBe("custom-trans-prompt");
  });
});
