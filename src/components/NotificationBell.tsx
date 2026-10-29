import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Header";
import { markSeen, removeReminder, useReminders, type Reminder } from "@/lib/reminders";

type R = { id: string; requester_id: string; profiles: { username: string; avatar_url: string | null } | null };

const when = (s: number) => new Date(s * 1000).toLocaleString("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export function NotificationBell({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<R[]>([]);
  const rem = useReminders();
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!userId) return setItems([]);
    const { data } = await supabase.from("friendships").select("id, requester_id").eq("addressee_id", userId).eq("status", "pending");
    const ids = (data ?? []).map((d) => d.requester_id);
    const { data: ps } = ids.length ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids) : { data: [] };
    setItems((data ?? []).map((d) => ({ ...d, profiles: ps?.find((p) => p.id === d.requester_id) ?? null })));
  };

  useEffect(() => {
    load();
    const ch = userId ? supabase.channel(`fr-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe() : null;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { if (ch) supabase.removeChannel(ch); document.removeEventListener("mousedown", close); };
  }, [userId]);

  const accept = async (id: string) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); load(); };
  const reject = async (id: string) => { await supabase.from("friendships").delete().eq("id", id); load(); };
  const toggle = () => { if (!open && rem.unseen) markSeen(); setOpen(!open); };
  const count = items.length + rem.unseen;
  const empty = !items.length && !rem.aired.length && !rem.upcoming.length;

  return (
    <div ref={ref} className="relative">
      <button aria-label="Bildirimler" onClick={toggle} data-testid="notification-bell" className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
        <Bell className="h-5 w-5" />
        {count > 0 && <span data-testid="notification-count" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl" data-testid="notification-panel">
          <p className="px-2 py-1 text-sm font-semibold">Bildirimler</p>
          {empty && <p className="px-2 py-4 text-sm text-muted-foreground">Yeni bildirim yok. Takvimden bir bölüme zil ile abone olabilirsin.</p>}
          {items.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-secondary">
              <Link to="/kullanici/$id" params={{ id: r.requester_id }} onClick={() => setOpen(false)}><Avatar url={r.profiles?.avatar_url} name={r.profiles?.username} size={32} /></Link>
              <p className="flex-1 text-xs"><b>{r.profiles?.username}</b> sana arkadaşlık isteği gönderdi</p>
              <button onClick={() => accept(r.id)} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Kabul</button>
              <button onClick={() => reject(r.id)} className="rounded-md bg-secondary px-2 py-1 text-xs">Reddet</button>
            </div>
          ))}
          {rem.aired.map((r) => <ReminderRow key={r.id} r={r} aired onGo={() => setOpen(false)} />)}
          {rem.upcoming.length > 0 && <p className="mt-1 px-2 pt-2 text-xs font-semibold text-muted-foreground">Hatırlatmalarım</p>}
          {rem.upcoming.map((r) => <ReminderRow key={r.id} r={r} onGo={() => setOpen(false)} />)}
        </div>
      )}
    </div>
  );
}

function ReminderRow({ r, aired, onGo }: { r: Reminder; aired?: boolean; onGo: () => void }) {
  const inner = (
    <>
      {r.cover && <img src={r.cover} alt="" className="h-11 w-8 shrink-0 rounded object-cover" />}
      <p className="flex-1 text-xs">
        <b>{r.title}</b> {r.episode}. bölüm {aired ? <span className="text-primary">yayınlandı!</span> : <span className="text-muted-foreground">· {when(r.airingAt)}</span>}
      </p>
    </>
  );
  return (
    <div className={`flex items-center gap-2 rounded-lg p-2 hover:bg-secondary ${aired && !r.seen ? "bg-primary/10" : ""}`} data-testid={`reminder-${r.id}`}>
      {r.siteId
        ? <Link to="/anime/$id" params={{ id: r.siteId }} onClick={onGo} className="flex flex-1 items-center gap-2">{inner}</Link>
        : <Link to="/takvim" onClick={onGo} className="flex flex-1 items-center gap-2">{inner}</Link>}
      <button onClick={() => removeReminder(r.id)} aria-label="Kaldır" data-testid={`reminder-remove-${r.id}`} className="rounded p-1 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
