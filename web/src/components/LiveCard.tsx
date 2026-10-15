import type { Live } from "../api";
import { fmt, focusRing } from "./ui";

const BRAND = {
  youtube: {
    name: "YouTube",
    card: "border-[#FF0000]/30 hover:border-[#FF0000]/70 bg-gradient-to-b from-[#FF0000]/10 to-transparent",
    badge: "bg-[#FF0000] text-white",
    tag: "text-[#FF4E45]",
  },
  twitch: {
    name: "Twitch",
    card: "border-[#9146FF]/30 hover:border-[#9146FF]/70 bg-gradient-to-b from-[#9146FF]/10 to-transparent",
    badge: "bg-[#9146FF] text-white",
    tag: "text-[#BF94FF]",
  },
} as const;

export function LiveCard({ live, onSelect }: { live: Live; onSelect: (live: Live, el: HTMLElement) => void }) {
  const b = BRAND[live.platform === "twitch" ? "twitch" : "youtube"];
  return (
    <article>
      <button
        data-nav
        onClick={(e) => onSelect(live, e.currentTarget)}
        aria-label={`Assistir ${live.title}, ${live.channelTitle}, ${fmt(live.viewers)} espectadores`}
        className={`block w-full overflow-hidden rounded-xl border bg-surface text-left ${b.card} focus-visible:scale-[1.03] ${focusRing}`}
      >
        <div className="relative aspect-video bg-raised">
          <img src={live.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${b.badge}`}>
            Ao vivo
          </span>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">{live.title}</h3>
          <p className="mt-1 truncate text-sm text-muted">{live.channelTitle} · <span className={`font-semibold ${b.tag}`}>{b.name}</span></p>
          <p className="text-sm text-muted">{fmt(live.viewers)} espectadores</p>
        </div>
      </button>
    </article>
  );
}
