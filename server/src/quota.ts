import { db } from "./db.js";

const LIMIT = Number(process.env.DAILY_QUOTA ?? 10000);
// A cota do YouTube reseta à meia-noite no horário do Pacífico.
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export function used(): number {
  const r = db.prepare("SELECT used FROM quota WHERE day=?").get(today()) as
    | { used: number }
    | undefined;
  return r?.used ?? 0;
}
export const remaining = () => LIMIT - used();
export const canSpend = (cost: number) => remaining() >= cost;
export function spend(cost: number) {
  db.prepare(
    "INSERT INTO quota(day,used) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET used=used+?"
  ).run(today(), cost, cost);
}

// ---- Limite separado de buscas (search.list) por dia ----
db.exec(
  "CREATE TABLE IF NOT EXISTS search_quota (day TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, exhausted INTEGER NOT NULL DEFAULT 0)"
);
// Teto de segurança: nunca passa de 90, mesmo que DAILY_SEARCHES seja 100.
export const SEARCH_LIMIT = Math.min(Number(process.env.DAILY_SEARCHES ?? 100) || 100, 90);

export function searchesUsed(): number {
  const r = db.prepare("SELECT used FROM search_quota WHERE day=?").get(today()) as
    | { used: number }
    | undefined;
  return r?.used ?? 0;
}
export const searchesRemaining = () => Math.max(0, SEARCH_LIMIT - searchesUsed());
export function isExhausted(): boolean {
  const r = db.prepare("SELECT exhausted FROM search_quota WHERE day=?").get(today()) as
    | { exhausted: number }
    | undefined;
  return !!r?.exhausted || searchesRemaining() <= 0;
}
export function spendSearch() {
  db.prepare(
    "INSERT INTO search_quota(day,used) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET used=used+1"
  ).run(today());
}
export function markExhausted() {
  db.prepare(
    "INSERT INTO search_quota(day,used,exhausted) VALUES(?,0,1) ON CONFLICT(day) DO UPDATE SET exhausted=1"
  ).run(today());
}
/** Epoch ms do próximo reset (meia-noite no horário do Pacífico). */
export function nextResetAt(): number {
  const now = Date.now();
  const d = today();
  for (let m = 1; m <= 25 * 60; m++) {
    const t = now + m * 60000;
    if (new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }) !== d)
      return Math.ceil(t / 60000) * 60000;
  }
  return now + 24 * 3600000;
}
