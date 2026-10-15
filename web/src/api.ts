export interface Live {
  id: string; title: string; channelId: string; channelTitle: string;
  thumbnail: string; category: string; language: string | null; country?: string | null; viewers: number;
  platform: "youtube" | "twitch";
}
export interface Category { slug: string; name: string; n: number; viewers: number;
  lastUpdatedAt: number | null; nextUpdateAt: number | null }

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};
export const PAGE_SIZE = 40;
export const fetchLives = (category: string | undefined, lang: string | undefined, offset: number) => {
  const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (category) q.set("category", category);
  if (lang) q.set("lang", lang);
  return get<Live[]>(`/api/lives?${q}`);
};
export type LangCounts = { total: number } & Record<string, number>;
export const fetchLanguages = (category?: string) =>
  get<LangCounts>(`/api/languages${category ? `?category=${category}` : ""}`);
export const fetchFeatured = () => get<Live | null>("/api/featured");
export const fetchCategories = () => get<Category[]>("/api/categories");
