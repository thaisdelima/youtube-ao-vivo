import type { LangCounts } from "../api";
import { focusRing } from "./ui";
import { useArrowNav } from "./useArrowNav";

export const LANGUAGES = [
  { code: "pt", name: "Português" },
  { code: "en", name: "Inglês" },
  { code: "es", name: "Espanhol" },
];

interface Props {
  counts?: LangCounts;
  active?: string;
  onSelect: (code?: string) => void;
}

export function LanguageNav({ counts, active, onSelect }: Props) {
  const onKeyDown = useArrowNav();
  const items = [
    { code: undefined as string | undefined, name: "Todos os idiomas", n: counts?.total ?? 0 },
    ...LANGUAGES.map((c) => ({ code: c.code, name: c.name, n: counts?.[c.code] ?? 0 })),
  ];
  return (
    <nav aria-label="Idiomas" onKeyDown={onKeyDown}>
      <ul className="scrollbar-hide flex snap-x gap-2 overflow-x-auto px-4 pb-4 lg:px-8">
        {items.map((c) => {
          const on = c.code === active;
          return (
            <li key={c.code ?? "all"} className="snap-start">
              <button
                data-nav
                aria-pressed={on}
                onClick={() => onSelect(c.code)}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${focusRing} ${
                  on ? "border-line-strong bg-raised text-amber-400" : "border-line bg-surface text-sand hover:bg-raised"
                }`}
              >
                {c.name}
                <span className="text-xs text-muted">{c.n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
