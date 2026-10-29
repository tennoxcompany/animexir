import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DAILY_REWARD, useCosmetics } from "@/lib/xir";

const todayTR = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

/** Giriş yapan kullanıcıya günde bir kez Xir Coin verir. */
export function DailyReward() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const key = `xir-daily-${userId}-${todayTR()}`;
    if (localStorage.getItem(key)) return;
    supabase.rpc("claim_daily_reward").then(({ data, error }) => {
      if (error) return;
      localStorage.setItem(key, "1");
      const r = data as { claimed: boolean; coins: number } | null;
      if (r?.claimed) {
        toast.success(`Günlük ödül: +${DAILY_REWARD} Xir Coin`, { description: `Bakiyen: ${r.coins} Xir Coin`, icon: <Coins className="h-4 w-4 text-gold" /> });
      }
      qc.invalidateQueries({ queryKey: ["xir-wallet", userId] });
    });
  }, [userId, qc]);
  return null;
}

const VARS = ["--primary", "--ring", "--primary-glow"];

/** Kullanıcının satın aldığı kişisel site temasını sadece kendi ekranına uygular. */
export function SiteThemeApplier() {
  const { userId } = useAuth();
  const theme = useCosmetics(userId)?.site_theme;
  useEffect(() => {
    const root = document.documentElement.style;
    if (!theme?.primary) return VARS.forEach((v) => root.removeProperty(v));
    root.setProperty("--primary", theme.primary);
    root.setProperty("--ring", theme.primary);
    root.setProperty("--primary-glow", theme.secondary || theme.primary);
    return () => VARS.forEach((v) => root.removeProperty(v));
  }, [theme?.primary, theme?.secondary]);
  return null;
}
