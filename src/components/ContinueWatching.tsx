import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/data";
import { getProgress } from "@/lib/progress";
import { episodeParam } from "@/lib/seo";

type Item = {
  animeId: string; title: string; cover: string | null; watchedAt: string;
  ep: { id: string; number: number }; next: { id: string; number: number } | null; pct: number; total: number;
};

async function fetchContinue(userId: string): Promise<Item[]> {
  const { data } = await supabase.from("watch_history")
    .select("watched_at, episodes(id, number, anime_id, animes(id, title, cover_url, banner_url))")
    .eq("user_id", userId).order("watched_at", { ascending: false }).limit(100);
  const seen = new Map<string, any>();
  for (const h of (data ?? []) as any[]) {
    const e = h.episodes;
    if (e?.animes && !seen.has(e.anime_id)) seen.set(e.anime_id, { ...h, e });
  }
  const latest = [...seen.values()].slice(0, 12);
  if (!latest.length) return [];
  const { data: eps } = await supabase.from("episodes").select("id, number, anime_id")
    .in("anime_id", latest.map((x) => x.e.anime_id)).order("number");
  return latest.map(({ e, watched_at }) => {
    const list = (eps ?? []).filter((x) => x.anime_id === e.anime_id);
    const p = getProgress(e.id);
    const pct = p ? p.t / p.d : 0;
    const next = list.find((x) => x.number > e.number) ?? null;
    const done = pct >= 0.9;
    const target = done && next ? next : e;
    return {
      animeId: e.anime_id, title: e.animes.title, cover: e.animes.banner_url ?? e.animes.cover_url, watchedAt: watched_at,
      ep: { id: target.id, number: target.number }, next: done ? null : next,
      pct: target.id === e.id ? pct : 0, total: list.length,
    };
  }).filter((x) => !(x.pct >= 0.9 && !x.next && x.ep.number === x.total));
}

export function ContinueWatching() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["continue", userId], queryFn: () => fetchContinue(userId!), enabled: !!userId });

  const remove = async (animeId: string) => {
    const { data: eps } = await supabase.from("episodes").select("id").eq("anime_id", animeId);
    await supabase.from("watch_history").delete().eq("user_id", userId!).in("episode_id", (eps ?? []).map((e) => e.id));
    qc.invalidateQueries({ queryKey: ["continue", userId] });
  };

  if (!userId || !q.data?.length) return null;
  return (
    <section data-testid="continue-watching-section">
      <h2 className="mb-5 text-2xl font-bold">Kaldığın Yerden Devam Et</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {q.data.map((it) => (
          <div key={it.animeId} className="group relative w-72 shrink-0" data-testid={`continue-card-${it.animeId}`}>
            <Link to="/izle/$episodeId" params={{ episodeId: episodeParam(it.ep.id, it.title, it.ep.number) }} data-testid={`continue-link-${it.animeId}`}>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
                {it.cover && <img src={it.cover} alt={it.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-fade" />
                <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-5 w-5 fill-current" />
                </span>
                <span className="absolute bottom-3 left-3 text-sm font-semibold">
                  {it.ep.number}. Bölüm{it.total ? <span className="text-muted-foreground"> / {it.total}</span> : null}
                </span>
                {it.pct > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, it.pct * 100)}%` }} />
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium group-hover:text-primary">{it.title}</p>
              <p className="text-xs text-muted-foreground">
                {it.pct > 0 ? `%${Math.round(it.pct * 100)} izlendi · ` : ""}{timeAgo(it.watchedAt)}
              </p>
            </Link>
            {it.next && (
              <Link to="/izle/$episodeId" params={{ episodeId: episodeParam(it.next.id, it.title, it.next.number) }} data-testid={`continue-next-${it.animeId}`}
                className="text-xs font-medium text-primary hover:underline">
                Sonraki: {it.next.number}. Bölüm →
              </Link>
            )}
            <button onClick={() => remove(it.animeId)} aria-label="Listeden kaldır" data-testid={`continue-remove-${it.animeId}`}
              className="absolute right-2 top-2 rounded-full glass p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
