import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Header";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/kullanici/$id")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Kullanıcı Profili — AnimeXir" },
      { name: "description", content: "AnimeXir topluluk üyesinin profili." },
      { property: "og:title", content: "Kullanıcı Profili — AnimeXir" },
      { property: "og:description", content: "AnimeXir topluluk üyesinin profili." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserPage,
});

type P = { id: string; username: string; avatar_url: string | null; banner_url: string | null; bio: string | null; badge: string | null; accent_color: string | null };
type F = { id: string; requester_id: string; addressee_id: string; status: string };

function UserPage() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const [p, setP] = useState<P | null>(null);
  const [f, setF] = useState<F | null>(null);
  const [friends, setFriends] = useState(0);

  const loadF = async () => {
    if (!userId || userId === id) return;
    const { data } = await supabase.from("friendships").select("*")
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${userId})`).maybeSingle();
    setF(data as F | null);
  };

  useEffect(() => {
    supabase.from("profiles").select("id, username, avatar_url, banner_url, bio, badge, accent_color").eq("id", id).maybeSingle()
      .then(({ data }) => setP(data as P | null));
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted")
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`).then(({ count }) => setFriends(count ?? 0));
    loadF();
  }, [id, userId]);

  const send = async () => {
    const { error } = await supabase.from("friendships").insert({ requester_id: userId!, addressee_id: id });
    if (error) return toast.error("İstek gönderilemedi");
    toast.success("Arkadaşlık isteği gönderildi"); loadF();
  };
  const accept = async () => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", f!.id); toast.success("Artık arkadaşsınız"); loadF(); };
  const remove = async () => { await supabase.from("friendships").delete().eq("id", f!.id); setF(null); };

  if (!p) return <div className="mx-auto max-w-4xl px-4 pt-28 text-muted-foreground">Yükleniyor...</div>;
  const accent = p.accent_color ?? "#e11d48";

  let action: React.ReactNode = null;
  if (!userId) action = <Button asChild variant="hero"><Link to="/giris">Arkadaş eklemek için giriş yap</Link></Button>;
  else if (userId === id) action = <Button asChild variant="glass"><Link to="/profil">Profilimi düzenle</Link></Button>;
  else if (!f) action = <Button variant="hero" onClick={send}>Arkadaş ekle</Button>;
  else if (f.status === "accepted") action = <Button variant="glass" onClick={remove}>Arkadaşlıktan çıkar</Button>;
  else if (f.requester_id === userId) action = <Button variant="glass" onClick={remove}>İsteği geri çek</Button>;
  else action = <div className="flex gap-2"><Button variant="hero" onClick={accept}>Kabul et</Button><Button variant="glass" onClick={remove}>Reddet</Button></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-40 bg-cover bg-center sm:h-56" style={{ backgroundImage: p.banner_url ? `url(${p.banner_url})` : `linear-gradient(135deg, ${accent}, transparent)` }} />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="-mt-16"><Avatar url={p.avatar_url} name={p.username} size={96} /></div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{p.username}</h1>
            {p.badge && <p className="text-sm text-gold">{p.badge}</p>}
            <p className="text-xs text-muted-foreground">{friends} arkadaş</p>
          </div>
          {action}
        </div>
        {p.bio && <p className="px-6 pb-6 text-sm text-muted-foreground">{p.bio}</p>}
      </div>
    </div>
  );
}
