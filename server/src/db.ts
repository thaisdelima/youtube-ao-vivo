import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH ?? "lives.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS lives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT,
  viewers INTEGER NOT NULL DEFAULT 0,
  is_live INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lives_rank ON lives(is_live, viewers DESC);
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  title TEXT,
  last_live_at INTEGER NOT NULL DEFAULT 0,
  last_checked_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quota (day TEXT PRIMARY KEY, used INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS collections (category TEXT PRIMARY KEY, last_at INTEGER NOT NULL);
`);
if (!(db.prepare("PRAGMA table_info(lives)").all() as { name: string }[]).some((c) => c.name === "platform"))
  db.exec("ALTER TABLE lives ADD COLUMN platform TEXT NOT NULL DEFAULT 'youtube'");
if (!(db.prepare("PRAGMA table_info(lives)").all() as { name: string }[]).some((c) => c.name === "country"))
  db.exec("ALTER TABLE lives ADD COLUMN country TEXT");

db.exec(`INSERT OR IGNORE INTO channels(id,title,last_live_at)
  SELECT channel_id, MAX(channel_title), MAX(updated_at) FROM lives WHERE platform='youtube' GROUP BY channel_id`);
