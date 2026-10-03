import {
  fetchTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript-plus";
import type {
  FetchParams,
  TranscriptConfig,
  TranscriptResult,
  TranscriptSegment,
} from "youtube-transcript-plus";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface YoutubeTokens {
  poToken?: string;
  visitorData?: string;
}

export function injectTokens(body: string, tokens: YoutubeTokens): string {
  const parsed = JSON.parse(body) as {
    context?: { client?: Record<string, unknown> };
  };
  const client = ((parsed.context ??= { client: {} }).client ??= {});
  if (tokens.poToken) client.poToken = tokens.poToken;
  if (tokens.visitorData) client.visitorData = tokens.visitorData;
  return JSON.stringify(parsed);
}

export function playerBlockMessage(json: unknown): string | null {
  const status = (json as { playabilityStatus?: { status?: string; reason?: string } })
    ?.playabilityStatus;
  if (status?.status === "LOGIN_REQUIRED") {
    const reason = status.reason ? ` — ${status.reason}` : "";
    return `YouTube blocked the transcript request (playability: LOGIN_REQUIRED${reason}). This usually happens behind a VPN or proxy. Try without it, or set po_token and visitor_data in the [youtube] section of your config.`;
  }
  return null;
}

export function buildPlayerFetch(tokens: YoutubeTokens) {
  return async (params: FetchParams): Promise<Response> => {
    const headers: Record<string, string> = { ...params.headers };
    headers["User-Agent"] ??= params.userAgent ?? DEFAULT_USER_AGENT;
    if (params.lang && !headers["Accept-Language"]) headers["Accept-Language"] = params.lang;

    const body =
      tokens.poToken || tokens.visitorData
        ? injectTokens(params.body ?? "{}", tokens)
        : params.body;

    const res = await fetch(params.url, {
      method: params.method ?? "POST",
      headers,
      body,
      signal: params.signal,
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response — pass through
    }
    const message = json ? playerBlockMessage(json) : null;
    if (message) throw new Error(message);

    return new Response(text, { status: res.status, headers: res.headers });
  };
}

export function buildFetchOptions(
  youtube: YoutubeTokens,
  extra: { lang?: string; videoDetails?: boolean } = {},
): TranscriptConfig {
  return { ...extra, playerFetch: buildPlayerFetch(youtube) };
}

export function pickLanguage(preferred: string[], available: string[]): string | undefined {
  for (const pref of preferred) {
    if (available.includes(pref)) return pref;
    const prefix = available.find((a) => a.startsWith(`${pref}-`) || pref.startsWith(`${a}-`));
    if (prefix) return prefix;
  }
  return undefined;
}

export async function fetchPreferred(
  videoId: string,
  youtube: YoutubeTokens,
  preferred: string[],
  extra: { videoDetails?: boolean } = {},
): Promise<TranscriptResult | TranscriptSegment[]> {
  const opts = buildFetchOptions(youtube, extra);
  if (preferred.length === 0) return fetchTranscript(videoId, opts);

  try {
    return await fetchTranscript(videoId, { ...opts, lang: preferred[0] });
  } catch (err) {
    if (!(err instanceof YoutubeTranscriptNotAvailableLanguageError)) throw err;
    const available = err.availableLangs ?? [];
    const lang = pickLanguage(preferred, available) ?? available[0];
    return lang ? fetchTranscript(videoId, { ...opts, lang }) : fetchTranscript(videoId, opts);
  }
}
