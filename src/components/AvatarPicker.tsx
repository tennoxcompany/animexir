import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Seçilen görseli ortadan kare kırpıp küçültür (profilde data URL olarak saklanır). */
function squareDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = (e) => { URL.revokeObjectURL(img.src); reject(e); };
    img.src = URL.createObjectURL(file);
  });
}

/** Galeriden tek dokunuşla profil fotoğrafı seçme; seçince hemen kaydedilir. */
export function AvatarPicker({ compact = false }: { compact?: boolean }) {
  const { userId, profile, refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const save = async (avatar_url: string | null, ok: string) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ avatar_url }).eq("id", userId!);
    setBusy(false);
    if (error) return toast.error("Fotoğraf kaydedilemedi");
    toast.success(ok);
    refreshProfile();
  };

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Lütfen bir fotoğraf seç");
    if (file.size > 15 * 1024 * 1024) return toast.error("Fotoğraf çok büyük (en fazla 15 MB)");
    const url = await squareDataUrl(file).catch(() => null);
    if (!url) return toast.error("Bu fotoğraf açılamadı, başka bir tane dene");
    save(url, "Profil fotoğrafın güncellendi");
  };

  const fileInput = (
    <input ref={input} data-testid="avatar-file-input" type="file" accept="image/*" className="hidden"
      onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
  );

  if (compact) {
    return (
      <button type="button" data-testid="avatar-quick-change" onClick={() => input.current?.click()} disabled={busy}
        className="group relative shrink-0 rounded-full" aria-label="Profil fotoğrafını değiştir">
        <Avatar url={profile?.avatar_url} name={profile?.username} size={96} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-7 w-7 text-white" />
        </span>
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
          <Camera className="h-4 w-4" />
        </span>
        {fileInput}
      </button>
    );
  }

  return (
    <div data-testid="avatar-picker" className="flex items-center gap-4 rounded-xl border border-border bg-background/40 p-4">
      <Avatar url={profile?.avatar_url} name={profile?.username} size={72} />
      <div className="flex flex-wrap gap-2">
        <Button data-testid="avatar-pick-gallery" variant="hero" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <ImagePlus className="h-4 w-4" /> {busy ? "Kaydediliyor..." : "Galeriden seç"}
        </Button>
        {profile?.avatar_url && (
          <Button data-testid="avatar-remove" variant="outline" size="sm" disabled={busy} onClick={() => save(null, "Profil fotoğrafı kaldırıldı")}>
            <Trash2 className="h-4 w-4" /> Kaldır
          </Button>
        )}
      </div>
      {fileInput}
    </div>
  );
}
