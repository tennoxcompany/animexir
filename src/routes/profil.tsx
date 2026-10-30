import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Header";
import { AnimeCard } from "@/components/AnimeCard";
import { UserBadge, UserName } from "@/components/UserName";
import { useAuth } from "@/lib/auth";
import { timeAgo, type Anime } from "@/lib/data";
import { episodeParam } from "@/lib/seo";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Profilim — AnimeXir" },
      { name: "description", content: "İzlediğin, bitirdiğin ve listene eklediğin animeler, izleme geçmişin ve rozetlerin." },
      { property: "og:title", content: "Profilim — AnimeXir" },
      { property: "og:description", content: "Anime listen, geçmişin ve rozetlerin." },
    ],
  }),
  component: ProfilePage,
});

const TABS = [
  { v: "watching", l: "İzliyorum" }, { v: "completed", l: "Bitirdim" }, { v: "plan", l: "Listem" },
  { v: "dropped", l: "Bıraktım" }, { v: "history", l: "Geçmiş" }, { v: "edit", l: "Düzenle" },
] as const;
const BADGES = ["AnimeXir Üyesi", "Anime Sever ⚡", "Otaku Ustası 🎌", "Efsanevi Büyücü ✨", "Korsan Kralı 🏴‍☠️", "Hokage Adayı 🍥", "Gölge Hükümdarı 👑", "Özel Seviye Avcı ⚡"];
const ACCENTS = [
  { name: "Kırmızı", value: "#e11d48" }, { name: "Turuncu", value: "#f97316" }, { name: "Altın", value: "#eab308" },
  { name: "Yeşil", value: "#22c55e" }, { name: "Mavi", value: "#3b82f6" }, { name: "Mor", value: "#a855f7" }, { name: "Pembe", value: "#ec4899" },
];

/** Görseli küçültüp data URL'e çevirir (depolamaya gerek kalmadan profile kaydedilir). */
function fileToDataUrl(file: File, maxW: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function ProfilePage() {
  const { userId, profile, isAdmin, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]["v"]>("watching");
  const [form, setForm] = useState({ username: "", avatar_url: "", bio: "", badge: "" });

  useEffect(() => { if (!loading && !userId) navigate({ to: "/giris" }); }, [loading, userId, navigate]);
  useEffect(() => { if (profile) setForm({ username: profile.username, avatar_url: profile.avatar_url ?? "", bio: profile.bio ?? "", badge: profile.badge ?? "" }); }, [profile]);

  const list = useQuery({
    queryKey: ["mylist", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("user_anime").select("status, animes(*)").eq("user_id", userId!)).data ?? [],
  });
  const history = useQuery({
    queryKey: ["history", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("watch_history").select("id, watched_at, episodes(id, number, animes(title))").eq("user_id", userId!).order("watched_at", { ascending: false }).limit(50)).data ?? [],
  });

  if (!profile) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  const count = (s: string) => list.data?.filter((x) => x.status === s).length ?? 0;
  const eps = history.data?.length ?? 0;

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      username: form.username.slice(0, 40), avatar_url: form.avatar_url || null, bio: form.bio.slice(0, 300),
      badge: isAdmin ? form.badge : BADGES.includes(form.badge) ? form.badge : profile.badge,
    }).eq("id", userId!);
    if (error) return toast.error(error.message);
    toast.success("Profil kaydedildi");
    refreshProfile();
  };
  const clearHistory = async () => {
    await supabase.from("watch_history").delete().eq("user_id", userId!);
    history.refetch();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center">
        <Avatar url={profile.avatar_url} name={profile.username} size={96} />
        <div className="flex-1">
          <h1 className="text-3xl font-bold"><UserName id={userId} name={profile.username} /></h1>
          <p className="text-sm"><UserBadge badge={profile.badge} /></p>
          <p className="mt-2 text-sm text-muted-foreground">{profile.bio || "Henüz biyografi yok."}</p>
          <p className="mt-1 text-xs text-muted-foreground">Katılım {new Date(profile.created_at).getFullYear()}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="glass" data-testid="profile-store-link"><Link to="/magaza">Xir Mağaza</Link></Button>
          {isAdmin && <Button asChild variant="hero"><Link to="/yonetim">Yönetici Paneli</Link></Button>}
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Çıkış</Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["İzlenen Bölüm", eps], ["Bitirilen", count("completed")], ["İzleniyor", count("watching")], ["Toplam Süre", `${Math.round((eps * 24) / 60)} sa`]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4">
            <p className="font-display text-3xl font-bold">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t.v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{t.l}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "history" ? (
          <div className="space-y-2">
            {!!eps && <Button variant="outline" size="sm" onClick={clearHistory}>Geçmişi temizle</Button>}
            {history.data?.map((h: any) => (
              <Link key={h.id} to="/izle/$episodeId" params={{ episodeId: episodeParam(h.episodes?.id, h.episodes?.animes?.title, h.episodes?.number) }} className="flex justify-between rounded-lg bg-card p-3 text-sm hover:bg-accent">
                <span>{h.episodes?.animes?.title} — {h.episodes?.number}. Bölüm</span>
                <span className="text-muted-foreground">{timeAgo(h.watched_at)}</span>
              </Link>
            ))}
            {!eps && <p className="text-muted-foreground">Henüz izleme geçmişin yok.</p>}
          </div>
        ) : tab === "edit" ? (
          <div className="max-w-lg space-y-3">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Kullanıcı adı" />
            <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="Avatar görsel bağlantısı (https://...)" />
            <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {isAdmin && <option value="👑 Kurucu">👑 Kurucu</option>}
              {BADGES.map((b) => <option key={b}>{b}</option>)}
            </select>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Hakkımda" />
            <Button variant="hero" onClick={save}>Kaydet</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
            {list.data?.filter((x) => x.status === tab).map((x: any) => <AnimeCard key={x.animes.id} anime={x.animes as Anime} />)}
            {!count(tab) && <p className="col-span-full text-muted-foreground">Bu listede anime yok. <Link to="/" className="text-primary">Keşfet</Link></p>}
          </div>
        )}
      </div>
    </div>
  );
}
