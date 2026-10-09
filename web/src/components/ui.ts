export const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n);

export const focusRing =
  "outline-none transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const dur = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ""}`;
};
export const fmtETA = (at: number) => (at - Date.now() < 60000 ? "em breve" : `em ~${dur(at - Date.now())}`);
export const fmtAgo = (at: number) => (Date.now() - at < 60000 ? "agora há pouco" : `há ${dur(Date.now() - at)}`);
