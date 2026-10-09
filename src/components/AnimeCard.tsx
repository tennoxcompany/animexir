import { Link } from "@tanstack/react-router";
import type { Anime } from "@/lib/data";

export function AnimeCard({ anime, episodes }: { anime: Anime; episodes?: number }) {
  return (
    <Link to="/anime/$id" params={{ id: anime.id }} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-card">
        {anime.cover_url && (
          <img src={anime.cover_url} alt={anime.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-fade opacity-80" />
        <span className="absolute left-2 top-2 rounded-md glass px-2 py-0.5 text-xs font-semibold text-gold">★ {anime.score ?? "–"}</span>
        {anime.has_dub && <span className="absolute right-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">TR Dublaj</span>}
        {episodes !== undefined && <span className="absolute bottom-2 left-2 text-xs text-muted-foreground">{episodes} Bölüm</span>}
      </div>
      <h4 className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-primary">{anime.title}</h4>
      <p className="line-clamp-1 text-xs text-muted-foreground">{anime.genres.slice(0, 2).join(" · ")}</p>
    </Link>
  );
}
