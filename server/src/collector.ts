import { db } from "./db.js";
import { CATEGORIES } from "./categories.js";
import { getVideos, searchLiveIds, QuotaExhaustedError } from "./youtube.js";
import { remaining, isExhausted, nextResetAt, SEARCH_LIMIT } from "./quota.js";
import { getTwitchStreams, twitchEnabled } from "./twitch.js";

const upsert = db.prepare(`
INSERT INTO lives(id,title,channel_id,channel_title,thumbnail,category,language,viewers,is_live,updated_at,platform)
VALUES(@id,@title,@channelId,@channelTitle,@thumbnail,@category,@language,@viewers,@isLive,@now,@platform)
ON CONFLICT(id) DO UPDATE SET title=@title, thumbnail=@thumbnail, viewers=@viewers,
  is_live=@isLive, language=@language, updated_at=@now`);

export const PAGES = Math.min(Math.max(Number(process.env.PAGES_PER_QUERY ?? 1) || 1, 1), 10);
const setLast = db.prepare(
  "INSERT INTO collections(category,last_at) VALUES(?,?) ON CONFLICT(category) DO UPDATE SET last_at=excluded.last_at"
);
const getLast = db.prepare("SELECT last_at FROM collections WHERE category=?");

export const lastUpdatedAt = (slug: string): number | null =>
  (getLast.get(slug) as { last_at: number } | undefined)?.last_at ?? null;

let sched: { nextIdx: number; nextRunAt: number; intervalMs: number } | null = null;

/** Estimativa (epoch ms) da próxima coleta da categoria, ou null se o coletor está desligado. */
export function nextUpdateAt(slug: string): number | null {
  if (!sched) return null;
  const k = CATEGORIES.findIndex((c) => c.slug === slug);
  if (k < 0) return null;
  const n = CATEGORIES.length;
  const dist = (k - sched.nextIdx + n) % n;
  return Math.max(Date.now(), sched.nextRunAt) + dist * sched.intervalMs;
}

export async function collectCategory(index: number) {
  const cat = CATEGORIES[index % CATEGORIES.length];
  await doCollect(cat);
  setLast.run(cat.slug, Date.now()); // só registra quando a coleta deu certo
}

async function doCollect(cat: (typeof CATEGORIES)[number]) {
  const ids = await searchLiveIds({ categoryId: cat.youtubeId, pages: PAGES });
  const videos = await getVideos(ids);
  const now = Date.now();
  db.transaction(() => {
    for (const v of videos)
      upsert.run({ ...v, platform: "youtube", isLive: v.isLive ? 1 : 0, category: cat.slug, now });
    // Lives da categoria que não vieram mais: marca como encerradas.
    db.prepare(
      "UPDATE lives SET is_live=0 WHERE platform='youtube' AND category=? AND updated_at<? AND is_live=1"
    ).run(cat.slug, now);
  })();
  console.log(`[coletor] ${cat.slug}: ${videos.length} lives | cota restante ${remaining()}`);
}

/**
 * Rotaciona categorias. Cada ciclo custa ~101 unidades por página; o intervalo
 * é calculado para caber na cota diária (padrão 10.000). O estado da rotação
 * é retomado do banco para sobreviver a reinícios.
 */
export function startCollector() {
  const intervalMs = Math.max(1, Number(process.env.COLLECT_INTERVAL_MIN ?? 18) || 18) * 60000;
  const dailySearches = Math.ceil((24 * 3600 * 1000) / intervalMs) * PAGES;
  if (dailySearches > SEARCH_LIMIT)
    console.warn(`[coletor] ~${dailySearches} buscas/dia excede o limite ${SEARCH_LIMIT}`);
  const dailyCost = Math.ceil((24 * 3600 * 1000) / intervalMs) * (101 * PAGES + PAGES);
  const quota = Number(process.env.DAILY_QUOTA ?? 10000);
  if (dailyCost > quota)
    console.warn(`[coletor] custo estimado ${dailyCost}/dia excede a cota ${quota}; a coleta pausará quando ela acabar`);

  // Próxima categoria: a nunca coletada ou a coletada há mais tempo.
  const lasts = CATEGORIES.map((c) => lastUpdatedAt(c.slug));
  let nextIdx = 0;
  let best = Infinity;
  lasts.forEach((t, k) => {
    const v = t ?? -1;
    if (v < best) { best = v; nextIdx = k; }
  });
  const latest = Math.max(0, ...lasts.map((t) => t ?? 0));
  sched = { nextIdx, nextRunAt: latest ? latest + intervalMs : Date.now(), intervalMs };

  let failures = 0;
  const tick = async () => {
    const s = sched!;
    const idx = s.nextIdx;
    let delay = intervalMs;
    if (isExhausted()) {
      delay = Math.max(60000, nextResetAt() - Date.now());
      console.warn(`[coletor] cota esgotada; pausado até ${new Date(nextResetAt()).toISOString()}`);
    } else {
      try {
        await collectCategory(idx);
        s.nextIdx = (idx + 1) % CATEGORIES.length;
        failures = 0;
      } catch (e) {
        console.error("[coletor]", (e as Error).message);
        if (e instanceof QuotaExhaustedError) {
          delay = Math.max(60000, nextResetAt() - Date.now());
        } else {
          // falhou: repete a mesma categoria com backoff (até 4x o intervalo)
          failures++;
          delay = Math.min(intervalMs * 2 ** Math.min(failures, 2), 4 * intervalMs);
        }
      }
    }
    s.nextRunAt = Date.now() + delay;
    setTimeout(tick, delay);
  };
  console.log(
    `[coletor] ${PAGES} página(s) por consulta, 1 categoria a cada ${Math.round(intervalMs / 60000)} min (~${dailyCost} un/dia, ~${dailySearches} buscas/dia)`
  );
  setTimeout(tick, Math.max(0, sched.nextRunAt - Date.now()));
}

/** Twitch: sem cota diária; uma coleta única (idioma pt) entra na categoria "geral". */
async function collectTwitch() {
  const streams = await getTwitchStreams(PAGES);
  const now = Date.now();
  db.transaction(() => {
    for (const v of streams)
      upsert.run({ ...v, platform: "twitch", isLive: 1, category: "geral", now });
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
