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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>
${css}
:root {
  --pico-font-family: 'IBM Plex Sans', sans-serif;
  --pico-line-height: 1.82;
  --pico-font-weight: 300;
  --pico-blockquote-border-color: #9B8BF4;
}
h1, h2, h3, h4, h5, h6 {
  --pico-font-weight: 500;
}
</style>
</head>
<body>
<main style="max-width:720px;margin:0 auto;padding:1rem">
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
