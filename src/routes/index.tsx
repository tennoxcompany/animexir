import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Play, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimeCard } from "@/components/AnimeCard";
import { GenreLinks } from "@/components/GenreLinks";
import { ContinueWatching } from "@/components/ContinueWatching";
import { TodayStrip } from "@/components/TodayStrip";
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

  const hero = animes.data?.find((a) => a.featured) ?? animes.data?.[0];

  return (
    <div>
      {hero && (
        <section className="relative h-[78vh] min-h-[520px] overflow-hidden">
          <img src={hero.banner_url ?? hero.cover_url ?? ""} alt={hero.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-side" />
          <div className="absolute inset-0 bg-fade" />
          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-20">
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground">Günün Öne Çıkanı</span>
              <span className="rounded-full glass px-3 py-1">Full HD 1080p</span>
              <span className="rounded-full glass px-3 py-1 text-gold">★ {hero.score}</span>
            </div>
            <p className="max-w-2xl text-5xl font-extrabold leading-none md:text-7xl">{hero.title}</p>
            <p className="mt-4 line-clamp-3 max-w-xl text-muted-foreground">{hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/anime/$id" params={{ id: animeParam(hero.id, hero.title) }}><Play className="fill-current" /> Hemen İzle</Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/birlikte-izle"><Users /> Birlikte İzle</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        <ContinueWatching />
        <TodayStrip />
        {!!latest.data?.length && (
          <section>
            <h2 className="mb-5 text-2xl font-bold">Son Eklenen Bölümler</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {latest.data.map((e) => (
                <Link key={e.id} to="/izle/$episodeId" params={{ episodeId: episodeParam(e.id, e.animes?.title, e.number) }} className="group w-64 shrink-0">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
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

        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-12">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
          <h2 className="relative text-3xl font-bold">Arkadaşlarınla aynı anda izle</h2>
          <p className="relative mt-2 max-w-lg text-muted-foreground">Oda kur, kodu paylaş, aynı saniyede izleyip canlı sohbet edin.</p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero"><Link to="/birlikte-izle">Oda Oluştur</Link></Button>
            <Button asChild variant="glass"><Link to="/topluluk">Topluluk Sohbeti</Link></Button>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Anime Kataloğu</h2>
              <p className="text-sm text-muted-foreground">{list.length} anime listeleniyor</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Anime ara..." className="w-48 pl-9" />
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
              <button key={g ?? "all"} onClick={() => setGenre(g)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${genre === g ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {g ?? "Tümü"}
              </button>
            ))}
          </div>
          {animes.isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {list.map((a) => <AnimeCard key={a.id} anime={a} episodes={a.episode_count} />)}
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
