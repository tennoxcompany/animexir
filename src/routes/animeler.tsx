import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimeCard } from "@/components/AnimeCard";
import { fetchAnimes, GENRES } from "@/lib/data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/animeler")({
  head: () => pageHead("/animeler", "Tüm Animeler — AnimeXir", "AnimeXir'deki tüm animeleri ara, türe göre filtrele ve sırala."),
  component: Animeler,
});

type Sort = "new" | "score" | "az" | "eps";

function Animeler() {
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let l = [...(animes.data ?? [])];
    if (genre) l = l.filter((a) => a.genres.includes(genre));
    if (q) l = l.filter((a) => a.title.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
    if (sort === "score") l.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    if (sort === "az") l.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    if (sort === "eps") l.sort((a, b) => b.episode_count - a.episode_count);
    return l;
  }, [animes.data, genre, sort, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tüm Animeler</h1>
          <p className="text-sm text-muted-foreground">{list.length} anime listeleniyor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Anime ara..." className="w-56 pl-9" />
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
    </div>
  );
}
