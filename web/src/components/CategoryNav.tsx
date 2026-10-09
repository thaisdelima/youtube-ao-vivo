import type { Category } from "../api";
import { fmt, focusRing } from "./ui";
import { useArrowNav } from "./useArrowNav";

interface Props {
  categories: Category[];
  active?: string;
  totalViewers: number;
  onSelect: (slug?: string) => void;
}

export function CategoryNav({ categories, active, totalViewers, onSelect }: Props) {
  const onKeyDown = useArrowNav();
  const items = [{ slug: undefined as string | undefined, name: "Todas", viewers: totalViewers }, ...categories];
  return (
    <nav aria-label="Categorias" onKeyDown={onKeyDown}>
      <ul className="scrollbar-hide flex snap-x gap-2 overflow-x-auto px-4 py-4 lg:px-8">
        {items.map((c) => {
          const on = c.slug === active;
          return (
            <li key={c.slug ?? "all"} className="snap-start">
              <button
                data-nav
                aria-pressed={on}
                onClick={(e) => {
                  onSelect(c.slug);
                  e.currentTarget.scrollIntoView({ inline: "center", block: "nearest" });
                }}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-base font-medium ${focusRing} ${
                  on
                    ? "border-line-strong bg-raised text-amber-400"
                    : "border-line bg-surface text-sand hover:bg-raised"
                }`}
              >
                {c.name}
                <span className="text-sm text-muted">{fmt(c.viewers)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
