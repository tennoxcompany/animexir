import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Header";
import { UserBadge, UserName } from "@/components/UserName";
import { ModMenu } from "@/components/ModMenu";
import { ChatGuard } from "@/components/ChatGuard";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/topluluk")({
  head: () => pageHead("/topluluk", "Topluluk Sohbeti — AnimeXir", "AnimeXir topluluğu: genel sohbet, yeni bölümler, anime önerileri ve Türkçe dublaj kanalları."),
  component: Community,
});

const CHANNELS = [
  { id: "genel-sohbet", d: "Ana sohbet ve tanışma kanalı" },
  { id: "yeni-bolumler", d: "Yeni çıkan bölümler hakkında" },
  { id: "anime-onerileri", d: "Ne izlesem? Öneriler burada" },
  { id: "turkce-dublaj", d: "Türkçe dublaj sohbetleri" },
];
type M = { id: string; body: string; user_id: string; created_at: string; profiles?: { username: string; avatar_url: string | null; badge: string | null } | null };

function Community() {
  const { userId, isAdmin } = useAuth();
  const [ch, setCh] = useState(CHANNELS[0]!.id);
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    const sel = "*, profiles(username, avatar_url, badge)";
    supabase.from("community_messages").select(sel).eq("channel", ch).order("created_at", { ascending: false }).limit(80)
      .then(({ data }) => setMsgs(((data ?? []) as M[]).reverse()));
    const c = supabase.channel(`community:${ch}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages", filter: `channel=eq.${ch}` }, async (p) => {
        if (p.eventType === "DELETE") return setMsgs((x) => x.filter((m) => m.id !== (p.old as M).id));
        if (p.eventType !== "INSERT") return;
        const { data } = await supabase.from("community_messages").select(sel).eq("id", (p.new as M).id).maybeSingle();
        if (data) setMsgs((x) => [...x, data as M]);
      }).subscribe();
    return () => { supabase.removeChannel(c); };
  }, [ch]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error("Mesaj için giriş yap");
    if (!text.trim()) return;
    if (!isAdmin && Date.now() - lastSent.current < 2000) return toast.error("Yavaşla! 2 saniyede bir mesaj atabilirsin.");
    lastSent.current = Date.now();
    const { error } = await supabase.from("community_messages").insert({ channel: ch, user_id: userId, body: text.trim() });
    if (error) toast.error(error.message); else setText("");
  };

  const active = CHANNELS.find((c) => c.id === ch)!;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1">
        <h1 className="mb-3 text-xl font-bold">Topluluk</h1>
        {CHANNELS.map((c) => (
          <button key={c.id} onClick={() => setCh(c.id)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${ch === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
            # {c.id}
          </button>
        ))}
        <p className="pt-4 text-xs text-muted-foreground">Saygılı olalım, spoiler vermeden önce uyaralım.</p>
      </aside>
      <section className="flex h-[75vh] flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-bold"># {active.id}</p>
          <p className="text-xs text-muted-foreground">{active.d}</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {msgs.map((m) => (
            <div key={m.id} className="group flex gap-3">
              <Link to="/kullanici/$id" params={{ id: m.user_id }}><Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} /></Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm"><Link to="/kullanici/$id" params={{ id: m.user_id }} className="font-bold hover:text-primary"><UserName id={m.user_id} name={m.profiles?.username} /></Link> <UserBadge badge={m.profiles?.badge} className="text-xs" /> <span className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</span></p>
                <p className="break-words text-sm text-muted-foreground">{m.body}</p>
              </div>
              {m.user_id === userId && (
                <button onClick={() => supabase.from("community_messages").delete().eq("id", m.id).then()} className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">Sil</button>
              )}
              <ModMenu userId={m.user_id} name={m.profiles?.username} message={{ table: "community_messages", id: m.id, onDeleted: () => setMsgs((x) => x.filter((y) => y.id !== m.id)) }} />
            </div>
          ))}
          {!msgs.length && <p className="text-sm text-muted-foreground">İlk mesajı sen yaz!</p>}
          <div ref={end} />
        </div>
        <ChatGuard>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <Input data-testid="community-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`#${ch} kanalına yaz...`} />
            <Button data-testid="community-send" variant="hero" type="submit">Gönder</Button>
          </form>
        </ChatGuard>
      </section>
    </div>
  );
}
