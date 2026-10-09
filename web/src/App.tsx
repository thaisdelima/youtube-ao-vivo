import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchLives, type Live } from "./api";
import { Header } from "./components/Header";
import { CategoryNav } from "./components/CategoryNav";
import { LiveGrid } from "./components/LiveGrid";
import { PlayerPanel } from "./components/PlayerPanel";
import { fmtAgo, fmtETA } from "./components/ui";

export default function App() {
  const [cat, setCat] = useState<string>();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Live | null>(null);
  const deferred = useDeferredValue(query);
  const origin = useRef<HTMLElement | null>(null);
  const playerRef = useRef<HTMLElement>(null);

  const categories = useQuery({ queryKey: ["cats"], queryFn: fetchCategories, refetchInterval: 60000 });
  const lives = useQuery({ queryKey: ["lives", cat], queryFn: () => fetchLives(cat), refetchInterval: 60000 });

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const list = lives.data ?? [];
    return q ? list.filter((l) => `${l.title} ${l.channelTitle}`.toLowerCase().includes(q)) : list;
  }, [lives.data, deferred]);

  useEffect(() => {
    if (!selected) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    playerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    playerRef.current?.focus({ preventScroll: true });
  }, [selected]);

  const close = () => {
    setSelected(null);
    origin.current?.focus();
  };

  const total = categories.data?.reduce((a, c) => a + c.viewers, 0) ?? 0;
  const active = cat ? categories.data?.find((c) => c.slug === cat) : undefined;
  const title = cat ? categories.data?.find((c) => c.slug === cat)?.name : "Lives mais vistas";

  return (
    <>
      <Header query={query} onQuery={setQuery} />
      <main className="mx-auto max-w-[2200px]">
        <CategoryNav categories={categories.data ?? []} active={cat} totalViewers={total} onSelect={setCat} />
        {selected && <PlayerPanel ref={playerRef} live={selected} onClose={close} />}
        <h1 className="px-4 pt-2 text-2xl font-bold lg:px-8">{title}</h1>
        {active && (active.lastUpdatedAt || active.nextUpdateAt) && (
          <p className="px-4 pt-1 text-sm text-muted lg:px-8">
            {active.lastUpdatedAt && `Atualizada ${fmtAgo(active.lastUpdatedAt)}`}
            {active.lastUpdatedAt && active.nextUpdateAt && " · "}
            {active.nextUpdateAt && `próxima ${fmtETA(active.nextUpdateAt)}`}
          </p>
        )}
        <LiveGrid
          lives={filtered}
          loading={lives.isLoading}
          onSelect={(l, el) => {
            origin.current = el;
            setSelected(l);
          }}
        />
      </main>
    </>
  );
}
