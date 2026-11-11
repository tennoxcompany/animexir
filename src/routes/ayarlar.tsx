import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, Shield, MessageSquare, Trash2 } from "lucide-react";
import { AccountControls } from "@/components/AccountControls";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/ayarlar")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Ayarlar — AnimeXir" },
      { name: "description", content: "AnimeXir hesap ayarların: profil, gizlilik, geri bildirim ve hesap yönetimi." },
      { property: "og:title", content: "Ayarlar — AnimeXir" },
      { property: "og:description", content: "Hesabını ve tercihlerini yönet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = [
  { v: "profil", l: "Profil", icon: User },
  { v: "gizlilik", l: "Gizlilik", icon: Shield },
  { v: "geri", l: "Geri Bildirim", icon: MessageSquare },
  { v: "hesap", l: "Hesap", icon: Trash2 },
] as const;
type S = (typeof SECTIONS)[number]["v"];

function SettingsPage() {
  const { userId } = useAuth();
  const [s, setS] = useState<S>("profil");
  if (!userId) return (
    <div className="mx-auto max-w-md px-4 pt-28 text-center">
      <p className="mb-4 text-muted-foreground">Ayarlar için giriş yapmalısın.</p>
      <Button asChild variant="hero"><Link to="/giris">Giriş Yap</Link></Button>
    </div>
  );
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
      <h1 className="mb-6 font-display text-3xl font-bold">Ayarlar</h1>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside className="flex gap-1 overflow-x-auto md:flex-col">
          {SECTIONS.map(({ v, l, icon: I }) => (
            <button key={v} onClick={() => setS(v)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors ${s === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <I className="h-4 w-4" />{l}
            </button>
          ))}
        </aside>
        <section className="rounded-xl border border-border bg-card p-6">
          {s === "profil" && (<div className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Profil</h2>
            <p className="text-sm text-muted-foreground">Avatarını, rozetini, kapak görselini ve hakkında yazını düzenle.</p>
            <Button asChild variant="hero"><Link to="/profil" search={{ tab: "edit" }}>Profili düzenle</Link></Button>
          </div>)}
          {s === "gizlilik" && (<div className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Gizlilik</h2>
            <p className="text-sm text-muted-foreground">E-posta adresin kimseye gösterilmez. Hangi bilgilerin nasıl kullanıldığını gizlilik politikasında okuyabilirsin.</p>
            <Button asChild variant="outline"><Link to="/gizlilik">Gizlilik Politikası</Link></Button>
          </div>)}
          {s === "geri" && (<div className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Geri Bildirim</h2>
            <p className="text-sm text-muted-foreground">Siteden memnun musun? Puan ver, fikrini yaz.</p>
            <Button asChild variant="outline"><Link to="/geri-bildirim">Ankete git</Link></Button>
          </div>)}
          {s === "hesap" && (<div className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Hesap</h2>
            <AccountControls />
          </div>)}
        </section>
      </div>
    </div>
  );
}
