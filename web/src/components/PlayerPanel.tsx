import { forwardRef } from "react";
import type { Live } from "../api";
import { fmt, focusRing } from "./ui";

interface Props {
  live: Live;
  onClose: () => void;
}

export const PlayerPanel = forwardRef<HTMLElement, Props>(function PlayerPanel({ live, onClose }, ref) {
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`Player: ${live.title}`}
      className="mx-4 mb-2 overflow-hidden rounded-2xl border border-line bg-surface outline-none lg:mx-8"
    >
      <div className="aspect-video max-h-[75vh] w-full bg-black">
        <iframe
          key={live.id}
          className="h-full w-full"
          src={
            live.platform === "twitch"
              ? `https://player.twitch.tv/?channel=${live.channelId}&parent=${window.location.hostname}&autoplay=true`
              : `https://www.youtube.com/embed/${live.id}?autoplay=1`
          }
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title={live.title}
        />
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-lg font-semibold">{live.title}</h2>
          <p className="text-sm text-muted">
            {live.channelTitle} · {fmt(live.viewers)} espectadores
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <a
            href={live.platform === "twitch" ? `https://www.twitch.tv/${live.channelId}` : `https://www.youtube.com/watch?v=${live.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-12 items-center rounded-full ${live.platform === "twitch" ? "bg-purple-600 hover:bg-purple-500" : "bg-red-600 hover:bg-red-500"} px-6 font-semibold text-white ${focusRing}`}
          >
            Assistir {live.platform === "twitch" ? "na Twitch" : "no YouTube"}
          </a>
          <button
            onClick={onClose}
            aria-label="Fechar player"
            className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-line-strong bg-raised text-xl hover:bg-raised-hover ${focusRing}`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    </section>
  );
});
