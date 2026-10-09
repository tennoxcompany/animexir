export type AniResult = {
  id: number;
  title: { romaji: string | null; english: string | null };
  coverImage: { extraLarge: string | null; large: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  studios: { nodes: { name: string }[] };
  streamingEpisodes: { title: string | null }[];
};

const QUERY = `query ($s: String) { Page(perPage: 12) { media(search: $s, type: ANIME, sort: SEARCH_MATCH) {
  id title { romaji english } coverImage { extraLarge large } bannerImage description(asHtml: false)
  genres averageScore episodes status season seasonYear format
  studios(isMain: true) { nodes { name } } streamingEpisodes { title } } } }`;

export async function searchAniList(s: string): Promise<AniResult[]> {
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { s } }),
  });
  if (!r.ok) throw new Error("AniList'e ulaşılamadı");
  const j = await r.json();
  return j.data?.Page?.media ?? [];
}

const GENRE_TR: Record<string, string> = {
  Action: "Aksiyon", Adventure: "Macera", Fantasy: "Fantezi", Supernatural: "Doğaüstü", Mystery: "Gizem",
  Drama: "Dram", Comedy: "Komedi", "Sci-Fi": "Bilim Kurgu", Romance: "Romantik", Horror: "Korku",
  "Slice of Life": "Günlük Yaşam", Sports: "Spor", Psychological: "Psikolojik", Thriller: "Gerilim",
  Mecha: "Mecha", Music: "Müzik", Ecchi: "Ecchi",
};
export const trGenre = (g: string) => GENRE_TR[g] ?? g;

const STATUS_TR: Record<string, string> = { FINISHED: "Tamamlandı", RELEASING: "Devam Ediyor", NOT_YET_RELEASED: "Yakında", HIATUS: "Ara Verildi" };
export const trStatus = (s: string | null) => (s ? STATUS_TR[s] ?? s : "Devam Ediyor");
const SEASON_TR: Record<string, string> = { WINTER: "Kış", SPRING: "İlkbahar", SUMMER: "Yaz", FALL: "Sonbahar" };
export const trSeason = (s: string | null, y: number | null) => [s ? SEASON_TR[s] : null, y].filter(Boolean).join(" ");

export const cleanDesc = (d: string | null) => (d ?? "").replace(/<[^>]+>/g, "").replace(/\(Source:.*?\)/gi, "").trim();

/** AniList streaming titles look like "Episode 3 - Title"; map them by number. */
export function episodeTitles(a: AniResult, count: number): (string | null)[] {
  const map = new Map<number, string>();
  for (const e of a.streamingEpisodes ?? []) {
    const m = e.title?.match(/Episode\s+(\d+)\s*-\s*(.+)/i);
    if (m) map.set(Number(m[1]), m[2]!.trim());
  }
  return Array.from({ length: count }, (_, i) => map.get(i + 1) ?? null);
}
