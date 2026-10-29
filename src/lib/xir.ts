import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const DAILY_REWARD = 10;

export const XIR_ITEMS = [
  { id: "vip_badge", name: "VIP Rozet", price: 200, desc: "Adının yanında parlayan VIP rozeti; yorumlarda ve sohbette öne çık." },
  { id: "name_color", name: "Renkli Kullanıcı Adı", price: 150, desc: "Kullanıcı adın seçtiğin renkte görünür." },
  { id: "profile_theme", name: "Profil Teması", price: 300, desc: "Profil sayfanın arka planı iki renkli geçişle; herkes görür." },
  { id: "site_theme", name: "Site Teması", price: 250, desc: "AnimeXir'in renklerini sadece kendin için değiştir: tek veya çift renk." },
] as const;

export type XirItemId = (typeof XIR_ITEMS)[number]["id"];
export type ProfileTheme = { from: string; to: string };
export type SiteTheme = { primary: string; secondary?: string | null };
export type Cosmetics = {
  user_id: string;
  owned: string[];
  vip_badge: boolean;
  name_color: string | null;
  profile_theme: ProfileTheme | null;
  site_theme: SiteTheme | null;
};

export function useWallet() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["xir-wallet", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_wallets").select("coins, last_claim").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data ?? { coins: 0, last_claim: null };
    },
  });
}

/** Tüm kullanıcıların görünür VIP ayarları (küçük tablo, bir kez çekilip önbelleğe alınır). */
export function useAllCosmetics() {
  return useQuery({
    queryKey: ["xir-cosmetics"],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cosmetics").select("user_id, owned, vip_badge, name_color, profile_theme, site_theme");
      if (error) throw error;
      return new Map(((data ?? []) as unknown as Cosmetics[]).map((c) => [c.user_id, c]));
    },
  });
}

export function useCosmetics(userId: string | null | undefined) {
  const all = useAllCosmetics();
  return userId ? all.data?.get(userId) ?? null : null;
}

export const ownsItem = (c: Cosmetics | null, item: XirItemId, isAdmin: boolean) => isAdmin || !!c?.owned.includes(item);

export const rpcError = (m: string) =>
  m.includes("yetersiz") ? "Yetersiz Xir Coin" : m.includes("zaten") ? "Bu özelliğe zaten sahipsin" : m.includes("renk") ? "Geçersiz renk" : "İşlem yapılamadı";
