import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { fetchAnimes } from "@/lib/data";
import { fetchWeekSchedule, weekStart } from "@/lib/schedule";

const fmtTime = (s: number) => new Date(s * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function TodayStrip() {
  const start = useMemo(() => weekStart(), []);
  const sched = useQuery({ queryKey: ["schedule", start.getTime()], queryFn: () => fetchWeekSchedule(start), staleTime: 10 * 60_000 });
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });

  const today = useMemo(() => {
    const d = new Date().toDateString();
    const site = new Set((animes.data ?? []).map((a) => a.anilist_id).filter(Boolean));
    return (sched.data ?? [])
      .filter((x) => new Date(x.airingAt * 1000).toDateString() === d)
      .sort((a, b) => Number(site.has(b.media.id)) - Number(site.has(a.media.id)) || a.airingAt - b.airingAt)
      .slice(0, 12)
      .sort((a, b) => a.airingAt - b.airingAt)
      .map((x) => ({ ...x, onSite: site.has(x.media.id) }));
  }, [sched.data, animes.data]);

  if (!today.length) return null;
  const now = Date.now() / 1000;
  return (
    <section data-testid="today-strip">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" /> Bugün Çıkanlar</h2>
        <Link to="/takvim" className="text-sm font-medium text-primary hover:underline" data-testid="today-strip-all-link">Takvimin tamamı →</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {today.map((x) => {
          const title = x.media.title.english ?? x.media.title.romaji ?? "";
          const aired = x.airingAt <= now;
          return (
            <Link key={x.id} to="/takvim" data-testid={`today-item-${x.id}`}
              className="group flex w-64 shrink-0 gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary">
              <img src={x.media.coverImage.large ?? ""} alt={title} loading="lazy" className="h-16 w-11 shrink-0 rounded-md object-cover" />
              <div className="min-w-0">
                <p className={`text-xs font-bold ${aired ? "text-muted-foreground" : "text-primary"}`}>{fmtTime(x.airingAt)} · {aired ? "Yayınlandı" : "Yakında"}</p>
                <p className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {x.episode}. Bölüm{x.onSite && <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">AnimeXir'de</span>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
