import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/oda/$code")({
  head: () => ({
    meta: [
      { title: "İzleme Odası — AnimeXir" },
      { name: "description", content: "Canlı izleme odası: senkron oynatma, sohbet ve tepkiler." },
      { property: "og:title", content: "İzleme Odası — AnimeXir" },
      { property: "og:description", content: "Canlı izleme odasına katıl." },
    ],
  }),
  component: Room,
});

const EMOJIS = ["🔥", "❤️", "😮", "😂", "👏", "⚡"];
type Msg = { id: string; body: string; user_id: string; created_at: string; username?: string };

function Room() {
  const { code } = Route.useParams();
  const { userId, profile } = useAuth();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const applying = useRef(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [viewers, setViewers] = useState<string[]>([]);
  const [floats, setFloats] = useState<{ id: number; e: string; x: number }[]>([]);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", code],
    queryFn: async () => (await supabase.from("rooms").select("*, episodes(*, animes(title))").eq("code", code).maybeSingle()).data,
  });
  const isHost = !!room && room.host_id === userId;

  useEffect(() => {
    if (!room) return;
    supabase.from("room_messages").select("*, profiles(username)").eq("room_id", room.id).order("created_at").limit(100)
      .then(({ data }) => setMsgs((data ?? []).map((m: any) => ({ ...m, username: m.profiles?.username }))));

    const ch = supabase.channel(`room:${room.id}`, { config: { presence: { key: userId ?? `guest-${Math.random()}` } } });
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` }, async (p) => {
      const m = p.new as Msg;
      const { data } = await supabase.from("profiles").select("username").eq("id", m.user_id).maybeSingle();
      setMsgs((x) => [...x, { ...m, username: data?.username }]);
    })
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        const v = video.current; if (!v || isHost) return;
        applying.current = true;
        if (Math.abs(v.currentTime - payload.t) > 1.5) v.currentTime = payload.t;
        payload.playing ? v.play().catch(() => {}) : v.pause();
        setTimeout(() => (applying.current = false), 300);
      })
      .on("broadcast", { event: "react" }, ({ payload }) => addFloat(payload.e))
      .on("presence", { event: "sync" }, () => {
        const st = ch.presenceState<{ name: string }>();
        setViewers(Object.values(st).map((a) => a[0]?.name ?? "Misafir"));
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") await ch.track({ name: profile?.username ?? "Misafir" });
      });
    chan.current = ch;
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, userId, profile?.username, isHost]);

  // host periodically broadcasts state
  useEffect(() => {
    if (!isHost) return;
    const i = setInterval(() => {
      const v = video.current; if (!v) return;
      chan.current?.send({ type: "broadcast", event: "sync", payload: { t: v.currentTime, playing: !v.paused } });
    }, 2000);
    return () => clearInterval(i);
  }, [isHost]);

  const hostEvent = () => {
    const v = video.current; if (!v || !isHost || applying.current) return;
    chan.current?.send({ type: "broadcast", event: "sync", payload: { t: v.currentTime, playing: !v.paused } });
  };

  function addFloat(e: string) {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, e, x: 10 + Math.random() * 80 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2000);
  }
  const react = (e: string) => { addFloat(e); chan.current?.send({ type: "broadcast", event: "react", payload: { e } }); };

  const send = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!userId) return toast.error("Sohbet için giriş yap");
    if (!text.trim() || !room) return;
    const { error } = await supabase.from("room_messages").insert({ room_id: room.id, user_id: userId, body: text.trim() });
    if (error) toast.error(error.message); else setText("");
  };

  const close = async () => {
    if (room && isHost) await supabase.from("rooms").delete().eq("id", room.id);
    navigate({ to: "/birlikte-izle" });
  };

  if (isLoading) return <p className="p-10 text-muted-foreground">Odaya bağlanılıyor...</p>;
  if (!room) return <div className="p-10"><p>Oda bulunamadı.</p><Link to="/birlikte-izle" className="text-primary">Geri dön</Link></div>;
  const ep: any = room.episodes;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">CANLI</span>
            <h1 className="mt-1 text-2xl font-bold">{room.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => { navigator.clipboard.writeText(code); toast.success("Kod kopyalandı"); }}>
              <span className="font-display tracking-widest">{code}</span> <Copy />
            </Button>
            <Button variant="outline" onClick={close}>{isHost ? "Odayı Kapat" : "Ayrıl"}</Button>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
          {ep?.video_url ? (
            <video ref={video} src={ep.video_url} controls={isHost} className="h-full w-full"
              onPlay={hostEvent} onPause={hostEvent} onSeeked={hostEvent} />
          ) : <div className="flex h-full items-center justify-center text-muted-foreground">Bu bölümün videosu henüz yok.</div>}
          {floats.map((f) => (
            <span key={f.id} className="pointer-events-none absolute bottom-6 animate-out fade-out slide-out-to-top-40 text-4xl duration-2000" style={{ left: `${f.x}%` }}>{f.e}</span>
          ))}
        </div>
        {!isHost && <p className="mt-2 text-xs text-muted-foreground">Oynatma oda kurucusu tarafından kontrol ediliyor. Ses için videoya tıkla.</p>}
        <div className="mt-4 flex gap-2">
          {EMOJIS.map((e) => <button key={e} onClick={() => react(e)} className="rounded-lg bg-secondary px-3 py-2 text-xl transition-transform hover:scale-110">{e}</button>)}
        </div>
      </div>
      <aside className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-bold">Sohbet</p>
          <p className="text-xs text-muted-foreground">🟢 {viewers.length} izleyici: {viewers.join(", ")}</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
          {msgs.map((m) => <p key={m.id}><b className="text-primary">{m.username ?? "?"}:</b> {m.body}</p>)}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yaz..." />
          <Button variant="hero" type="submit">Gönder</Button>
        </form>
      </aside>
    </div>
  );
}
