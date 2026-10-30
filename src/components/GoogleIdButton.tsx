import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type GoogleId = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};

const sha256Hex = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

function loadGsi() {
  return new Promise<GoogleId>((resolve, reject) => {
    const w = window as unknown as { google?: GoogleId };
    if (w.google?.accounts) return resolve(w.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("gsi")));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Lovable dışındaki adreslerde (GitHub Pages) Google girişi: Google kimlik kartı -> Supabase oturumu.
export function GoogleIdButton({ clientId }: { clientId: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nonce = crypto.randomUUID();
      const g = await loadGsi();
      if (cancelled || !el.current) return;
      g.accounts.id.initialize({
        client_id: clientId,
        nonce: await sha256Hex(nonce),
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: { credential: string }) => {
          const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
          if (error) toast.error("Google ile giriş başarısız");
        },
      });
      g.accounts.id.renderButton(el.current, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: el.current.offsetWidth || 360, locale: "tr" });
    })().catch(() => toast.error("Google girişi yüklenemedi"));
    return () => { cancelled = true; };
  }, [clientId]);

  return <div ref={el} data-testid="google-id-button" className="mt-8 flex h-11 w-full justify-center" />;
}
