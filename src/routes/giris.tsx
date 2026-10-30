import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIdButton } from "@/components/GoogleIdButton";
import { useAuth } from "@/lib/auth";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/giris")({
  head: () => pageHead("/giris", "Giriş Yap — AnimeXir", "AnimeXir hesabına giriş yap veya ücretsiz kayıt ol."),
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const { userId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (userId) navigate({ to: "/profil" }); }, [userId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-posta veya şifre hatalı");
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { username } },
      });
      if (error) toast.error(error.message);
      else toast.success("Kayıt tamam! E-postana gelen bağlantıyla hesabını doğrula.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google ile giriş başarısız");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Tekrar hoş geldin" : "AnimeXir'e katıl"}</h1>
      <p className="mt-1 text-muted-foreground">Listeni, yorumlarını ve izleme odalarını kaydet.</p>
      {import.meta.env["VITE_STATIC_SPA"] === "1" && import.meta.env["VITE_GOOGLE_CLIENT_ID"] ? (
        <>
          <GoogleIdButton clientId={import.meta.env["VITE_GOOGLE_CLIENT_ID"]} />
          <div className="my-6 text-center text-xs text-muted-foreground">veya</div>
        </>
      ) : import.meta.env["VITE_STATIC_SPA"] === "1" ? (
        <p data-testid="google-login-unavailable" className="mt-8 mb-6 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          Google ile giriş bu adreste kullanılamıyor; e-posta ve şifrenle giriş yap ya da <a className="text-primary hover:underline" href="https://animexir.lovable.app/giris">animexir.lovable.app</a> adresini kullan.
        </p>
      ) : (
        <>
          <Button variant="glass" className="mt-8 h-11" onClick={google}>Google ile devam et</Button>
          <div className="my-6 text-center text-xs text-muted-foreground">veya</div>
        </>
      )}
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && <Input required placeholder="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value)} />}
        <Input required type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input required type="password" minLength={6} placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "in" && (
          <div className="text-right">
            <Link to="/sifre-sifirla" search={{ email: email || undefined, recovery: undefined }} className="text-sm text-primary hover:underline" data-testid="forgot-password-link">
              Şifremi unuttum
            </Link>
          </div>
        )}
        <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>{mode === "in" ? "Giriş Yap" : "Kayıt Ol"}</Button>
      </form>
      <button className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
      </button>
    </div>
  );
}
