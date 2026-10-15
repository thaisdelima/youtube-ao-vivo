import type { Live } from "../api";
import { LiveCard } from "./LiveCard";
import { useArrowNav } from "./useArrowNav";

interface Props {
  lives: Live[];
  loading: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onMore?: () => void;
  onSelect: (live: Live, el: HTMLElement) => void;
}

export function LiveGrid({ lives, loading, hasMore, loadingMore, onMore, onSelect }: Props) {
  const onKeyDown = useArrowNav();
  if (loading) return <p role="status" className="px-4 py-8 text-muted lg:px-8">Carregando…</p>;
  if (!lives.length)
    return <p role="status" className="px-4 py-8 text-muted lg:px-8">Nenhuma live encontrada.</p>;
  return (
    <>
      <div
        onKeyDown={onKeyDown}
        className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 md:grid-cols-3 lg:px-8 xl:grid-cols-4 3xl:grid-cols-5"
      >
        {lives.map((l) => (
          <LiveCard key={l.id} live={l} onSelect={onSelect} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center px-4 pb-8 lg:px-8">
          <button
            onClick={onMore}
            disabled={loadingMore}
            className="min-h-11 rounded-full border border-line bg-surface px-6 py-2.5 text-base font-medium text-sand hover:bg-raised disabled:opacity-60"
          >
            {loadingMore ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
