import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/geri-bildirim")({
  head: () => ({
    meta: [
      { title: "Memnuniyet Anketi — AnimeXir" },
      { name: "description", content: "AnimeXir'den ne kadar memnunsun? Puan ver, görüşünü yaz." },
      { property: "og:title", content: "Memnuniyet Anketi — AnimeXir" },
      { property: "og:description", content: "AnimeXir'i puanla, önerini bize ilet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { userId } = useAuth();
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!userId || !rating) return;
    const { error } = await supabase.from("feedback").insert({ user_id: userId, rating, message: msg.trim() || null });
    if (error) return void toast.error(error.message);
    setDone(true);
  };

  return (
    <div className="container mx-auto max-w-lg space-y-5 px-4 py-10">
      <h1 className="text-3xl font-bold">Memnuniyet Anketi</h1>
      {done ? <p className="text-muted-foreground">Teşekkürler! Görüşün bize ulaştı.</p> : !userId ? (
        <p className="text-muted-foreground">Görüş bildirmek için <Link to="/giris" className="underline">giriş yap</Link>.</p>
      ) : (
        <>
          <p className="text-muted-foreground">AnimeXir'den ne kadar memnunsun?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button key={n} variant={rating === n ? "hero" : "outline"} onClick={() => setRating(n)}>{n}</Button>
            ))}
          </div>
          <Textarea value={msg} maxLength={2000} onChange={(e) => setMsg(e.target.value)} placeholder="Neyi beğendin, neyi geliştirelim?" />
          <Button variant="hero" disabled={!rating} onClick={send}>Gönder</Button>
        </>
      )}
    </div>
  );
}
