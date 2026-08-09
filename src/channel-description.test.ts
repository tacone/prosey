import { describe, expect, test, mock } from "bun:test";
import { fetchChannelDescription } from "./channel-description";

function mockFetchResponse(data: unknown): void {
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  ) as unknown as typeof fetch;
}

describe("fetchChannelDescription", () => {
  test("calls the browse endpoint without an API key", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = ((url: any, init: any) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            metadata: {
              channelMetadataRenderer: { description: "Channel bio" },
            },
          }),
      });
    }) as unknown as typeof fetch;

    const desc = await fetchChannelDescription("UC123");
    expect(desc).toBe("Channel bio");

    expect(capturedUrl).toBe("https://www.youtube.com/youtubei/v1/browse");
    expect(capturedUrl).not.toContain("key=");
    expect(capturedInit!.method).toBe("POST");
    const body = JSON.parse(String(capturedInit!.body));
    expect(body.browseId).toBe("UC123");
  });

  test("returns undefined when response has no description", async () => {
    mockFetchResponse({ metadata: {} });
    expect(await fetchChannelDescription("UC123")).toBeUndefined();
  });

  test("returns undefined on network error", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("boom"))) as unknown as typeof fetch;
    expect(await fetchChannelDescription("UC123")).toBeUndefined();
  });
});
