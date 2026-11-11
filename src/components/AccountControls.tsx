import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { deleteMyAccount } from "@/lib/account.functions";

export function AccountControls() {
  const { userId } = useAuth();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const freeze = async () => {
    if (!userId || !window.confirm("Hesabın dondurulsun mu? Tekrar giriş yaptığında otomatik açılır.")) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ frozen_at: new Date().toISOString() }).eq("id", userId);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Hesabın donduruldu.");
    await supabase.auth.signOut();
  };

  const remove = async () => {
    setBusy(true);
    try {
      await del();
      await supabase.auth.signOut();
      toast.success("Hesabın kalıcı olarak silindi.");
      window.location.assign("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-10 max-w-lg space-y-4 rounded-xl border border-destructive/40 p-4">
      <h3 className="font-semibold">Hesap ayarları</h3>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Dondurursan profilin başkalarına gizlenir. Tekrar giriş yapınca hesabın açılır.</p>
        <Button variant="outline" disabled={busy} onClick={freeze}>Hesabı dondur</Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Silme kalıcıdır, geri alınamaz. Onaylamak için <b>SİL</b> yaz.</p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SİL" />
        <Button variant="destructive" disabled={busy || confirm !== "SİL"} onClick={remove}>Hesabı kalıcı sil</Button>
      </div>
    </div>
  );
}
