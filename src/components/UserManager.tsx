import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Header";
import { UserBadge, UserName } from "@/components/UserName";
import { useAuth } from "@/lib/auth";
import { isMuted, MUTE_DURATIONS, muteText, useModActions, useModerators, type Sanction } from "@/lib/moderation";

type P = { id: string; username: string; avatar_url: string | null; badge: string | null; created_at: string };

/** Yönetici paneli: siteye kayıtlı herkes, moderatörlük, susturma ve yasak. */
export function UserManager() {
  const { userId: me } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "mod" | "muted" | "banned">("all");
  const mods = useModerators();
  const act = useModActions();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => ((await supabase.from("profiles").select("id, username, avatar_url, badge, created_at").order("created_at", { ascending: false }).limit(5000)).data ?? []) as P[],
  });
  const sanctions = useQuery({
    queryKey: ["sanctions"],
    queryFn: async () => new Map((((await supabase.from("user_sanctions").select("user_id, muted_until, banned")).data ?? []) as Sanction[]).map((s) => [s.user_id, s])),
  });

  const list = (users.data ?? []).filter((u) => {
    const s = sanctions.data?.get(u.id);
    if (q && !u.username.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))) return false;
    if (filter === "mod") return mods.data?.has(u.id);
    if (filter === "muted") return isMuted(s);
    if (filter === "banned") return s?.banned;
    return true;
  });
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <section data-testid="user-manager" className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Kullanıcılar ve Moderatörler</h2>
          <p className="text-sm text-muted-foreground">{users.data?.length ?? 0} kayıtlı üye · {mods.data?.size ?? 0} moderatör</p>
        </div>
        <div className="flex gap-2">
          <Input data-testid="user-search" placeholder="Kullanıcı ara..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <select data-testid="user-filter" className={sel} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Hepsi</option><option value="mod">Moderatörler</option><option value="muted">Susturulanlar</option><option value="banned">Yasaklılar</option>
          </select>
        </div>
      </div>
      <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
        {list.map((u) => {
          const s = sanctions.data?.get(u.id);
          const isMod = !!mods.data?.has(u.id);
          const self = u.id === me;
          return (
            <div key={u.id} data-testid={`user-row-${u.id}`} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar url={u.avatar_url} name={u.username} />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><Link to="/kullanici/$id" params={{ id: u.id }} className="font-bold hover:text-primary"><UserName id={u.id} name={u.username} /></Link> <UserBadge badge={u.badge} className="text-xs" /></p>
                <p className="text-xs text-muted-foreground">
                  {s?.banned ? <span className="text-destructive">Yasaklı</span> : isMuted(s) ? <span className="text-primary">Susturuldu · {muteText(s!)}</span> : "Aktif"}
                </p>
              </div>
              {!self && (
                <div className="flex flex-wrap gap-2">
                  <Button data-testid={`toggle-mod-${u.id}`} size="sm" variant={isMod ? "outline" : "hero"} onClick={() => act.setMod(u.id, !isMod)} disabled={s?.banned}>
                    {isMod ? "Moderatörlüğü al" : "Moderatör yap"}
                  </Button>
                  {isMuted(s) ? (
                    <Button data-testid={`unmute-${u.id}`} size="sm" variant="outline" onClick={() => act.unmute(u.id)}>Susturmayı kaldır</Button>
                  ) : (
                    <select data-testid={`mute-${u.id}`} className={sel} value="" onChange={(e) => { const d = MUTE_DURATIONS[Number(e.target.value)]!; act.mute(u.id, d.minutes, d.label); }}>
                      <option value="" disabled>Sustur...</option>
                      {MUTE_DURATIONS.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}
                    </select>
                  )}
                  <Button data-testid={`ban-${u.id}`} size="sm" variant="outline" className={s?.banned ? "" : "text-destructive"}
                    onClick={() => (s?.banned || confirm(`${u.username} yasaklansın mı?`)) && act.ban(u.id, !s?.banned)}>
                    {s?.banned ? "Yasağı kaldır" : "Yasakla"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {!list.length && <p className="py-6 text-sm text-muted-foreground">Kullanıcı bulunamadı.</p>}
      </div>
    </section>
  );
}
