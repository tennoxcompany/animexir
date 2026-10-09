import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { fetchAnimes, roomCode, timeAgo } from "@/lib/data";

export const Route = createFileRoute("/birlikte-izle")({
  head: () => ({
    meta: [
      { title: "Birlikte İzle — AnimeXir" },
      { name: "description", content: "İzleme odası kur, kodu paylaş, arkadaşlarınla senkron anime izle ve sohbet et." },
      { property: "og:title", content: "Birlikte İzle — AnimeXir" },
      { property: "og:description", content: "Arkadaşlarınla senkron anime izle ve sohbet et." },
    ],
  }),
  component: PartyPage,
});

function PartyPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });
  const [animeId, setAnimeId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");

  const eps = useQuery({
    queryKey: ["eps", animeId], enabled: !!animeId,
    queryFn: async () => (await supabase.from("episodes").select("id, number, title").eq("anime_id", animeId).order("number")).data ?? [],
  });
  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*, profiles(username)").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const create = async () => {
    if (!userId) return toast.error("Oda kurmak için giriş yap");
    if (!episodeId) return toast.error("Bölüm seç");
    const c = roomCode();
    const a = animes.data?.find((x) => x.id === animeId);
    const e = eps.data?.find((x) => x.id === episodeId);
    const { error } = await supabase.from("rooms").insert({ code: c, episode_id: episodeId, host_id: userId, title: title || `${a?.title} — ${e?.number}. Bölüm` });
    if (error) return toast.error(error.message);
    navigate({ to: "/oda/$code", params: { code: c } });
  };
  const join = () => {
    if (code.trim().length !== 6) return toast.error("6 haneli kod gir");
    navigate({ to: "/oda/$code", params: { code: code.trim().toUpperCase() } });
  };

  const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Birlikte İzle</h1>
      <p className="mt-2 text-muted-foreground">Arkadaşlarınla aynı anda izle, oynat/durdur senkron olsun, canlı sohbet et.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Yeni oda başlat</h2>
          <div className="mt-4 space-y-3">
            <select className={sel} value={animeId} onChange={(e) => { setAnimeId(e.target.value); setEpisodeId(""); }}>
              <option value="">Anime seç</option>
              {animes.data?.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <select className={sel} value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} disabled={!animeId}>
              <option value="">Bölüm seç</option>
              {eps.data?.map((e) => <option key={e.id} value={e.id}>{e.number}. Bölüm {e.title ? `— ${e.title}` : ""}</option>)}
            </select>
            <Input placeholder="Oda başlığı (isteğe bağlı)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button variant="hero" className="w-full" onClick={create}>Oda Oluştur</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Kod ile katıl</h2>
          <p className="mt-1 text-sm text-muted-foreground">Arkadaşının paylaştığı 6 haneli kodu gir.</p>
          <Input className="mt-4 h-14 text-center font-display text-2xl uppercase tracking-[0.4em]" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" />
          <Button variant="glass" className="mt-3 w-full" onClick={join}>Odaya Bağlan</Button>
        </div>
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Açık odalar</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.data?.map((r: any) => (
          <Link key={r.id} to="/oda/$code" params={{ code: r.code }} className="rounded-xl border border-border bg-card p-4 hover:border-primary">
            <p className="font-semibold">{r.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">Kurucu: {r.profiles?.username} · {timeAgo(r.created_at)}</p>
            <p className="mt-2 font-display text-sm tracking-widest text-primary">{r.code}</p>
          </Link>
        ))}
        {!rooms.data?.length && <p className="text-muted-foreground">Henüz açık oda yok, ilkini sen kur.</p>}
      </div>
    </div>
  );
}
