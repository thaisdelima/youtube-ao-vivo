export interface Live {
  id: string; title: string; channelId: string; channelTitle: string;
  thumbnail: string; category: string; language: string | null; viewers: number;
  platform: "youtube" | "twitch";
}
export interface Category { slug: string; name: string; n: number; viewers: number;
  lastUpdatedAt: number | null; nextUpdateAt: number | null }

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};
export const fetchLives = (category?: string) =>
  get<Live[]>(`/api/lives${category ? `?category=${category}` : ""}`);
export const fetchFeatured = () => get<Live | null>("/api/featured");
export const fetchCategories = () => get<Category[]>("/api/categories");
