import Fastify from "fastify";
import cors from "@fastify/cors";
import { db } from "./db.js";
import { CATEGORIES } from "./categories.js";
import { startCollector, startTwitchCollector, nextUpdateAt, lastUpdatedAt } from "./collector.js";
import { remaining, searchesUsed, searchesRemaining, SEARCH_LIMIT, nextResetAt } from "./quota.js";

const app = Fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        },
});
await app.register(cors);

const cols = `id,title,channel_id AS channelId,channel_title AS channelTitle,
  thumbnail,category,language,viewers,updated_at AS updatedAt,platform`;
// Ignora lives sem atualização há mais de 6h (dados velhos).
const STALE = () => Date.now() - 6 * 3600 * 1000;

app.get("/api/lives", async (req) => {
  const { category, limit = "40", platform } = req.query as Record<string, string>;
  const where = ["is_live=1", "updated_at>?"];
  const args: unknown[] = [STALE()];
  if (category) { where.push("category=?"); args.push(category); }
  if (platform) { where.push("platform=?"); args.push(platform); }
  args.push(Math.min(Number(limit) || 40, 100));
  return db
    .prepare(`SELECT ${cols} FROM lives WHERE ${where.join(" AND ")} ORDER BY viewers DESC LIMIT ?`)
    .all(...args);
});

app.get("/api/featured", async () =>
  db.prepare(`SELECT ${cols} FROM lives WHERE is_live=1 AND updated_at>? ORDER BY viewers DESC LIMIT 1`)
    .get(STALE()) ?? null);

app.get("/api/categories", async () =>
  CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    lastUpdatedAt: lastUpdatedAt(c.slug),
    nextUpdateAt: nextUpdateAt(c.slug),
    ...(db.prepare("SELECT COUNT(*) n, COALESCE(SUM(viewers),0) viewers FROM lives WHERE is_live=1 AND category=? AND updated_at>?")
      .get(c.slug, STALE()) as object),
  })));

app.get("/api/status", async () => ({
  quotaRemaining: remaining(),
  searchesUsed: searchesUsed(),
  searchesRemaining: searchesRemaining(),
  searchLimit: SEARCH_LIMIT,
  quotaResetAt: new Date(nextResetAt()).toISOString(),
}));

if (process.env.YOUTUBE_API_KEY) startCollector();
else app.log.warn("YOUTUBE_API_KEY ausente: coletor desativado");
startTwitchCollector();

await app.listen({ port: Number(process.env.PORT ?? 4567), host: "0.0.0.0" });
