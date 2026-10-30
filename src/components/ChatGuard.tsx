import type { ReactNode } from "react";
import { MicOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isMuted, muteText } from "@/lib/moderation";

/** Susturulan kullanıcıya yazma alanı yerine bilgi gösterir. */
export function ChatGuard({ children }: { children: ReactNode }) {
  const { sanction } = useAuth();
  if (!sanction || !isMuted(sanction)) return <>{children}</>;
  return (
    <div data-testid="muted-notice" className="flex items-center gap-2 border-t border-border p-3 text-sm text-muted-foreground">
      <MicOff className="h-4 w-4 text-primary" /> Bir moderatör tarafından {muteText(sanction)} susturuldun.
    </div>
  );
}
