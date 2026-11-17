import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageCircle, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { type Anime } from "@/lib/data";
import { animeParam, shortText } from "@/lib/seo";
import { selectFeaturedComments } from "@/lib/featured-comments";

type FeaturedAnime = Anime & { episode_count: number };

export function FeaturedShowcase({ animes }: { animes: FeaturedAnime[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { userId } = useAuth();
  const ids = animes.map((anime) => anime.id);
  const comments = useQuery({
    queryKey: ["featured-comments", ids, userId],
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,body,user_id,profiles(username,avatar_url),episodes!inner(anime_id,number)")
        .in("episodes.anime_id", ids).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return selectFeaturedComments(data ?? [], ids);
    },
  });
  useEffect(() => {
    if (paused || animes.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % animes.length), 9000);
    return () => window.clearInterval(timer);
  }, [animes.length, paused]);

  const hero = animes[index % animes.length];
  if (!hero) return null;
  const entries = comments.data ?? [];
  const move = (direction: number) => setIndex((current) => (current + direction + animes.length) % animes.length);

  return (
    <section className="featured-showcase relative isolate overflow-hidden bg-background" aria-label="Öne çıkan animeler" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <img key={hero.id} src={hero.banner_url ?? hero.cover_url ?? ""} alt={hero.title} className="featured-image absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-showcase" />
      {entries.length > 0 && (
        <div className="comment-ticker relative flex h-12 items-center overflow-hidden border-b border-border bg-background/70" aria-label="Öne çıkan anime yorumları">
          <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-border bg-background px-4 text-xs font-semibold text-muted-foreground"><MessageCircle className="h-4 w-4 text-primary" /><span className="hidden sm:inline">Son Yorumlar</span></div>
          <div className="ticker-track flex w-max items-center" >
            {[0, 1].map((copy) => <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? true : undefined}>
              {entries.map((comment) => {
                const anime = animes.find((item) => item.id === comment.episodes?.anime_id);
                if (!anime) return null;
                return <Link key={comment.id} tabIndex={copy === 1 ? -1 : undefined} to="/anime/$id" params={{ id: animeParam(anime.id, anime.title) }} className="flex max-w-[560px] shrink-0 items-center gap-3 border-r border-border px-6 text-xs transition-colors hover:text-primary">
                  {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" /> : <MessageCircle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className="shrink-0 font-bold">{comment.profiles?.username ?? "Anime sever"}</span>
                  <span className="max-w-40 truncate text-muted-foreground">{anime.title} · {comment.episodes?.number}. Bölüm</span>
                  <span className="truncate">{comment.body}</span>
                </Link>;
              })}
            </div>)}
          </div>
        </div>
      )}
      <div className="mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-12 pt-24 sm:px-8 sm:pb-16">
        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><span className="h-1 w-6 bg-primary" />Öne Çıkan</p>
        <h1 className="max-w-2xl break-words text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">{hero.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          {hero.score != null && <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-bold text-gold"><Star className="h-3.5 w-3.5 fill-current" />{hero.score}</span>}
          <span className="text-muted-foreground">{hero.episode_count} bölüm</span>
          {hero.studio && <span className="text-muted-foreground">{hero.studio}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{hero.genres.slice(0, 3).map((genre) => <span key={genre} className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold">{genre}</span>)}</div>
        <p className="mt-5 line-clamp-3 max-w-xl text-sm leading-relaxed text-foreground/80 sm:text-base">{shortText(hero.description, 350)}</p>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <Button asChild variant="hero" size="lg" className="w-fit"><Link to="/anime/$id" params={{ id: animeParam(hero.id, hero.title) }}><Play className="h-4 w-4 fill-current" />Hemen İzle</Link></Button>
          {animes.length > 1 && <div className="flex shrink-0 items-center gap-2"><span className="mr-2 text-xs tabular-nums text-muted-foreground">{(index % animes.length) + 1} / {animes.length}</span><Button variant="glass" size="icon" aria-label="Önceki anime" onClick={() => move(-1)}><ChevronLeft /></Button><Button variant="glass" size="icon" aria-label="Sonraki anime" onClick={() => move(1)}><ChevronRight /></Button></div>}
        </div>
      </div>
    </section>
  );
}