import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Coins, Crown, Gift, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserName } from "@/components/UserName";
import { useAuth } from "@/lib/auth";
import { NOINDEX } from "@/lib/seo";
import { DAILY_REWARD, ownsItem, rpcError, useAllCosmetics, useCosmetics, useWallet, XIR_ITEMS, type XirItemId } from "@/lib/xir";

export const Route = createFileRoute("/magaza")({
  head: () => ({ meta: [NOINDEX, { title: "Xir Mağaza — AnimeXir" }, { name: "description", content: "Xir Coin ile VIP rozet, renkli kullanıcı adı, profil ve site teması al." }] }),
  component: StorePage,
});

const todayTR = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

function StorePage() {
  const { userId, isAdmin, profile, loading } = useAuth();
  const wallet = useWallet();
  const cos = useAllCosmetics();
  const mine = useCosmetics(userId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  if (!userId) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Xir Mağaza</h1>
      <p className="mt-3 text-muted-foreground">Her gün giriş yap, {DAILY_REWARD} Xir Coin kazan ve VIP özellikleri aç.</p>
      <Button asChild variant="hero" className="mt-6"><Link to="/giris">Giriş Yap</Link></Button>
    </div>
  );

  const notReady = cos.isError || wallet.isError;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["xir-wallet", userId] }); qc.invalidateQueries({ queryKey: ["xir-cosmetics"] }); };
  const buy = async (id: XirItemId) => {
    setBusy(id);
    const { error } = await supabase.rpc("buy_xir_item", { _item: id });
    setBusy(null);
    if (error) return toast.error(rpcError(error.message));
    toast.success("Satın alındı! Aşağıdan ayarlayabilirsin.");
    refresh();
  };
  const claimedToday = wallet.data?.last_claim === todayTR();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
        <p className="text-sm text-muted-foreground">Xir Mağaza</p>
        <h1 className="mt-1 flex items-center gap-3 text-4xl font-extrabold">
          <Coins className="h-9 w-9 text-gold" />
          <span data-testid="store-balance">{isAdmin ? "Sınırsız" : wallet.data?.coins ?? 0}</span>
          <span className="text-lg font-semibold text-muted-foreground">Xir Coin</span>
        </h1>
        {isAdmin && <p data-testid="store-founder-note" className="mt-2 flex items-center gap-1 text-sm text-gold"><Crown className="h-4 w-4" /> Kurucu hesabı: her şey bedava.</p>}
        <p data-testid="store-daily-status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Gift className="h-4 w-4 text-primary" />
          {claimedToday ? `Bugünkü ${DAILY_REWARD} Xir Coin ödülünü aldın. Yarın tekrar gel!` : `Her gün siteye girdiğinde ${DAILY_REWARD} Xir Coin kazanırsın.`}
        </p>
        {notReady && <p data-testid="store-not-ready" className="mt-3 text-sm text-destructive">Xir Coin sistemi henüz etkinleştirilmedi. Veritabanı güncellemesi bekleniyor.</p>}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">VIP Özellikler</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {XIR_ITEMS.map((it) => {
            const owned = ownsItem(mine, it.id, isAdmin);
            return (
              <div key={it.id} data-testid={`store-item-${it.id}`} className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg font-bold">{it.name}</p>
                  <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-gold"><Coins className="h-4 w-4" />{isAdmin ? <s>{it.price}</s> : it.price}</span>
                </div>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{it.desc}</p>
                {owned ? (
                  <p data-testid={`store-owned-${it.id}`} className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary"><Check className="h-4 w-4" /> {isAdmin ? "Kurucu — açık" : "Sahipsin"}</p>
                ) : (
                  <Button data-testid={`store-buy-${it.id}`} variant="hero" className="mt-4" disabled={busy === it.id || notReady} onClick={() => buy(it.id)}>
                    {busy === it.id ? "Alınıyor..." : `${it.price} Xir Coin ile Al`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Customizer key={mine ? "c" : "n"} username={profile?.username} disabled={notReady} onSaved={refresh} />
    </div>
  );
}

const Picker = ({ label, value, onChange, testid }: { label: string; value: string; onChange: (v: string) => void; testid: string }) => (
  <label className="flex items-center gap-3 text-sm">
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
    {label} <span className="font-mono text-xs text-muted-foreground">{value}</span>
  </label>
);

function Customizer({ username, disabled, onSaved }: { username?: string; disabled: boolean; onSaved: () => void }) {
  const { userId, isAdmin } = useAuth();
  const c = useCosmetics(userId);
  const has = (i: XirItemId) => ownsItem(c, i, isAdmin);
  const [vip, setVip] = useState(c?.vip_badge ?? false);
  const [nameColor, setNameColor] = useState(c?.name_color ?? "");
  const [pt, setPt] = useState(c?.profile_theme ?? null);
  const [st, setSt] = useState(c?.site_theme ?? null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVip(c?.vip_badge ?? false); setNameColor(c?.name_color ?? ""); setPt(c?.profile_theme ?? null); setSt(c?.site_theme ?? null); }, [c]);

  if (!["vip_badge", "name_color", "profile_theme", "site_theme"].some((i) => has(i as XirItemId))) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("save_xir_cosmetics", {
      _vip_badge: vip, _name_color: nameColor || null, _profile_theme: pt, _site_theme: st,
    });
    setSaving(false);
    if (error) return toast.error(rpcError(error.message));
    toast.success("Ayarların kaydedildi");
    onSaved();
  };

  return (
    <section data-testid="store-customizer" className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Palette className="h-6 w-6 text-primary" /> Kişiselleştir</h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {has("vip_badge") && (
          <div className="space-y-2">
            <p className="font-semibold">VIP Rozet</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} data-testid="custom-vip-toggle" /> Rozetimi göster</label>
          </div>
        )}
        {has("name_color") && (
          <div className="space-y-2">
            <p className="font-semibold">Kullanıcı Adı Rengi</p>
            <Picker label="Renk" value={nameColor || "#e11d48"} onChange={setNameColor} testid="custom-name-color" />
            <p className="text-sm">Önizleme: <b style={{ color: nameColor || undefined }}>{username}</b> {vip && <span className="text-xs text-gold">VIP</span>}</p>
            {nameColor && <button className="text-xs text-muted-foreground underline" onClick={() => setNameColor("")}>Rengi kaldır</button>}
          </div>
        )}
        {has("profile_theme") && (
          <div className="space-y-2">
            <p className="font-semibold">Profil Teması</p>
            <Picker label="1. renk" value={pt?.from ?? "#e11d48"} onChange={(v) => setPt({ from: v, to: pt?.to ?? "#1e1b4b" })} testid="custom-profile-from" />
            <Picker label="2. renk" value={pt?.to ?? "#1e1b4b"} onChange={(v) => setPt({ from: pt?.from ?? "#e11d48", to: v })} testid="custom-profile-to" />
            <div className="h-16 rounded-lg" style={{ background: pt ? `linear-gradient(135deg, ${pt.from}, ${pt.to})` : "var(--secondary)" }} />
            {pt && <button className="text-xs text-muted-foreground underline" onClick={() => setPt(null)}>Varsayılana dön</button>}
          </div>
        )}
        {has("site_theme") && (
          <div className="space-y-2">
            <p className="font-semibold">Site Teması <span className="text-xs font-normal text-muted-foreground">(sadece sen görürsün)</span></p>
            <div className="flex gap-2 text-sm">
              <button data-testid="custom-site-single" onClick={() => setSt({ primary: st?.primary ?? "#e11d48", secondary: null })}
                className={`rounded-full px-3 py-1 ${st && !st.secondary ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Tek renk</button>
              <button data-testid="custom-site-dual" onClick={() => setSt({ primary: st?.primary ?? "#e11d48", secondary: st?.secondary ?? "#f59e0b" })}
                className={`rounded-full px-3 py-1 ${st?.secondary ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Çift renk</button>
            </div>
            {st && <Picker label="Ana renk" value={st.primary} onChange={(v) => setSt({ ...st, primary: v })} testid="custom-site-primary" />}
            {st?.secondary && <Picker label="İkinci renk" value={st.secondary} onChange={(v) => setSt({ ...st, secondary: v })} testid="custom-site-secondary" />}
            {st && <div className="h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${st.primary}, ${st.secondary || st.primary})` }} />}
            {st && <button className="text-xs text-muted-foreground underline" onClick={() => setSt(null)}>AnimeXir varsayılanına dön</button>}
          </div>
        )}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button data-testid="custom-save" variant="hero" disabled={saving || disabled} onClick={save}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
        <span className="text-sm text-muted-foreground">Görünüm: <UserName id={userId} name={username} /></span>
      </div>
    </section>
  );
}
