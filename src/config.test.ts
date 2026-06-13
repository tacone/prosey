import { describe, expect, test, afterEach } from "bun:test";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { configPath, loadConfig } from "./config";

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
    expect(config).toEqual({});
    expect(existsSync(tmpConfig)).toBe(true);

    const content = await readFile(tmpConfig, "utf8");
    expect(content).toContain("[summarize]");
    expect(content).toContain('command = "ai summarize"');
  });

  test("reads existing config file", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;

    await loadConfig();
    const config = await loadConfig();
    expect(config.summarize?.prompt).toBeString();
    expect(config.summarize?.command).toBe("ai summarize");
  });

  test("handles invalid TOML gracefully", async () => {
    process.env.PROSEY_CONFIG_PATH = tmpConfig;
    await Bun.write(tmpConfig, "invalid [[\ntoml{{{");

    const config = await loadConfig();
    expect(config).toEqual({});
  });
});
