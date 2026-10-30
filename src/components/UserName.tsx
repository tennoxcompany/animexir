import { Crown, ShieldCheck } from "lucide-react";
import { useCosmetics } from "@/lib/xir";

export function UserName({ id, name, className = "" }: { id: string | null | undefined; name: string | null | undefined; className?: string }) {
  const c = useCosmetics(id);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span style={c?.name_color ? { color: c.name_color } : undefined}>{name ?? "?"}</span>
      {c?.vip_badge && (
        <span data-testid="vip-badge" className="inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-px text-[10px] font-bold text-gold">
          <Crown className="h-3 w-3" /> VIP
        </span>
      )}
    </span>
  );
}

export function UserBadge({ badge, className = "" }: { badge: string | null | undefined; className?: string }) {
  if (!badge) return null;
  if (!badge.includes("Kurucu")) return <span className={`text-gold ${className}`}>{badge}</span>;
  return (
    <span data-testid="founder-badge" className={`inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-px align-middle text-[10px] font-bold uppercase tracking-wide text-gold ${className}`}>
      <ShieldCheck className="h-3 w-3" /> Kurucu
    </span>
  );
}
