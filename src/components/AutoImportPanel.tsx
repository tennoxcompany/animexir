import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAutoImportSettings, runAutoImport } from "@/lib/autoImport";

const db = supabase as unknown as SupabaseClient;

export function AutoImportPanel({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["auto-import"],
    queryFn: () => getAutoImportSettings(db),
    refetchInterval: 60_000,
  });
  const s = q.data;

  const toggle = async (enabled: boolean) => {
    const { error } = await db.from("auto_import_settings").update({ enabled }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success(enabled ? "Otomatik çekme açıldı" : "Otomatik çekme kapatıldı");
    q.refetch();
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await runAutoImport(db, { force: true });
      toast.success(`${r.added} anime eklendi, ${r.updated} anime güncellendi`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Çalıştırılamadı");
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["auto-import"] });
  };

  return (
    <section
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-6"
      data-testid="auto-import-panel"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold">AniList'ten otomatik anime çekme</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Açıkken her 5 dakikada bir AniList'ten sıradaki popüler animeler sezonlarıyla birlikte
          çekilir. Önce bu sezonun animeleri, sonra tüm katalog. Sitede olanlar tekrar eklenmez,
          bilgileri güncellenir.
        </p>
        {q.isError && (
          <p className="mt-2 text-sm text-destructive" data-testid="auto-import-load-error">
            Ayarlar okunamadı: {(q.error as Error).message}
          </p>
        )}
        {s && (
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p data-testid="auto-import-last-run">
              Son çalışma:{" "}
              {s.last_run_at ? new Date(s.last_run_at).toLocaleString("tr-TR") : "henüz çalışmadı"}
            </p>
            <p data-testid="auto-import-last-counts">
              Son tur: {s.last_added} eklendi, {s.last_updated} güncellendi · Toplam eklenen:{" "}
              {s.total_added}
            </p>
            <p data-testid="auto-import-cursor">
              Sıradaki: {s.phase === "season" ? "bu sezon" : "tüm katalog"}, sayfa {s.page}
            </p>
            {s.last_error && (
              <p className="text-destructive" data-testid="auto-import-last-error">
                Son hata: {s.last_error}
              </p>
            )}
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch
          checked={!!s?.enabled}
          disabled={!s}
          onCheckedChange={toggle}
          data-testid="auto-import-toggle"
        />
        {s?.enabled ? "Açık" : "Kapalı"}
      </label>
      <Button
        variant="glass"
        onClick={runNow}
        disabled={busy || !s}
        data-testid="auto-import-run-now"
      >
        <Play className={busy ? "animate-pulse" : ""} /> {busy ? "Çekiliyor..." : "Şimdi çalıştır"}
      </Button>
    </section>
  );
}
