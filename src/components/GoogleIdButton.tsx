import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const KEY = "animexir-google-login";

const sha256Hex = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const redirectUri = () => `${window.location.origin}/giris`;

// Google'dan #id_token ile geri dönüldüyse Supabase oturumunu açar.
async function finishGoogleRedirect() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get("id_token");
  const failed = hash.get("error");
  if (!token && !failed) return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { nonce: string; state: string } | null;
  sessionStorage.removeItem(KEY);
  if (failed || !token || !saved || saved.state !== hash.get("state")) {
    toast.error("Google ile giriş başarısız");
    return;
  }
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token, nonce: saved.nonce });
  if (error) toast.error("Google ile giriş başarısız");
}

// Lovable dışındaki adreslerde (duckdns, uygulama/APK) Google girişi: tam sayfa yönlendirme, açılır pencere yok.
export function GoogleIdButton({ clientId }: { clientId: string }) {
  useEffect(() => { finishGoogleRedirect(); }, []);

  const start = async () => {
    const nonce = crypto.randomUUID();
    const state = crypto.randomUUID();
    sessionStorage.setItem(KEY, JSON.stringify({ nonce, state }));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "id_token",
      scope: "openid email profile",
      nonce: await sha256Hex(nonce),
      state,
      prompt: "select_account",
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  };

  return (
    <Button data-testid="google-id-button" variant="glass" className="mt-8 h-11 w-full" onClick={start}>
      Google ile devam et
    </Button>
  );
}
