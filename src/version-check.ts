import { debug } from "./debug";
import pkg from "../package.json";

const TIMEOUT_MS = 3000;

const registryUrl = `https://registry.npmjs.org/${pkg.name}/latest`;

export async function checkVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(registryUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      debug("Version check failed: HTTP", res.status);
      return null;
    }

    const data = (await res.json()) as { version?: string };
    if (!data.version) {
      debug("Version check: no version field in response");
      return null;
    }

    return data.version;
  } catch (err) {
    debug("Version check error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
