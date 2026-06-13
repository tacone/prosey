import type { TranscriptSegment } from "youtube-transcript-plus";

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

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
