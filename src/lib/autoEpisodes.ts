import { supabase } from "@/integrations/supabase/client";
import { episodeCount, episodeTitles, type AniResult } from "@/lib/anilist";

const LAST = "axr-ep-sync";
export const SYNC_EVERY = 30 * 60_000;
export const lastSync = () => Number(typeof localStorage === "undefined" ? 0 : localStorage.getItem(LAST) ?? 0);

const Q = `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, status: RELEASING) {
  id episodes nextAiringEpisode { episode } streamingEpisodes { title } } } }`;

/** Yayını süren animelerin AniList'te çıkmış ama sitede olmayan bölümlerini ekler. Var olan bölümlere dokunmaz. */
export async function syncAiringEpisodes(): Promise<{ added: number; titles: string[] }> {
  const { data: animes } = await supabase.from("animes").select("id, title, anilist_id").not("anilist_id", "is", null);
  const list = (animes ?? []) as { id: string; title: string; anilist_id: number }[];
  let added = 0;
  const titles: string[] = [];
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50);
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: Q, variables: { ids: chunk.map((a) => a.anilist_id) } }),
    });
    if (!r.ok) throw new Error("AniList'e ulaşılamadı");
    const media = ((await r.json()).data?.Page?.media ?? []) as AniResult[];
    for (const m of media) {
      const anime = chunk.find((a) => a.anilist_id === m.id);
      if (!anime) continue;
      const count = m.nextAiringEpisode?.episode ? m.nextAiringEpisode.episode - 1 : episodeCount(m);
      const { data: last } = await supabase.from("episodes").select("number").eq("anime_id", anime.id).order("number", { ascending: false }).limit(1).maybeSingle();
      const have = last?.number ?? 0;
      if (count <= have) continue;
      const names = episodeTitles(m, count);
      const rows = names.slice(have).map((t, k) => ({ anime_id: anime.id, number: have + k + 1, title: t }));
      const { error } = await supabase.from("episodes").upsert(rows, { onConflict: "anime_id,number", ignoreDuplicates: true });
      if (!error) { added += rows.length; titles.push(anime.title); }
    }
  }
  localStorage.setItem(LAST, String(Date.now()));
  return { added, titles };
}
