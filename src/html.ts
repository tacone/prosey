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

const LOGO_SVG = `<svg width="100" viewBox="92 120 264 68" role="img" title="Prosey" xmlns="http://www.w3.org/2000/svg">
  <title>Prosey</title>
  <path d="M100,545 a4,4 0 0 0-4,4 v50 a4,4 0 0 0 6,3.46 l43,-25 a4,4 0 0 0 0,-6.93 l-43,-25 a4,4 0 0 0-2,-0.53 Z" transform="translate(0,-405)" fill="#9B8BF4" opacity="0.25"/>
  <path d="M96,130 C96,126 99,124 102,126 L145,149 C148,151 148,155 145,157 L102,180 C99,182 96,180 96,176 Z" fill="none" stroke="#9B8BF4" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M96,130 C96,126 99,124 102,126 L145,149 C148,151 148,155 145,157 L102,180 C99,182 96,180 96,176 Z" fill="#9B8BF4" opacity="0.18"/>
  <path d="M162,142 L178,154 L162,166" fill="none" stroke="#9B8BF4" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M176,142 L192,154 L176,166" fill="none" stroke="#9B8BF4" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="212" y="138" width="140" height="12" rx="6" fill="#9B8BF4" opacity="0.85"/>
  <rect x="212" y="155" width="116" height="12" rx="6" fill="#9B8BF4" opacity="0.55"/>
  <rect x="212" y="172" width="130" height="12" rx="6" fill="#9B8BF4" opacity="0.3"/>
</svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watchMetaHtml(duration: number, wordCount: number, videoId: string): string {
  const h = Math.floor(duration / 3600);
  const m = Math.round((duration % 3600) / 60);
  const durStr = h > 0 ? `${h} h ${m} min` : `${m} min`;
  const readTime = Math.ceil(wordCount / 200);
  const url = `https://youtube.com/watch?v=${videoId}`;
  const separator = '<span style="opacity: 0.4">&nbsp;&nbsp;|&nbsp;&nbsp;</span>';
  return `<a href="${url}" class="watch-link">${durStr} watch</a> ${separator} ${readTime} min read`;
}

export async function generateHtml(
  markdown: string,
  title?: string,
  watchMeta?: { videoId: string; duration: number; wordCount: number },
): Promise<string> {
  const [css, body] = await Promise.all([getPicoCss(), marked.parse(markdown)]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title ? escapeHtml(title) + " - Prosey" : "Prosey"}</title>
<script>(function(){var m=localStorage.getItem('prosey-theme'),t=m||'auto';if(t==='auto')t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);if(!m)localStorage.setItem('prosey-theme','auto')})();</script>
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
main.content {
  max-width: 50em;
  margin: 0 auto;
  padding: 0 1rem;
}
@media (max-width: 767px) {
  main.content {
    margin-top: 0rem;
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
  margin-top: 0.1em;
  margin-bottom: 0.666em;
}
h1 {
  letter-spacing: -0.03em;
  margin-top: calc(var(--pico-typography-spacing-vertical) * 2);
  margin-bottom: calc(var(--pico-typography-spacing-vertical) * 2);
}
@media (max-width: 767px) {
  h1 {
    margin-top: calc(var(--pico-typography-spacing-vertical) * 2);
    margin-bottom: calc(var(--pico-typography-spacing-vertical) * 2);
    text-align: center;
  }
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
* { transition: all 0.3s; }
#theme-btn, #theme-btn:focus, #theme-btn:active, #theme-btn:hover { box-shadow: none !important; }
#theme-btn:focus, #theme-btn:active { outline: none !important; }
#theme-btn:hover, #theme-btn:focus, #theme-btn:active { opacity: 1 !important; }
img[alt="Prosey"] { filter: grayscale(100%); }
img[alt="Prosey"]:hover, img[alt="Prosey"]:active, img[alt="Prosey"]:focus { filter: grayscale(0%); }
.watch-link { color: inherit; text-decoration: none; }
.watch-link:hover { text-decoration: underline; }
</style>
</head>
<body>
<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1rem 0">
<img src="${LOGO_DATA_URI}" alt="Prosey" title="Prosey" style="vertical-align:top;flex-shrink:0">
<div style="flex:1;text-align:center;font-size:.85rem;color:var(--pico-muted-color)">${watchMeta ? watchMetaHtml(watchMeta.duration, watchMeta.wordCount, watchMeta.videoId) : ""}</div>
<button id="theme-btn" type="button" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;opacity:.5;filter:grayscale(100%);transition:all 0.3s;flex-shrink:0">💡</button>
</div>
<main class="content">
${body}
</main>
<script>
(function(){var b=document.getElementById('theme-btn'),icons={auto:'\u{1F4A1}',light:'\u2600\uFE0F',dark:'\u{1F319}'};function apply(m){var t=m;if(t==='auto')t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);localStorage.setItem('prosey-theme',m);b.textContent=icons[m]}b.addEventListener('click',function(){var m=localStorage.getItem('prosey-theme')||'auto',d=window.matchMedia('(prefers-color-scheme:dark)').matches;apply(d?{auto:'light',light:'dark',dark:'auto'}[m]:{auto:'dark',dark:'light',light:'auto'}[m])});apply(localStorage.getItem('prosey-theme')||'auto')})();
</script>
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
