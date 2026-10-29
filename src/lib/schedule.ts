export type Airing = {
  id: number;
  episode: number;
  airingAt: number;
  media: {
    id: number;
    title: { romaji: string | null; english: string | null };
    coverImage: { large: string | null };
    format: string | null;
    episodes: number | null;
    isAdult: boolean;
    countryOfOrigin: string | null;
  };
};

const Q = `query ($p: Int, $a: Int, $b: Int) { Page(page: $p, perPage: 50) { pageInfo { hasNextPage }
  airingSchedules(airingAt_greater: $a, airingAt_lesser: $b, sort: TIME) { id episode airingAt
  media { id title { romaji english } coverImage { large } format episodes isAdult countryOfOrigin } } } }`;

export async function fetchWeekSchedule(start: Date): Promise<Airing[]> {
  const a = Math.floor(start.getTime() / 1000);
  const b = a + 7 * 86400;
  const out: Airing[] = [];
  for (let p = 1; p <= 8; p++) {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: Q, variables: { p, a, b } }),
    });
    if (!r.ok) throw new Error("AniList'e ulaşılamadı");
    const page = (await r.json()).data?.Page;
    out.push(...(page?.airingSchedules ?? []));
    if (!page?.pageInfo?.hasNextPage) break;
  }
  return out.filter((x) => !x.media.isAdult && x.media.countryOfOrigin === "JP");
}

export function weekStart(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
