export interface Chapter {
  time: number;
  title: string;
}

const lineRegex =
  /^\s*[\[\(]?(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2}))[\]\)]?(?:\s*[-–—:.]\s*|\s+)(.+)$/;

export function extractChapters(description: string): Chapter[] {
  const lines = description.split("\n");
  const chapters: Chapter[] = [];

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2]!, 10);
    const seconds = parseInt(match[3]!, 10);
    const title = match[4]!.trim();
    if (!title) continue;

    const time = hours * 3600 + minutes * 60 + seconds;
    chapters.push({ time, title });
  }

  chapters.sort((a, b) => a.time - b.time);

  const seen = new Set<number>();
  return chapters.filter((c) => {
    if (seen.has(c.time)) return false;
    seen.add(c.time);
    return true;
  });
}

export function formatChaptersAsText(chapters: Chapter[]): string {
  return chapters
    .map((c) => {
      const h = Math.floor(c.time / 3600);
      const m = Math.floor((c.time % 3600) / 60);
      const s = c.time % 60;
      const timeStr =
        h > 0
          ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${timeStr} ${c.title}`;
    })
    .join("\n");
}
