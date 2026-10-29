import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { readReminders, syncFollows, write } from "@/lib/reminders";
import { useNewAnimes } from "@/lib/newAnimes";

export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* ses desteklenmiyor */
  }
}

export function ReminderWatcher() {
  const navigate = useNavigate();
  const { all } = useNewAnimes();
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!all) return;
    if (!known.current) { known.current = new Set(all.map((a) => a.id)); return; }
    const added = all.filter((a) => !known.current!.has(a.id));
    if (!added.length) return;
    added.forEach((a) => known.current!.add(a.id));
    chime();
    for (const a of added) {
      toast(`Yeni anime eklendi: ${a.title}`, {
        duration: 15000,
        action: { label: "Göster", onClick: () => navigate({ to: "/anime/$id", params: { id: a.id } }) },
      });
    }
  }, [all, navigate]);
  useEffect(() => {
    const check = () => {
      const now = Date.now() / 1000;
      const list = readReminders();
      const due = list.filter((r) => r.airingAt <= now && !r.alerted);
      if (!due.length) return;
      const fresh = due.filter((r) => now - r.airingAt < 15 * 60);
      if (fresh.length) chime();
      for (const r of fresh) {
        toast(`${r.title} ${r.episode}. bölüm yayınlandı!`, {
          description: "Hatırlattığın bölüm şimdi çıktı.",
          duration: 15000,
          action: {
            label: "Göster",
            onClick: () => (r.siteId ? navigate({ to: "/anime/$id", params: { id: r.siteId } }) : navigate({ to: "/takvim" })),
          },
        });
      }
      write(list.map((r) => (r.airingAt <= now ? { ...r, alerted: true } : r)));
    };
    const sync = () => syncFollows().catch(() => {});
    check();
    sync();
    const a = setInterval(check, 15_000);
    const b = setInterval(sync, 30 * 60_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [navigate]);
  return null;
}
