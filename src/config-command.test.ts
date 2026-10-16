import { describe, expect, test, afterEach } from "bun:test";
import { $ } from "bun";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const testConfigPath = "/tmp/prosey-test-config.toml";

afterEach(async () => {
  try {
    await rm(testConfigPath);
  } catch {}
  delete process.env.PROSEY_CONFIG_PATH;
});

describe("config subcommand", () => {
  test("prints config path when EDITOR is not set", async () => {
    delete process.env.EDITOR;
    process.env.PROSEY_CONFIG_PATH = testConfigPath;

    const { stdout, exitCode } = await $`bin/prosey config`.quiet();

    expect(exitCode).toBe(0);
    expect(stdout.toString().trim()).toBe(testConfigPath);
  });

  test("prints config path without spawning the editor when not attached to a TTY", async () => {
    process.env.EDITOR = "cat";
    process.env.PROSEY_CONFIG_PATH = testConfigPath;

    const { stdout, exitCode } = await $`bin/prosey config`.quiet();

    expect(exitCode).toBe(0);
    expect(stdout.toString().trim()).toBe(testConfigPath);
  });

  test("creates config file when missing", async () => {
    delete process.env.EDITOR;
    process.env.PROSEY_CONFIG_PATH = testConfigPath;

    expect(existsSync(testConfigPath)).toBe(false);
    await $`bin/prosey config`.quiet();
    expect(existsSync(testConfigPath)).toBe(true);
  });

  test("does not require a video ID", async () => {
    delete process.env.EDITOR;
    process.env.PROSEY_CONFIG_PATH = testConfigPath;

    const { exitCode } = await $`bin/prosey config`.quiet();
    expect(exitCode).toBe(0);
  });
});
