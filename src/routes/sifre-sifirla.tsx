import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/sifre-sifirla")({
  validateSearch: (s: Record<string, unknown>) => ({ email: typeof s["email"] === "string" ? s["email"] : undefined }),
  head: () => ({ meta: [{ title: "Şifremi Unuttum — AnimeXir" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

type Step = "email" | "code" | "password";

function ResetPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setStep("password"); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return toast.error("Geçerli bir e-posta gir");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: `${window.location.origin}/sifre-sifirla` });
    setBusy(false);
    if (error) return toast.error(/rate|seconds/i.test(error.message) ? "Çok sık denedin, biraz bekleyip tekrar dene" : error.message);
    setEmail(em);
    setStep("code");
    setCooldown(60);
    toast.success("Kod e-postana gönderildi");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6,10}$/.test(code)) return toast.error("E-postadaki kodu eksiksiz gir");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    setBusy(false);
    if (error) return toast.error("Kod hatalı ya da süresi dolmuş");
    setStep("password");
  };

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Şifre en az 6 karakter olmalı");
    if (password !== confirm) return toast.error("Şifreler eşleşmiyor");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Şifren güncellendi, giriş yapıldı");
    navigate({ to: "/profil" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20" data-testid="reset-page">
      <h1 className="text-3xl font-bold">Şifremi unuttum</h1>
      <p className="mt-1 text-muted-foreground">
        {step === "email" && "Hesabının e-postasını yaz, sana bir doğrulama kodu gönderelim."}
        {step === "code" && <><b className="text-foreground">{email}</b> adresine gelen kodu gir.</>}
        {step === "password" && "Yeni şifreni belirle."}
      </p>

      {step === "email" && (
        <form onSubmit={sendCode} className="mt-8 space-y-3">
          <Input required type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="reset-email-input" />
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy} data-testid="reset-send-code-button">
            {busy ? "Gönderiliyor..." : "Kod Gönder"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} className="mt-8 space-y-3">
          <Input required inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="Doğrulama kodu"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-12 text-center text-xl tracking-[0.5em]" data-testid="reset-code-input" />
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy} data-testid="reset-verify-button">
            {busy ? "Kontrol ediliyor..." : "Kodu Doğrula"}
          </Button>
          <div className="flex justify-between text-sm text-muted-foreground">
            <button type="button" onClick={() => setStep("email")} className="hover:text-foreground" data-testid="reset-change-email">E-postayı değiştir</button>
            <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendCode()} className="hover:text-foreground disabled:opacity-50" data-testid="reset-resend-button">
              {cooldown > 0 ? `Tekrar gönder (${cooldown})` : "Kodu tekrar gönder"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">E-posta gelmediyse spam klasörüne de bak.</p>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={update} className="mt-8 space-y-3">
          <Input required type="password" minLength={6} autoComplete="new-password" placeholder="Yeni şifre" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-new-password-input" />
          <Input required type="password" minLength={6} autoComplete="new-password" placeholder="Yeni şifre (tekrar)" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm-password-input" />
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy} data-testid="reset-update-button">
            {busy ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </Button>
        </form>
      )}

      <Link to="/giris" className="mt-6 text-sm text-muted-foreground hover:text-foreground" data-testid="reset-back-to-login">← Girişe dön</Link>
    </div>
  );
}
