import { Ban, MicOff, Mic, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { MUTE_DURATIONS, useModActions } from "@/lib/moderation";

type Props = {
  userId: string;
  name?: string | null;
  message?: { table: "room_messages" | "community_messages" | "comments"; id: string; onDeleted?: () => void };
};

/** Sohbette bir mesajın yanında moderatör/yönetici işlemleri. */
export function ModMenu({ userId, name, message }: Props) {
  const { isStaff, userId: me } = useAuth();
  const act = useModActions();
  if (!isStaff) return null;
  const self = userId === me;

  const del = async () => {
    if (!message) return;
    const { error } = await supabase.from(message.table).delete().eq("id", message.id);
    if (error) return toast.error("Mesaj silinemedi");
    toast.success("Mesaj silindi");
    message.onDeleted?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="mod-menu-trigger" aria-label="Moderatör işlemleri"
        className="rounded p-1 text-muted-foreground opacity-60 transition-opacity hover:text-primary hover:opacity-100">
        <ShieldAlert className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">{name ?? "Kullanıcı"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {message && <DropdownMenuItem data-testid="mod-delete-message" onClick={del}><Trash2 /> Mesajı sil</DropdownMenuItem>}
        {!self && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid="mod-mute-trigger"><MicOff className="mr-2 h-4 w-4" /> Sustur</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {MUTE_DURATIONS.map((d) => (
                  <DropdownMenuItem key={d.label} data-testid={`mod-mute-${d.minutes ?? "perm"}`} onClick={() => act.mute(userId, d.minutes, d.label)}>{d.label}</DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem data-testid="mod-unmute" onClick={() => act.unmute(userId)}><Mic /> Susturmayı kaldır</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="mod-ban" className="text-destructive"
              onClick={() => confirm(`${name ?? "Bu kullanıcı"} yasaklansın mı? Siteyi kullanamayacak.`) && act.ban(userId, true)}>
              <Ban /> Hesabı yasakla
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
