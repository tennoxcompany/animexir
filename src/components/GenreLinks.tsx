import { Link } from "@tanstack/react-router";
import { GENRES } from "@/lib/data";
import { slugify } from "@/lib/seo";

export const genreSlug = (g: string) => slugify(g);

export function GenreLinks({ current }: { current?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Türlere Göz At</h2>
      <div className="flex flex-wrap gap-2">
        {GENRES.filter((g) => g !== current).map((g) => (
          <Link key={g} to="/tur/$genre" params={{ genre: genreSlug(g) }} data-testid={`genre-link-${genreSlug(g)}`}
            className="rounded-full bg-secondary px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {g} Animeleri
          </Link>
        ))}
      </div>
    </section>
  );
}
