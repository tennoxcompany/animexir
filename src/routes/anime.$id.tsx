import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/lib/auth";
import type { Anime, Episode } from "@/lib/data";
import { animeParam, breadcrumbLd, episodeParam, idFromParam, NOINDEX, loadSeoAnime, seoMeta, shortText, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/anime/$id")({
  loader: async ({ params }) => {
    const seo = await loadSeoAnime(idFromParam(params.id));
    const canon = seo && animeParam(seo.id, seo.title);
    if (canon && params.id !== canon) throw redirect({ to: "/anime/$id", params: { id: canon }, statusCode: 301 });
    return { seo };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.seo;
    const url = `${SITE_URL}/anime/${a ? animeParam(a.id, a.title) : params.id}`;
    if (!a) {
      return {
        meta: [...seoMeta({ title: "Anime Detayı — AnimeXir", description: "Anime bölümleri, puanlar ve izleme listesi AnimeXir'de.", url }), NOINDEX],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const lang = a.has_dub ? "Türkçe Altyazılı & Dublajlı" : "Türkçe Altyazılı";
    const title = `${a.title} İzle — ${lang} | AnimeXir`;
    const description = shortText(`${a.title} tüm bölümleri ${lang} Full HD izle. ${a.description ?? ""}`);
    const image = a.banner_url || a.cover_url;
    return {
      meta: seoMeta({ title, description, image, url, type: "video.tv_show" }),
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: a.title,
            description: shortText(a.description, 500),
            image: a.cover_url ?? undefined,
            genre: a.genres ?? undefined,
            url,
            inLanguage: "tr",
          }),
        },
        breadcrumbLd([
          { name: "AnimeXir", url: `${SITE_URL}/` },
          { name: a.title, url },
        ]),
      ],
    };
  },
  component: AnimePage,
});

const STATUSES = [
  { v: "watching", l: "İzliyorum" },
  { v: "completed", l: "Bitirdim" },
  { v: "plan", l: "Listemde" },
  { v: "dropped", l: "Bıraktım" },
] as const;

function AnimePage() {
  const id = idFromParam(Route.useParams().id);
  const { userId } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["anime", id],
    queryFn: async () => {
      const [{ data: a }, { data: eps }, { data: rs }] = await Promise.all([
        supabase.from("animes").select("*").eq("id", id).maybeSingle(),
        supabase.from("episodes").select("*").eq("anime_id", id).order("number"),
        supabase.from("ratings").select("score, user_id").eq("anime_id", id),
      ]);
      return { anime: a as Anime | null, episodes: (eps ?? []) as Episode[], ratings: rs ?? [] };
    },
  });
  const mine = useQuery({
    queryKey: ["user_anime", id, userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("user_anime").select("status").eq("anime_id", id).eq("user_id", userId!).maybeSingle()).data,
  });

  if (isLoading) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  if (!data?.anime) return <p className="p-10">Anime bulunamadı.</p>;
  const { anime, episodes, ratings } = data;
  const myRating = ratings.find((r) => r.user_id === userId)?.score;
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1) : null;

  const setStatus = async (status: (typeof STATUSES)[number]["v"]) => {
    if (!userId) return toast.error("Önce giriş yapmalısın");
    const { error } = await supabase.from("user_anime").upsert({ anime_id: id, user_id: userId, status, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Liste güncellendi");
    qc.invalidateQueries({ queryKey: ["user_anime", id, userId] });
  };
  const rate = async (score: number) => {
    if (!userId) return toast.error("Önce giriş yapmalısın");
    const { error } = await supabase.from("ratings").upsert({ anime_id: id, user_id: userId, score });
    if (error) return toast.error(error.message);
    toast.success(`${score} puan verdin`);
    qc.invalidateQueries({ queryKey: ["anime", id] });
  };

  const first = episodes.find((e) => e.video_url) ?? episodes[0];

  return (
    <div>
      <div className="relative h-80 overflow-hidden">
        <img src={anime.banner_url ?? anime.cover_url ?? ""} alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-fade" />
      </div>
      <div className="mx-auto -mt-40 max-w-6xl px-4">
        <div className="relative flex flex-col gap-8 md:flex-row">
          {anime.cover_url && <img src={anime.cover_url} alt={anime.title} className="w-48 shrink-0 rounded-xl shadow-glow md:w-60" />}
          <div className="flex-1 pt-4 md:pt-24">
            <h1 className="text-4xl font-extrabold md:text-5xl">{anime.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {anime.genres.map((g) => <span key={g} className="rounded-full bg-secondary px-3 py-1">{g}</span>)}
              {anime.has_dub && <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Türkçe Dublaj</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span>Stüdyo: <b className="text-foreground">{anime.studio ?? "-"}</b></span>
              <span>Durum: <b className="text-foreground">{anime.status}</b></span>
              <span>Puan: <b className="text-gold">★ {anime.score}</b></span>
              {avg && <span>Kullanıcı: <b className="text-gold">★ {avg}</b> ({ratings.length})</span>}
            </div>
            <p className="mt-4 max-w-2xl text-muted-foreground">{anime.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {first && <Button asChild variant="hero"><Link to="/izle/$episodeId" params={{ episodeId: episodeParam(first.id, anime.title, first.number) }}><Play className="fill-current" /> İzlemeye Başla</Link></Button>}
              <FollowButton anime={anime} />
              {STATUSES.map((s) => (
                <Button key={s.v} variant={mine.data?.status === s.v ? "default" : "glass"} onClick={() => setStatus(s.v)}>{s.l}</Button>
              ))}
            </div>
            <div className="mt-6">
              <p className="mb-2 text-sm text-muted-foreground">Puan ver</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => rate(n)}
                    className={`h-9 w-9 rounded-md text-sm font-semibold transition-colors ${myRating === n ? "bg-gold text-background" : "bg-secondary hover:bg-accent"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="py-12">
          <h2 className="mb-4 text-2xl font-bold">Bölümler <span className="text-base font-normal text-muted-foreground">({episodes.length})</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {episodes.map((e) => (
              <Link key={e.id} to="/izle/$episodeId" params={{ episodeId: episodeParam(e.id, anime.title, e.number) }}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary">
                <span className="font-display text-2xl font-bold text-primary">{e.number}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.title ?? `${e.number}. Bölüm`}</p>
                  <p className="text-xs text-muted-foreground">{e.video_url ? "İzlenebilir" : "Yakında"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
