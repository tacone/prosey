export interface ChannelDescriptionResult {
  description?: string;
}

export async function fetchChannelDescription(channelId: string): Promise<string | undefined> {
  try {
    const resp = await fetch(`https://www.youtube.com/youtubei/v1/browse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240101.00.00" },
        },
        browseId: channelId,
      }),
    });
    const data: ChannelDescriptionResult = (await resp.json()) as ChannelDescriptionResult;
    return (data as any)?.metadata?.channelMetadataRenderer?.description;
  } catch {
    return undefined;
  }
}
