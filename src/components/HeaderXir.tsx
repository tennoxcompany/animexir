import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Coins, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/xir";

export function CoinChip() {
  const { isAdmin } = useAuth();
  const w = useWallet();
  return (
    <Link to="/magaza" data-testid="header-coin-chip" title="Xir Mağaza"
      className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold text-gold transition-colors hover:bg-accent">
      <Coins className="h-4 w-4" />
      <span data-testid="header-coin-balance">{isAdmin ? "∞" : w.data?.coins ?? 0}</span>
    </Link>
  );
}

export function useUnreadDms() {
  const { userId } = useAuth();
  const q = useQuery({
    queryKey: ["dm-unread", userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("direct_messages").select("sender_id").eq("recipient_id", userId!).is("read_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`dm-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);
  return q.data ?? [];
}

export function DmLink() {
  const unread = useUnreadDms().length;
  return (
    <Link to="/mesajlar" search={{ to: undefined }} aria-label="Mesajlar" data-testid="header-dm-link"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && <span data-testid="header-dm-unread" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
    </Link>
  );
}
