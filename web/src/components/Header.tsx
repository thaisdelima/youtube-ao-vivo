import { focusRing } from "./ui";

export function Header({ query, onQuery }: { query: string; onQuery: (v: string) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[2200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 lg:px-8">
        <a href="/" className={`flex items-center gap-2 self-start rounded-lg px-1 text-xl font-bold ${focusRing}`}>
          <span aria-hidden="true" className="rounded bg-red-600 px-2 py-0.5 text-sm text-white">▶</span>
          <span>Lives<span className="text-amber-400">AoVivo</span></span>
        </a>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex-1 sm:mx-auto sm:max-w-2xl">
          <label htmlFor="search" className="sr-only">Buscar transmissões</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar por título ou canal"
            className={`min-h-12 w-full rounded-full border border-line-strong bg-canvas px-5 text-base text-ink placeholder:text-muted ${focusRing}`}
          />
        </form>
      </div>
    </header>
  );
}
