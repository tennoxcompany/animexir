import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAnimes } from "@/lib/data";
import { fetchWeekSchedule, weekStart, type Airing } from "@/lib/schedule";

export const Route = createFileRoute("/takvim")({
  head: () => ({
    meta: [
      { title: "Haftalık Anime Yayın Takvimi — AnimeXir" },
      { name: "description", content: "Bu hafta hangi gün hangi anime bölümü çıkıyor? Türkiye saatiyle güncel haftalık anime yayın takvimi." },
      { property: "og:title", content: "Haftalık Anime Yayın Takvimi — AnimeXir" },
    ],
  }),
  component: SchedulePage,
});

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const fmtDate = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
const fmtTime = (s: number) => new Date(s * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function SchedulePage() {
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const [onlySite, setOnlySite] = useState(false);
  const start = useMemo(() => { const s = weekStart(); s.setDate(s.getDate() + offset * 7); return s; }, [offset]);

  const sched = useQuery({ queryKey: ["schedule", start.getTime()], queryFn: () => fetchWeekSchedule(start), staleTime: 10 * 60_000 });
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });
  const siteMap = useMemo(() => new Map((animes.data ?? []).filter((a) => a.anilist_id).map((a) => [a.anilist_id!, a.id])), [animes.data]);

  const byDay = useMemo(() => {
    const g: Airing[][] = DAYS.map(() => []);
    for (const x of sched.data ?? []) {
      if (onlySite && !siteMap.has(x.media.id)) continue;
      g[(new Date(x.airingAt * 1000).getDay() + 6) % 7]!.push(x);
    }
    return g;
  }, [sched.data, onlySite, siteMap]);

  const end = new Date(start); end.setDate(end.getDate() + 6);
  const todayIdx = offset === 0 ? (new Date().getDay() + 6) % 7 : -1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10" data-testid="schedule-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Yayın Takvimi</h1>
          <p className="mt-1 text-muted-foreground">{fmtDate(start)} – {fmtDate(end)} · saatler senin saat diliminde</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="icon" onClick={() => setOffset(offset - 1)} data-testid="schedule-prev-week" aria-label="Önceki hafta"><ChevronLeft /></Button>
          <Button variant="glass" onClick={() => setOffset(0)} disabled={offset === 0} data-testid="schedule-this-week">Bu Hafta</Button>
          <Button variant="glass" size="icon" onClick={() => setOffset(offset + 1)} data-testid="schedule-next-week" aria-label="Sonraki hafta"><ChevronRight /></Button>
        </div>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((d, i) => {
          const date = new Date(start); date.setDate(date.getDate() + i);
          return (
            <button key={d} onClick={() => setDay(i)} data-testid={`schedule-day-${i}`}
              className={`min-w-[110px] shrink-0 rounded-xl px-4 py-3 text-left transition-colors ${day === i ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}>
              <span className="block text-sm font-semibold">{d}{i === todayIdx && " · Bugün"}</span>
              <span className={`text-xs ${day === i ? "opacity-80" : "text-muted-foreground"}`}>{date.getDate()} {date.toLocaleDateString("tr-TR", { month: "short" })} · {byDay[i]!.length} bölüm</span>
            </button>
          );
        })}
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={onlySite} onChange={(e) => setOnlySite(e.target.checked)} className="accent-[var(--primary)]" data-testid="schedule-only-site-toggle" />
        Sadece AnimeXir'de olanları göster
      </label>

      <div className="mt-6">
        {sched.isLoading && <p className="text-muted-foreground" data-testid="schedule-loading">Takvim yükleniyor...</p>}
        {sched.isError && <p className="text-destructive" data-testid="schedule-error">Takvim şu an yüklenemedi, biraz sonra tekrar dene.</p>}
        {sched.data && byDay[day]!.length === 0 && <p className="text-muted-foreground" data-testid="schedule-empty">Bu gün için yayın yok.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="schedule-list">
          {byDay[day]!.map((x) => <AiringRow key={x.id} x={x} siteId={siteMap.get(x.media.id)} />)}
        </div>
      </div>
    </div>
  );
}

function AiringRow({ x, siteId }: { x: Airing; siteId?: string }) {
  const title = x.media.title.english ?? x.media.title.romaji ?? "";
  const diff = x.airingAt * 1000 - Date.now();
  const status = diff <= 0 ? "Yayınlandı" : diff < 86400_000 ? `${Math.floor(diff / 3600_000)} sa ${Math.floor((diff % 3600_000) / 60_000)} dk sonra` : null;
  const body = (
    <div className={`flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors ${siteId ? "hover:border-primary" : ""}`}>
      <img src={x.media.coverImage.large ?? ""} alt={title} loading="lazy" className="h-24 w-16 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-primary"><Clock className="h-3.5 w-3.5" /> {fmtTime(x.airingAt)}</p>
        <p className="mt-1 line-clamp-2 font-semibold leading-snug">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {x.episode}. Bölüm{x.media.episodes ? ` / ${x.media.episodes}` : ""}{status && <> · <span className={diff <= 0 ? "" : "text-gold"}>{status}</span></>}
        </p>
        {siteId && <span className="mt-2 inline-block rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">AnimeXir'de izle</span>}
      </div>
    </div>
  );
  return siteId
    ? <Link to="/anime/$id" params={{ id: siteId }} data-testid={`schedule-item-${x.id}`}>{body}</Link>
    : <div data-testid={`schedule-item-${x.id}`}>{body}</div>;
}
