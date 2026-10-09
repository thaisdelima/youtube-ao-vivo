import { useCallback, type KeyboardEvent } from "react";

/** Navegação por setas entre elementos focáveis [data-nav] dentro do container. */
export function useArrowNav() {
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-nav]"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = items[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (!next) return;
      e.preventDefault();
      next.focus();
      return;
    }

    const cur = items[i].getBoundingClientRect();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const cands = items.filter((el) => (el.getBoundingClientRect().top - cur.top) * dir > 8);
    if (!cands.length) return;
    const dist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.top - cur.top) * 10 + Math.abs(r.left - cur.left);
    };
    const best = cands.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    e.preventDefault();
    best.focus();
  }, []);
}
