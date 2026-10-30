import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Header";
import { UserName } from "@/components/UserName";
import { useUnreadDms } from "@/components/HeaderXir";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/data";
import { NOINDEX } from "@/lib/seo";
import { useTyping } from "@/lib/typing";

export const Route = createFileRoute("/mesajlar")({
  validateSearch: (s: Record<string, unknown>) => ({ to: typeof s["to"] === "string" ? (s["to"] as string) : undefined }),
  head: () => ({ meta: [NOINDEX, { title: "Mesajlar — AnimeXir" }] }),
  component: MessagesPage,
});

type Friend = { id: string; username: string; avatar_url: string | null };
type Dm = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };

function useFriends(userId: string | null) {
  return useQuery({
    queryKey: ["dm-friends", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      const ids = (data ?? []).map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
      if (!ids.length) return [] as Friend[];
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      return (ps ?? []) as Friend[];
    },
  });
}

function MessagesPage() {
  const { userId, loading } = useAuth();
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const friends = useFriends(userId);
  const unread = useUnreadDms();

  if (loading) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  if (!userId) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Mesajlar</h1>
      <p className="mt-3 text-muted-foreground">Arkadaşlarınla özel mesajlaşmak için giriş yap.</p>
      <Button asChild variant="hero" className="mt-6"><Link to="/giris">Giriş Yap</Link></Button>
    </div>
  );
  const active = friends.data?.find((f) => f.id === to) ?? null;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-[280px_1fr]">
      <aside className={`rounded-xl border border-border bg-card p-3 ${active ? "hidden md:block" : ""}`}>
        <h1 className="mb-3 px-2 text-xl font-bold">Mesajlar</h1>
        {friends.data?.length === 0 && (
          <p data-testid="dm-no-friends" className="px-2 text-sm text-muted-foreground">Henüz arkadaşın yok. Topluluktan birinin profiline girip arkadaş ekle; arkadaş olunca mesajlaşabilirsiniz.</p>
        )}
        <div className="space-y-1">
          {friends.data?.map((f) => {
            const n = unread.filter((u) => u.sender_id === f.id).length;
            return (
              <button key={f.id} data-testid={`dm-friend-${f.id}`} onClick={() => navigate({ to: "/mesajlar", search: { to: f.id } })}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${f.id === to ? "bg-accent" : "hover:bg-secondary"}`}>
                <Avatar url={f.avatar_url} name={f.username} size={32} />
                <UserName id={f.id} name={f.username} className="flex-1 truncate font-medium" />
                {n > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{n}</span>}
              </button>
            );
          })}
        </div>
      </aside>
      {active ? <Conversation me={userId} friend={active} /> : (
        <section className="hidden h-[70vh] flex-col items-center justify-center rounded-xl border border-border bg-card text-muted-foreground md:flex">
          <MessageCircle className="mb-3 h-10 w-10" />
          {to && friends.data && !active ? "Bu kişiyle mesajlaşmak için önce arkadaş olmalısınız." : "Bir arkadaşını seç ve yazmaya başla."}
        </section>
      )}
    </div>
  );
}

function Conversation({ me, friend }: { me: string; friend: Friend }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const key = ["dm", me, friend.id];
  const { friendTyping, notifyTyping, stopTyping } = useTyping(me, friend.id);
  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase.from("direct_messages").select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${me})`)
        .order("created_at", { ascending: true }).limit(300);
      return (data ?? []) as Dm[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`dm-${me}-${friend.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${me}` }, (p) => {
        if ((p.new as Dm).sender_id === friend.id) qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, friend.id]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
    if (msgs.data?.some((m) => m.recipient_id === me && !m.read_at)) {
      supabase.from("direct_messages").update({ read_at: new Date().toISOString() })
        .eq("recipient_id", me).eq("sender_id", friend.id).is("read_at", null)
        .then(() => qc.invalidateQueries({ queryKey: ["dm-unread", me] }));
    }
  }, [msgs.data]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    stopTyping();
    const { error } = await supabase.from("direct_messages").insert({ sender_id: me, recipient_id: friend.id, body: body.slice(0, 2000) });
    if (error) { setText(body); return toast.error("Mesaj gönderilemedi"); }
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <section data-testid="dm-conversation" className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Link to="/mesajlar" search={{ to: undefined }} className="text-sm text-muted-foreground md:hidden">←</Link>
        <Link to="/kullanici/$id" params={{ id: friend.id }}><Avatar url={friend.avatar_url} name={friend.username} size={32} /></Link>
        <Link to="/kullanici/$id" params={{ id: friend.id }} className="font-bold hover:text-primary"><UserName id={friend.id} name={friend.username} /></Link>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.data?.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div data-testid="dm-message" className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}{mine && m.read_at ? " · görüldü" : ""}</p>
              </div>
            </div>
          );
        })}
        {msgs.data?.length === 0 && <p className="text-center text-sm text-muted-foreground">İlk mesajı sen gönder!</p>}
        {friendTyping && (
          <div data-testid="dm-typing-indicator" className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex gap-0.5 rounded-2xl bg-secondary px-3 py-2">
              {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />)}
            </span>
            {friend.username} yazıyor...
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <Input data-testid="dm-input" value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) notifyTyping(); else stopTyping(); }} onBlur={stopTyping} placeholder={`${friend.username} kişisine yaz...`} maxLength={2000} />
        <Button data-testid="dm-send" variant="hero" type="submit"><Send className="h-4 w-4" /></Button>
      </form>
    </section>
  );
}
