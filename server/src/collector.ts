import { db } from "./db.js";
import { CATEGORIES, slugFromYoutubeId } from "./categories.js";
import { getVideos, searchLiveIds, fetchChannelFeed, QuotaExhaustedError } from "./youtube.js";
import { remaining, isExhausted, nextResetAt, SEARCH_LIMIT } from "./quota.js";
import { getTwitchStreams, twitchEnabled } from "./twitch.js";

const upsert = db.prepare(`
INSERT INTO lives(id,title,channel_id,channel_title,thumbnail,category,language,viewers,is_live,updated_at,platform,country)
VALUES(@id,@title,@channelId,@channelTitle,@thumbnail,@category,@language,@viewers,@isLive,@now,@platform,@country)
ON CONFLICT(id) DO UPDATE SET title=@title, thumbnail=@thumbnail, viewers=@viewers, category=@category,
  is_live=@isLive, language=@language, updated_at=@now, country=COALESCE(@country,country)`);
const endLive = db.prepare("UPDATE lives SET is_live=0, updated_at=? WHERE id=? AND is_live=1");
const touchChannel = db.prepare(`INSERT INTO channels(id,title,last_live_at,last_checked_at) VALUES(?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET title=excluded.title,
    last_live_at=MAX(last_live_at,excluded.last_live_at), last_checked_at=MAX(last_checked_at,excluded.last_checked_at)`);

export const PAGES = Math.min(Math.max(Number(process.env.PAGES_PER_QUERY ?? 1) || 1, 1), 10);
const num = (k: string, d: number) => Number(process.env[k] ?? d) || d;
const setLast = db.prepare(
  "INSERT INTO collections(category,last_at) VALUES(?,?) ON CONFLICT(category) DO UPDATE SET last_at=excluded.last_at"
);
const getLast = db.prepare("SELECT last_at FROM collections WHERE category=?");

export const lastUpdatedAt = (slug: string): number | null =>
  (getLast.get(slug) as { last_at: number } | undefined)?.last_at ?? null;

let nextWatchAt: number | null = null;
/** Estimativa (epoch ms) da próxima atualização (vigilância), ou null se desligado. */
export function nextUpdateAt(_slug: string): number | null {
  return nextWatchAt === null ? null : Math.max(Date.now(), nextWatchAt);
}

/** Vídeos comuns já vistos (não são lives): não precisam ser reconsultados. */
const seen = new Set<string>();
const SEEN_MAX = 50000;

type Videos = Awaited<ReturnType<typeof getVideos>>;

/** Grava os vídeos; a categoria vem de snippet.categoryId. Retorna qtd de lives. */
function ingest(videos: Videos, previouslyLive: string[], country: string | null = null) {
  const now = Date.now();
  let lives = 0;
  const returned = new Set<string>();
  db.transaction(() => {
    for (const v of videos) {
      returned.add(v.id);
      if (v.isLive) {
        lives++;
        upsert.run({ ...v, platform: "youtube", country, isLive: 1, category: slugFromYoutubeId(v.categoryId), now });
        touchChannel.run(v.channelId, v.channelTitle, now, now);
      } else {
        endLive.run(now, v.id);
        if (v.isVod) {
          if (seen.size > SEEN_MAX) seen.clear();
          seen.add(v.id);
        }
      }
    }
    // lives conhecidas que não voltaram (apagadas/privadas): encerra
    for (const id of previouslyLive) if (!returned.has(id)) endLive.run(now, id);
  })();
  return lives;
}

/** Descoberta (cara): search.list; a categoria real vem do videos.list. */
// Rodízio: 1 busca por ciclo (custo igual ao anterior). BR por categoria; demais países sem categoria.
const REGIONS = [
  { country: "PT", lang: "pt" },
  { country: "US", lang: "en" },
  { country: "ES", lang: "es" },
  { country: "MX", lang: "es" },
];
const ROTATION: { country: string; lang: string; categoryId?: string; label: string }[] = [
  ...CATEGORIES.filter((c) => ["jogos", "esportes", "musica", "geral"].includes(c.slug)).flatMap((c, i) => [
    { country: "BR", lang: "pt", categoryId: c.youtubeId, label: c.slug },
    ...(REGIONS[i] ? [{ ...REGIONS[i], label: "geral" }] : []),
  ]),
];
let discIdx = 0;

export async function discover() {
  const q = ROTATION[discIdx % ROTATION.length];
  const ids = await searchLiveIds({ categoryId: q.categoryId, regionCode: q.country, lang: q.lang, pages: PAGES });
  const n = ingest(await getVideos(ids), [], q.country);
  discIdx++;
  console.log(`[descoberta] ${q.country}/${q.label}: ${n} lives | cota restante ${remaining()}`);
}

/** Vigilância (RSS grátis + 1 un/50 ids): canais conhecidos e lives ativas. */
export async function watch() {
  const batch = num("WATCH_BATCH", 80);
  const conc = num("WATCH_CONCURRENCY", 5);
  const now = Date.now();
  // Menos checados primeiro; inativos há >7 dias só a cada 6h.
  const channels = db
    .prepare(
      `SELECT id FROM channels
       WHERE last_live_at > ? OR last_checked_at < ?
       ORDER BY last_checked_at ASC LIMIT ?`
    )
    .all(now - 7 * 86400000, now - 6 * 3600000, batch) as { id: string }[];

  const active = (
    db.prepare("SELECT id FROM lives WHERE platform='youtube' AND is_live=1").all() as { id: string }[]
  ).map((r) => r.id);
  const ids = new Set<string>(active);
  const mark = db.prepare("UPDATE channels SET last_checked_at=? WHERE id=?");
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(conc, channels.length) }, async () => {
      while (i < channels.length) {
        const ch = channels[i++];
        try {
          for (const id of await fetchChannelFeed(ch.id)) if (!seen.has(id)) ids.add(id);
        } catch (e) {
          console.warn(`[vigia] RSS ${ch.id}: ${(e as Error).message}`);
        }
        mark.run(Date.now(), ch.id);
      }
    })
  );
  const list = [...ids];
  const n = ingest(await getVideos(list), active);
  const t = Date.now();
  for (const c of CATEGORIES) setLast.run(c.slug, t);
  console.log(`[vigia] ${channels.length} canais, ${list.length} ids, ${n} lives | cota restante ${remaining()}`);
}

function loop(
  name: string,
  intervalMs: number,
  fn: () => Promise<void>,
  onSchedule?: (at: number) => void,
  startDelay = 0
) {
  let failures = 0;
  const tick = async () => {
    let delay = intervalMs;
    if (name === "descoberta" && isExhausted()) {
      delay = Math.max(60000, nextResetAt() - Date.now());
      console.warn(`[${name}] limite de buscas atingido; pausado até ${new Date(nextResetAt()).toISOString()}`);
    } else {
      try {
        await fn();
        failures = 0;
      } catch (e) {
        console.error(`[${name}]`, (e as Error).message);
        if (e instanceof QuotaExhaustedError) delay = Math.max(60000, nextResetAt() - Date.now());
        else delay = Math.min(intervalMs * 2 ** Math.min(++failures, 2), 4 * intervalMs);
      }
    }
    onSchedule?.(Date.now() + delay);
    setTimeout(tick, delay);
  };
  onSchedule?.(Date.now() + startDelay);
  setTimeout(tick, startDelay);
}

/**
 * Dois ciclos: descoberta (search.list, 100 un) rara e vigilância por RSS
 * (sem cota) + videos.list (1 un/50 ids) frequente.
 */
export function startCollector() {
  const discMs = num("DISCOVERY_INTERVAL_MIN", 25) * 60000;
  const watchMs = num("WATCH_INTERVAL_MIN", 4) * 60000;
  const discPerDay = Math.ceil(86400000 / discMs) * PAGES;
  const watchPerDay = Math.ceil(86400000 / watchMs);
  const cost = discPerDay * 101 + watchPerDay * 6;
  if (discPerDay > SEARCH_LIMIT)
    console.warn(`[coletor] ~${discPerDay} buscas/dia excede o limite ${SEARCH_LIMIT}`);
  if (cost > num("DAILY_QUOTA", 10000)) console.warn(`[coletor] custo estimado ~${cost}/dia excede a cota`);
  console.log(
    `[coletor] descoberta a cada ${discMs / 60000} min (~${discPerDay} buscas/dia), vigilância a cada ${watchMs / 60000} min (~${cost} un/dia)`
  );
  loop("descoberta", discMs, discover);
  loop("vigia", watchMs, watch, (at) => (nextWatchAt = at), 15000);
}

const TWITCH_PAGES = Math.min(Math.max(num("TWITCH_PAGES", 5), 1), 10);

/** Twitch: sem cota diária; uma coleta única (idioma pt) entra na categoria "geral". */
async function collectTwitch() {
  const streams: Awaited<ReturnType<typeof getTwitchStreams>> = [];
  for (const lang of ["pt", "en", "es"]) streams.push(...(await getTwitchStreams(TWITCH_PAGES, lang)));
  const now = Date.now();
  db.transaction(() => {
    for (const v of streams)
      upsert.run({ ...v, platform: "twitch", country: null, isLive: 1, category: "geral", now });
    db.prepare("UPDATE lives SET is_live=0 WHERE platform='twitch' AND updated_at<? AND is_live=1").run(now);
  })();
  console.log(`[twitch] ${streams.length} lives`);
}

export function startTwitchCollector() {
  if (!twitchEnabled()) return;
  const ms = Math.max(1, Number(process.env.TWITCH_INTERVAL_MIN ?? 5) || 5) * 60000;
  const tick = async () => {
    try { await collectTwitch(); } catch (e) { console.error("[twitch]", (e as Error).message); }
    setTimeout(tick, ms);
  };
  tick();
}
