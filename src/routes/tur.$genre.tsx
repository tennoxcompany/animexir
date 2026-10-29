import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AnimeCard } from "@/components/AnimeCard";
import { restSelect } from "@/lib/rest";
import { GENRES } from "@/lib/genres";
import type { Anime } from "@/lib/data";
import { breadcrumbLd, pageHead, SITE_URL } from "@/lib/seo";
import { genreSlug, GenreLinks } from "@/components/GenreLinks";

export const Route = createFileRoute("/tur/$genre")({
  loader: async ({ params }) => {
    const genre = GENRES.find((g) => genreSlug(g) === params.genre);
    if (!genre) throw notFound();
    const animes = await restSelect<Anime>("animes", `select=*&genres=cs.${encodeURIComponent(`{"${genre}"}`)}&order=score.desc.nullslast`).catch(() => [] as Anime[]);
    return { genre, animes };
  },
  head: ({ loaderData, params }) => {
    const g = loaderData?.genre ?? "Anime";
    const path = `/tur/${params.genre}`;
    const h = pageHead(path, `${g} Animeleri İzle — Türkçe Altyazılı ve Dublajlı | AnimeXir`,
      `En iyi ${g.toLocaleLowerCase("tr")} animeleri Türkçe altyazılı ve dublajlı izle. ${loaderData?.animes.length ?? 0} ${g.toLocaleLowerCase("tr")} anime AnimeXir'de Full HD.`);
    return { ...h, scripts: [breadcrumbLd([{ name: "AnimeXir", url: `${SITE_URL}/` }, { name: `${g} Animeleri`, url: SITE_URL + path }])] };
  },
  component: GenrePage,
});

function GenrePage() {
  const { genre, animes } = Route.useLoaderData();
  const lower = genre.toLocaleLowerCase("tr");
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <nav className="text-sm text-muted-foreground"><Link to="/" className="hover:text-primary">AnimeXir</Link> › {genre} Animeleri</nav>
      <header className="max-w-3xl">
        <h1 data-testid="genre-title" className="text-4xl font-extrabold sm:text-5xl">{genre} Animeleri</h1>
        <p className="mt-3 text-muted-foreground">
          AnimeXir'deki tüm {lower} animeleri Türkçe altyazılı ve dublajlı olarak burada. Puana göre sıralanan listeden
          beğendiğin {lower} animeyi seç, bölümleri Full HD izle ve arkadaşlarınla birlikte izleme odalarında buluş.
        </p>
      </header>
      {animes.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {animes.map((a) => <AnimeCard key={a.id} anime={a} />)}
        </div>
      ) : <p className="text-muted-foreground">Bu türde henüz anime yok.</p>}
      <GenreLinks current={genre} />
    </div>
  );
}
