import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { join } from "node:path";

const BIN = join(import.meta.dir, "..", "bin", "prosey");

describe("dry-run", () => {
  test("is listed in help text", async () => {
    const { stdout } = await $`${BIN} --help`.quiet();
    expect(stdout.toString()).toContain("--dry-run");
  });
});
