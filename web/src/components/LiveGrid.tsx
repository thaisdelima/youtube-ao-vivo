import type { Live } from "../api";
import { LiveCard } from "./LiveCard";
import { useArrowNav } from "./useArrowNav";

interface Props {
  lives: Live[];
  loading: boolean;
  onSelect: (live: Live, el: HTMLElement) => void;
}

export function LiveGrid({ lives, loading, onSelect }: Props) {
  const onKeyDown = useArrowNav();
  if (loading) return <p role="status" className="px-4 py-8 text-muted lg:px-8">Carregando…</p>;
  if (!lives.length)
    return <p role="status" className="px-4 py-8 text-muted lg:px-8">Nenhuma live encontrada.</p>;
  return (
    <div
      onKeyDown={onKeyDown}
      className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 md:grid-cols-3 lg:px-8 xl:grid-cols-4 3xl:grid-cols-5"
    >
      {lives.map((l) => (
        <LiveCard key={l.id} live={l} onSelect={onSelect} />
      ))}
    </div>
  );
}
