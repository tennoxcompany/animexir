import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Header";

type R = { id: string; requester_id: string; profiles: { username: string; avatar_url: string | null } | null };

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<R[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase.from("friendships").select("id, requester_id").eq("addressee_id", userId).eq("status", "pending");
    const ids = (data ?? []).map((d) => d.requester_id);
    const { data: ps } = ids.length ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids) : { data: [] };
    setItems((data ?? []).map((d) => ({ ...d, profiles: ps?.find((p) => p.id === d.requester_id) ?? null })));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`fr-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe();
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { supabase.removeChannel(ch); document.removeEventListener("mousedown", close); };
  }, [userId]);

  const accept = async (id: string) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); load(); };
  const reject = async (id: string) => { await supabase.from("friendships").delete().eq("id", id); load(); };

  return (
    <div ref={ref} className="relative">
      <button aria-label="Bildirimler" onClick={() => setOpen(!open)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
        <Bell className="h-5 w-5" />
        {items.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
          <p className="px-2 py-1 text-sm font-semibold">Bildirimler</p>
          {items.length === 0 ? <p className="px-2 py-4 text-sm text-muted-foreground">Yeni bildirim yok.</p> : items.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-secondary">
              <Link to="/kullanici/$id" params={{ id: r.requester_id }} onClick={() => setOpen(false)}><Avatar url={r.profiles?.avatar_url} name={r.profiles?.username} size={32} /></Link>
              <p className="flex-1 text-xs"><b>{r.profiles?.username}</b> sana arkadaşlık isteği gönderdi</p>
              <button onClick={() => accept(r.id)} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Kabul</button>
              <button onClick={() => reject(r.id)} className="rounded-md bg-secondary px-2 py-1 text-xs">Reddet</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
