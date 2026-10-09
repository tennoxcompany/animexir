import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchAniList, trGenre, trStatus, trSeason, cleanDesc, episodeTitles, type AniResult } from "@/lib/anilist";

export function AniListImport({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AniResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try { setResults(await searchAniList(q.trim())); }
    catch { toast.error("Arama başarısız, tekrar dene"); }
    setBusy(false);
  };

  const add = async (a: AniResult) => {
    setAdding(a.id);
    const title = a.title.english || a.title.romaji || "İsimsiz";
    const season = trSeason(a.season, a.seasonYear);
    const { data: anime, error } = await supabase.from("animes").insert({
      title,
      cover_url: a.coverImage.extraLarge || a.coverImage.large,
      banner_url: a.bannerImage || a.coverImage.extraLarge,
      description: cleanDesc(a.description),
      studio: a.studios.nodes[0]?.name ?? null,
      status: trStatus(a.status) + (season ? ` · ${season}` : ""),
      score: a.averageScore ? a.averageScore / 10 : 0,
      genres: a.genres.map(trGenre),
    }).select("id").single();
    if (error || !anime) { setAdding(null); return toast.error(error?.message ?? "Eklenemedi"); }

    const count = a.episodes ?? a.streamingEpisodes.length ?? 0;
    if (count > 0) {
      const titles = episodeTitles(a, count);
      const { error: e2 } = await supabase.from("episodes").insert(
        titles.map((t, i) => ({ anime_id: anime.id, number: i + 1, title: t })),
      );
      if (e2) toast.error("Bölümler eklenemedi: " + e2.message);
    }
    toast.success(`${title} ${count} bölümüyle eklendi`);
    setAdding(null);
    onDone();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">AniList'ten otomatik ekle</h2>
      <p className="mt-1 text-sm text-muted-foreground">Animeyi ara, afiş, banner, açıklama, türler, sezon ve tüm bölümler otomatik eklensin.</p>
      <form onSubmit={search} className="mt-4 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Örn: Jujutsu Kaisen, One Piece..." />
        <Button variant="hero" type="submit" disabled={busy}><Search /> {busy ? "Aranıyor..." : "Ara"}</Button>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {results.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-xl bg-secondary p-3">
            <img src={a.coverImage.large ?? ""} alt="" className="h-28 w-20 shrink-0 rounded-md object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="line-clamp-2 font-semibold">{a.title.english || a.title.romaji}</p>
              <p className="text-xs text-muted-foreground">
                {[a.format, trSeason(a.season, a.seasonYear), `${a.episodes ?? "?"} bölüm`].filter(Boolean).join(" · ")}
              </p>
              {a.averageScore && <p className="text-xs text-gold">★ {(a.averageScore / 10).toFixed(1)}</p>}
              <Button size="sm" variant="hero" className="mt-auto self-start" disabled={adding !== null} onClick={() => add(a)}>
                {adding === a.id ? "Ekleniyor..." : "Sezonu ve bölümleri ekle"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
