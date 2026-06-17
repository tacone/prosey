import type { TranscriptSegment } from "youtube-transcript-plus";

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatReadableDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&(\w+);/g, (_, name) => namedEntities[name] ?? `&${name};`);
}

export function formatWithTimestamps(segments: TranscriptSegment[], decode: boolean): string {
  return segments
    .map((s) => {
      const text = decode ? decodeEntities(s.text) : s.text;
      return `[${formatTime(s.offset)}] ${text}`;
    })
    .join("\n");
}

export function toText(segments: TranscriptSegment[], decode: boolean): string {
  return segments
    .map((s) => (decode ? decodeEntities(s.text) : s.text))
    .join(" ")
    .replace(/ +/g, " ");
}

export function toJSON(segments: TranscriptSegment[], decode: boolean): string {
  const data = segments.map((s) => ({
    text: decode ? decodeEntities(s.text) : s.text,
    offset: s.offset,
    duration: s.duration,
    timestamp: formatTime(s.offset),
  }));
  return JSON.stringify(data, null, 2);
}
