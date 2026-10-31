import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { chime } from "@/components/ReminderWatcher";
import { MOD_CHANNEL, everyoneText, isEveryone, showDeviceNotification } from "@/lib/modChannel";

/** Yöneticinin #mod-kanali'nda yazdığı /everyone mesajlarını tüm moderatörlere bildirir. */
export function ModAlertWatcher() {
  const { userId, isStaff } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!userId || !isStaff) return;
    const c = supabase.channel(`mod-alert-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `channel=eq.${MOD_CHANNEL}` }, (p) => {
        const m = p.new as { user_id: string; body: string };
        if (m.user_id === userId || !isEveryone(m.body)) return;
        const text = everyoneText(m.body) || "Mod kanalına bak!";
        chime();
        toast("@everyone — Yönetici duyurusu", {
          description: text,
          duration: 20000,
          action: { label: "Göster", onClick: () => navigate({ to: "/topluluk" }) },
        });
        showDeviceNotification("AnimeXir · Yönetici duyurusu", text);
      }).subscribe();
    return () => { supabase.removeChannel(c); };
  }, [userId, isStaff, navigate]);
  return null;
}
