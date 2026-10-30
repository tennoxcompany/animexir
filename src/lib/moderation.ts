import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Sanction = { user_id: string; muted_until: string | null; banned: boolean };

export const MUTE_DURATIONS = [
  { label: "10 dakika", minutes: 10 },
  { label: "1 saat", minutes: 60 },
  { label: "1 gün", minutes: 1440 },
  { label: "Kalıcı", minutes: null },
] as const;

export const isMuted = (s: Sanction | null | undefined) => !!s?.muted_until && new Date(s.muted_until).getTime() > Date.now();

export function muteText(s: Sanction) {
  const d = new Date(s.muted_until!);
  return d.getFullYear() > 9000 ? "süresiz" : `${d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} tarihine kadar`;
}

/** Moderatör kimlikleri (herkese açık, MOD etiketi için). */
export function useModerators() {
  return useQuery({
    queryKey: ["moderators"],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderators").select("user_id");
      if (error) throw error;
      return new Set((data ?? []).map((m) => m.user_id));
    },
  });
}

export const useIsModerator = (id: string | null | undefined) => !!id && !!useModerators().data?.has(id);

const ERRORS: [string, string][] = [
  ["yonetici", "Yöneticiye işlem yapılamaz"],
  ["moderatore", "Moderatörlere sadece yönetici işlem yapabilir"],
  ["kendine", "Kendine işlem yapamazsın"],
  ["yetki", "Bu işlem için yetkin yok"],
];
const modError = (m: string) => ERRORS.find(([k]) => m.includes(k))?.[1] ?? "İşlem yapılamadı";

/** Moderatör işlemleri; başarıda ilgili önbellekleri yeniler. */
export function useModActions() {
  const qc = useQueryClient();
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) return toast.error(modError(error.message)), false;
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["sanctions"] });
    qc.invalidateQueries({ queryKey: ["moderators"] });
    return true;
  };
  return {
    mute: (id: string, minutes: number | null, label: string) => run(supabase.rpc("mute_user", { _user_id: id, _minutes: minutes as number }), `Susturuldu (${label})`),
    unmute: (id: string) => run(supabase.rpc("unmute_user", { _user_id: id }), "Susturma kaldırıldı"),
    ban: (id: string, on: boolean) => run(supabase.rpc("ban_user", { _user_id: id, _on: on }), on ? "Hesap yasaklandı" : "Yasak kaldırıldı"),
    setMod: (id: string, on: boolean) => run(supabase.rpc("set_moderator", { _user_id: id, _on: on }), on ? "Moderatör yapıldı" : "Moderatörlük alındı"),
  };
}
