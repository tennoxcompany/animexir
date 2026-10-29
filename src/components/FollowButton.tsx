import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchNext, syncFollows, toggleFollow, useReminders } from "@/lib/reminders";
import type { Anime } from "@/lib/data";

export function FollowButton({ anime }: { anime: Anime }) {
  const { follows } = useReminders();
  if (!anime.anilist_id) return null;
  const on = follows.has(anime.anilist_id);

  const click = async () => {
    if (!on) {
      const [m] = await fetchNext([anime.anilist_id!]).catch(() => []);
      if (!m?.nextAiringEpisode) return toast.info("Bu animenin yakında çıkacak yeni bölümü yok");
    }
    const now = toggleFollow({ mediaId: anime.anilist_id!, title: anime.title, cover: anime.cover_url, siteId: anime.id });
    if (now) {
      await syncFollows().catch(() => {});
      toast.success("Takip ediyorsun! Her yeni bölüm çıkınca haber vereceğiz");
    } else toast.success("Takipten çıktın");
  };

  return (
    <Button variant={on ? "default" : "glass"} onClick={click} data-testid="follow-anime-button">
      {on ? <BellRing /> : <Bell />} {on ? "Takip Ediliyor" : "Takip Et"}
    </Button>
  );
}
