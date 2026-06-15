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
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>
${css}
:root {
  --pico-font-family: 'Plus Jakarta Sans', sans-serif;
  --pico-font-size: 120%;
  --pico-line-height: 1.78;
  --pico-font-weight: 300;
  --pico-blockquote-border-color: #9B8BF4;
}
@media (max-width: 767px) {
  :root {
    --pico-font-size: 110%;
    --pico-line-height: 1.50;

  }
}
h1 { --pico-font-size: 1.9rem; }
h2 { --pico-font-size: 1.5rem; }
h3 { --pico-font-size: 1.25rem; }
h4 { --pico-font-size: 1.1rem; }
h5 { --pico-font-size: 1rem; }
h6 { --pico-font-size: 0.85rem; }
h1, h2, h3, h4, h5, h6 {
  --pico-font-weight: 500;
  --pico-line-height: 1.25;
  margin-top: 0;
}
h1 {
  letter-spacing: -0.03em;
  margin-bottom: calc(var(--pico-typography-spacing-vertical) * 2);
}
li:last-child {
  margin-bottom: 0px;
}
blockquote {
  font-style: italic;
  font-size: 1.05rem;
  color: var(--pico-muted-color);
  padding-top: 0;
  padding-bottom: 0;
}
blockquote:first-child { margin-top: 0; }
blockquote:last-child { margin-bottom: 0; }
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
