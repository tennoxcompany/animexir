import { useState } from "react";
import { Zap } from "lucide-react";

/** Direct .mp4/.webm/.m3u8 links use the native player; anything else (embed pages) uses an iframe. */
const DIRECT = /\.(mp4|webm|ogg|mov|m3u8)(\?|$)/i;

type Server = { name: string; tag: string; url: (anilistId: number, ep: number) => string };

/** Embed servers keyed by AniList media id — used when the episode has no manual video link. */
export const EMBED_SERVERS: Server[] = [
  { name: "Sunucu 1 (VidSrc)", tag: "HD / Hızlı", url: (id, ep) => `https://vidsrc-embed.ru/embed/anime/ani${id}/${ep}/sub` },
  { name: "Sunucu 2 (Dublaj)", tag: "Dub", url: (id, ep) => `https://vidsrc-embed.ru/embed/anime/ani${id}/${ep}/dub` },
  { name: "Sunucu 3 (VidSrc.me)", tag: "Yedek", url: (id, ep) => `https://vidsrc.me/embed/anime?ani=${id}&e=${ep}` },
];

export function VideoPlayer({ url, title, k }: { url: string; title: string; k: string }) {
  if (DIRECT.test(url)) {
    return <video key={k} src={url} controls autoPlay className="h-full w-full" />;
  }
  return (
    <iframe
      key={k}
      src={url}
      title={title}
      className="h-full w-full"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="no-referrer"
    />
  );
}

/** Player with server switcher for AniList-based embeds (no manual link needed). */
export function EmbedPlayer({ anilistId, episode, title }: { anilistId: number; episode: number; title: string }) {
  const [srv, setSrv] = useState(0);
  const s = EMBED_SERVERS[srv]!;
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-t-xl bg-black">
        <iframe
          key={`${srv}-${episode}`}
          src={s.url(anilistId, episode)}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-b-xl border border-t-0 border-border bg-card p-3">
        <span className="text-sm font-semibold text-muted-foreground">Sunucular:</span>
        {EMBED_SERVERS.map((sv, i) => (
          <button
            key={sv.name}
            onClick={() => setSrv(i)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              i === srv ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"
            }`}
          >
            <Zap className="h-3.5 w-3.5" /> {sv.name}
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${i === srv ? "bg-black/20" : "bg-background"}`}>{sv.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
