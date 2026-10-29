import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { lastSync, SYNC_EVERY, syncAiringEpisodes } from "@/lib/autoEpisodes";

let running = false;

async function run(qc: ReturnType<typeof useQueryClient>, manual: boolean) {
  if (running) return;
  running = true;
  try {
    const r = await syncAiringEpisodes();
    if (r.added) {
      toast.success(`${r.added} yeni bölüm otomatik eklendi`, { description: r.titles.join(", ") });
      qc.invalidateQueries();
    } else if (manual) toast.info("Yeni bölüm yok, her şey güncel");
  } catch {
    if (manual) toast.error("Kontrol başarısız, biraz sonra tekrar dene");
  } finally {
    running = false;
    window.dispatchEvent(new Event("axr-ep-sync"));
  }
}

/** Yönetici siteyi açık tuttuğu sürece yayındaki animelerin yeni bölümlerini ekler. */
export function AutoEpisodeSync() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!isAdmin) return;
    const tick = () => { if (Date.now() - lastSync() >= SYNC_EVERY) run(qc, false); };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [isAdmin, qc]);
  return null;
}

export function AutoEpisodePanel() {
  const qc = useQueryClient();
  const [last, setLast] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = () => setLast(lastSync());
    s();
    window.addEventListener("axr-ep-sync", s);
    return () => window.removeEventListener("axr-ep-sync", s);
  }, []);
  const now = async () => { setBusy(true); await run(qc, true); setBusy(false); };
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-6" data-testid="auto-episode-panel">
      <div className="flex-1">
        <h2 className="text-xl font-bold">Otomatik bölüm ekleme <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground">Açık</span></h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Siz siteyi açık tuttukça yayını süren animelerin yeni çıkan bölümleri 30 dakikada bir kendiliğinden eklenir. Var olan bölümlere ve video linklerine dokunulmaz.
        </p>
        <p className="mt-1 text-xs text-muted-foreground" data-testid="auto-episode-last">
          Son kontrol: {last ? new Date(last).toLocaleString("tr-TR") : "henüz yapılmadı"}
        </p>
      </div>
      <Button variant="glass" onClick={now} disabled={busy} data-testid="auto-episode-sync-now">
        <RefreshCw className={busy ? "animate-spin" : ""} /> {busy ? "Kontrol ediliyor..." : "Şimdi kontrol et"}
      </Button>
    </section>
  );
}
