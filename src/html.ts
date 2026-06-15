import { marked } from "marked";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

const PICO_CSS_URL = "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css";

let cachedCss: string | null = null;

async function getPicoCss(): Promise<string> {
  if (cachedCss) return cachedCss;
  const res = await fetch(PICO_CSS_URL);
  cachedCss = await res.text();
  return cachedCss;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateHtml(markdown: string, title?: string): Promise<string> {
  const [css, body] = await Promise.all([getPicoCss(), marked.parse(markdown)]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title ?? "Prosey")}</title>
<style>${css}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

export function openInBrowser(htmlPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let proc: ChildProcess;
    const { platform } = process;

    if (platform === "darwin") {
      proc = spawn("open", [htmlPath], { stdio: "ignore" });
    } else if (platform === "win32") {
      proc = spawn("cmd", ["/c", "start", "", htmlPath], {
        stdio: "ignore",
        shell: true,
      });
    } else {
      proc = spawn("xdg-open", [htmlPath], { stdio: "ignore" });
    }

    proc.on("error", () => {
      resolve();
    });

    proc.on("exit", () => {
      resolve();
    });

    setTimeout(() => resolve(), 5000);
  });
}
