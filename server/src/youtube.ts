import { canSpend, spend, isExhausted, spendSearch, markExhausted } from "./quota.js";

export class QuotaExhaustedError extends Error {}

const BASE = "https://www.googleapis.com/youtube/v3";
const KEY = () => {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error("YOUTUBE_API_KEY não definida");
  return k;
};

async function call(path: string, params: Record<string, string>, cost: number) {
  const isSearch = path === "search";
  if (!canSpend(cost) || (isSearch && isExhausted()))
    throw new QuotaExhaustedError("Cota diária esgotada");
  const url = `${BASE}/${path}?${new URLSearchParams({ ...params, key: KEY() })}`;
  const res = await fetch(url);
  spend(cost); // erros também podem consumir cota
  if (isSearch) spendSearch();
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 && body.includes("quotaExceeded")) {
      markExhausted();
      throw new QuotaExhaustedError(`YouTube API 403 quotaExceeded: ${body}`);
    }
    throw new Error(`YouTube API ${res.status}: ${body}`);
  }
  return res.json() as Promise<any>;
}

/** search.list custa 100 unidades por página (até 50 resultados cada). */
export async function searchLiveIds(opts: { categoryId?: string; query?: string; pages?: number; regionCode?: string; lang?: string }) {
  const params: Record<string, string> = {
    part: "id",
    type: "video",
    eventType: "live",
    regionCode: opts.regionCode ?? "BR",
    relevanceLanguage: opts.lang ?? "pt",
    maxResults: "50",
    order: "viewCount",
  };
  if (opts.categoryId) params.videoCategoryId = opts.categoryId;
  if (opts.query) params.q = opts.query;
  const ids = new Set<string>();
  let pageToken: string | undefined;
  for (let p = 0; p < (opts.pages ?? 1); p++) {
    try {
      const data = await call("search", pageToken ? { ...params, pageToken } : params, 100);
      for (const i of data.items ?? []) if (i.id?.videoId) ids.add(i.id.videoId as string);
      pageToken = data.nextPageToken;
    } catch (e) {
      if (p === 0) throw e; // falha na primeira página: propaga
      console.error("[coletor] página", p + 1, (e as Error).message);
      break;
    }
    if (!pageToken) break;
  }
  return [...ids];
}

export interface LiveVideo {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  language: string | null;
  viewers: number;
  isLive: boolean;
  platform?: "youtube" | "twitch";
  categoryId?: string;
  /** vídeo comum (sem liveStreamingDetails) */
  isVod?: boolean;
}

/** videos.list custa 1 unidade por chamada (até 50 ids). */
export async function getVideos(ids: string[]): Promise<LiveVideo[]> {
  const out: LiveVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await call(
      "videos",
      { part: "snippet,liveStreamingDetails", id: ids.slice(i, i + 50).join(",") },
      1
    );
    for (const v of data.items ?? []) {
      const d = v.liveStreamingDetails;
      const t = v.snippet.thumbnails;
      out.push({
        id: v.id,
        title: v.snippet.title,
        channelId: v.snippet.channelId,
        channelTitle: v.snippet.channelTitle,
        thumbnail: (t.maxres ?? t.high ?? t.medium ?? t.default).url,
        language: v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage ?? null,
        viewers: Number(d?.concurrentViewers ?? 0),
        isLive: !!d && !!d.actualStartTime && !d.actualEndTime,
        categoryId: v.snippet.categoryId,
        isVod: !d,
      });
    }
  }
  return out;
}

/** Feed RSS do canal: não consome cota. Retorna ids dos vídeos recentes. */
export async function fetchChannelFeed(channelId: string): Promise<string[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)].map((m) => m[1]);
}
