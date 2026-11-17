import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimeCard } from "@/components/AnimeCard";
import { GenreLinks } from "@/components/GenreLinks";
import { ContinueWatching } from "@/components/ContinueWatching";
import { TodayStrip } from "@/components/TodayStrip";
import { FeaturedShowcase } from "@/components/FeaturedShowcase";
import { fetchAnimes, fetchLatestEpisodes, GENRES } from "@/lib/data";
import { animeParam, episodeParam, LOGO_URL, OG_IMAGE, pageHead, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageHead("/", SITE_TITLE, SITE_DESCRIPTION),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: `${SITE_URL}/`,
              name: "AnimeXir",
              alternateName: ["Animexir", "Anime Xir"],
              description: SITE_DESCRIPTION,
              inLanguage: "tr-TR",
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "AnimeXir",
              url: `${SITE_URL}/`,
              logo: LOGO_URL,
              image: OG_IMAGE,
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

type Sort = "new" | "score" | "az" | "eps";

function Index() {
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });
  const latest = useQuery({ queryKey: ["latest"], queryFn: fetchLatestEpisodes });
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let l = [...(animes.data ?? [])];
    if (genre) l = l.filter((a) => a.genres.includes(genre));
    if (q) l = l.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
    if (sort === "score") l.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    if (sort === "az") l.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    if (sort === "eps") l.sort((a, b) => b.episode_count - a.episode_count);
    return l;
  }, [animes.data, genre, sort, q]);

  const featured = (animes.data ?? []).filter((a) => a.featured);
  const showcase = featured.length ? featured : (animes.data ?? []).slice(0, 1);

  return (
    <div>
      <FeaturedShowcase animes={showcase} />

      <div className="mx-auto max-w-7xl space-y-12 px-5 py-8 sm:px-8">
        <ContinueWatching />
        <TodayStrip />
        {!!latest.data?.length && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-bold sm:text-2xl">Son Eklenen Bölümler</h2><Link to="/takvim" className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary">Takvim<ArrowUpRight className="h-4 w-4" /></Link></div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {latest.data.map((e) => (
                <Link key={e.id} to="/izle/$episodeId" params={{ episodeId: episodeParam(e.id, e.animes?.title, e.number) }} className="group w-64 shrink-0">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
                    {e.animes?.cover_url && <img src={e.animes.cover_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-fade" />
                    <span className="absolute bottom-2 left-3 text-sm font-semibold">{e.number}. Bölüm · <span className="text-primary">YENİ</span></span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium">{e.animes?.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="border-y border-border py-8 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <h2 className="text-xl font-bold sm:text-2xl">Arkadaşlarınla aynı anda izle</h2>
          <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
            <Button asChild variant="hero"><Link to="/birlikte-izle">Oda Oluştur</Link></Button>
            <Button asChild variant="glass"><Link to="/topluluk">Topluluk Sohbeti</Link></Button>
          </div>
        </section>

        <section>
          <div className="mb-5 grid min-w-0 gap-4 sm:flex sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold">Anime Kataloğu</h2>
              <p className="text-sm text-muted-foreground">{list.length} anime listeleniyor</p>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Anime ara..." className="w-full pl-9 sm:w-48" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="new">En Yeni</option>
                <option value="score">En Yüksek Puan</option>
                <option value="az">İsme Göre (A-Z)</option>
                <option value="eps">Bölüm Sayısı</option>
              </select>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {[null, ...GENRES].map((g) => (
              <Button key={g ?? "all"} onClick={() => setGenre(g)} variant={genre === g ? "default" : "secondary"} size="sm" className="rounded-full">
                {g ?? "Tümü"}
              </Button>
            ))}
          </div>
          {animes.isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {list.slice(0, 20).map((a) => <AnimeCard key={a.id} anime={a} episodes={a.episode_count} />)}
            </div>
          )}
          {list.length > 20 && (
            <div className="mt-8 flex justify-center">
              <Button asChild variant="hero" size="lg"><Link to="/animeler">Daha Fazla İzle</Link></Button>
            </div>
          )}
          {!animes.isLoading && list.length === 0 && <p className="text-muted-foreground">Bu filtreye uygun anime yok.</p>}
        </section>

        <SeoIntro />
      </div>
    </div>
  );
}

function SeoIntro() {
  return (
    <section className="max-w-3xl space-y-3 text-sm text-muted-foreground">
      <h1 className="text-2xl font-bold text-foreground">AnimeXir — Türkçe Altyazılı ve Dublajlı Anime İzle</h1>
      <p>
        AnimeXir, Türkçe altyazılı ve Türkçe dublajlı animeleri tek yerde toplayan ücretsiz bir anime izleme platformudur.
        Aksiyon, macera, romantik, komedi, fantastik ve daha birçok türdeki animeyi Full HD kalitede keşfedebilir, yeni çıkan
        bölümleri takip edebilirsin.
      </p>
      <p>
        <Link to="/takvim" className="text-primary hover:underline">Haftalık anime yayın takvimi</Link> ile hangi gün hangi
        bölümün çıkacağını Türkiye saatiyle görebilir, beğendiğin animeleri takip ederek yeni bölüm hatırlatmaları alabilirsin.{" "}
        <Link to="/birlikte-izle" className="text-primary hover:underline">Birlikte izle</Link> odalarında arkadaşlarınla aynı
        anda izleyip sohbet edebilir, <Link to="/topluluk" className="text-primary hover:underline">topluluk sohbetinde</Link>{" "}
        diğer anime severlerle buluşabilirsin.
      </p>
      <div className="pt-4"><GenreLinks /></div>
    </section>
  );
}
