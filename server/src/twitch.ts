import type { LiveVideo } from "./youtube.js";

let token: { value: string; expiresAt: number } | null = null;

export const twitchEnabled = () =>
  !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET;

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Twitch auth ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return token.value;
}

/** Streams ao vivo em português, ordenadas por espectadores. channelId = login (usado no embed). */
export async function getTwitchStreams(pages = 1): Promise<LiveVideo[]> {
  const out: LiveVideo[] = [];
  let cursor: string | undefined;
  for (let p = 0; p < pages; p++) {
    const params = new URLSearchParams({ language: "pt", first: "100", type: "live" });
    if (cursor) params.set("after", cursor);
    const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: { Authorization: `Bearer ${await getToken()}`, "Client-Id": process.env.TWITCH_CLIENT_ID! },
    });
    if (res.status === 401) token = null;
    if (!res.ok) throw new Error(`Twitch API ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { data: any[]; pagination?: { cursor?: string } };
    for (const s of j.data) {
      out.push({
        id: `twitch:${s.id}`,
        title: s.title,
        channelId: s.user_login,
        channelTitle: s.user_name,
        thumbnail: String(s.thumbnail_url).replace("{width}", "640").replace("{height}", "360"),
        language: s.language ?? null,
        viewers: s.viewer_count ?? 0,
        isLive: true,
        platform: "twitch",
      });
    }
    cursor = j.pagination?.cursor;
    if (!cursor) break;
  }
  return out;
}
