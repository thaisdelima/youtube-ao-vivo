import type { Live } from "../api";
import { fmt, focusRing } from "./ui";

export function LiveCard({ live, onSelect }: { live: Live; onSelect: (live: Live, el: HTMLElement) => void }) {
  return (
    <article>
      <button
        data-nav
        onClick={(e) => onSelect(live, e.currentTarget)}
        aria-label={`Assistir ${live.title}, ${live.channelTitle}, ${fmt(live.viewers)} espectadores`}
        className={`block w-full overflow-hidden rounded-xl border border-line bg-surface text-left hover:border-line-strong focus-visible:scale-[1.03] ${focusRing}`}
      >
        <div className="relative aspect-video bg-raised">
          <img src={live.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Ao vivo
          </span>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">{live.title}</h3>
          <p className="mt-1 truncate text-sm text-muted">{live.channelTitle} · {live.platform === "twitch" ? "Twitch" : "YouTube"}</p>
          <p className="text-sm text-muted">{fmt(live.viewers)} espectadores</p>
        </div>
      </button>
    </article>
  );
}
