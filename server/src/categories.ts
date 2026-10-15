// IDs de categoria de vídeo do YouTube.
export const CATEGORIES = [
  { slug: "jogos", name: "Jogos", youtubeId: "20" },
  { slug: "musica", name: "Música", youtubeId: "10" },
  { slug: "esportes", name: "Esportes", youtubeId: "17" },
  { slug: "noticias", name: "Notícias", youtubeId: "25" },
  { slug: "entretenimento", name: "Entretenimento", youtubeId: "24" },
  { slug: "geral", name: "Geral", youtubeId: undefined },
] as const;

const BY_YT_ID = new Map<string, string>(CATEGORIES.filter((c) => c.youtubeId).map((c) => [c.youtubeId!, c.slug]));
/** Converte snippet.categoryId do YouTube em slug local (padrão: geral). */
export const slugFromYoutubeId = (id?: string) => (id && BY_YT_ID.get(id)) || "geral";
