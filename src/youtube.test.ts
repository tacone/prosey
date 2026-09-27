import { describe, expect, test, afterEach } from "bun:test";
import { injectTokens, playerBlockMessage, buildPlayerFetch } from "./youtube";
import type { FetchParams } from "youtube-transcript-plus";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("injectTokens", () => {
  test("adds poToken and visitorData to the player body", () => {
    const body = JSON.stringify({ context: { client: { clientName: "ANDROID" } }, videoId: "x" });
    const out = injectTokens(body, { poToken: "TOK", visitorData: "VD" });
    const parsed = JSON.parse(out);
    expect(parsed.context.client.poToken).toBe("TOK");
    expect(parsed.context.client.visitorData).toBe("VD");
    expect(parsed.videoId).toBe("x");
  });

  test("leaves body unchanged when no tokens given", () => {
    const body = JSON.stringify({ context: { client: { clientName: "ANDROID" } } });
    expect(injectTokens(body, {})).toBe(body);
  });
});

describe("playerBlockMessage", () => {
  test("returns a hint for LOGIN_REQUIRED bot blocks", () => {
    const msg = playerBlockMessage({
      playabilityStatus: {
        status: "LOGIN_REQUIRED",
        reason: "Sign in to confirm you're not a bot",
      },
    });
    expect(msg).toContain("LOGIN_REQUIRED");
    expect(msg).toContain("VPN");
    expect(msg).toContain("po_token");
  });

  test("returns null when the video is playable", () => {
    expect(playerBlockMessage({ playabilityStatus: { status: "OK" } })).toBeNull();
  });

  test("returns null for an empty response", () => {
    expect(playerBlockMessage({})).toBeNull();
  });
});

describe("buildPlayerFetch", () => {
  test("injects tokens and surfaces an informative error on bot block", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({
          playabilityStatus: {
            status: "LOGIN_REQUIRED",
            reason: "Sign in to confirm you're not a bot",
          },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const pf = buildPlayerFetch({ poToken: "TOK", visitorData: "VD" });
    const params: FetchParams = {
      url: "https://www.youtube.com/youtubei/v1/player?key=k",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: { client: { clientName: "ANDROID" } }, videoId: "x" }),
    };

    await expect(pf(params)).rejects.toThrow(/VPN|po_token/);
    expect(JSON.parse(capturedBody!).context.client.poToken).toBe("TOK");
    expect(JSON.parse(capturedBody!).context.client.visitorData).toBe("VD");
  });

  test("passes through a playable response unchanged", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          playabilityStatus: { status: "OK" },
          captions: { playerCaptionsTracklistRenderer: { captionTracks: [] } },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const pf = buildPlayerFetch({});
    const res = await pf({ url: "u", method: "POST" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { playabilityStatus: { status: string } };
    expect(json.playabilityStatus.status).toBe("OK");
  });
});
