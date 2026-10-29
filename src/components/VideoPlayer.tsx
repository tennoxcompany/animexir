import { useEffect, useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { getProgress, saveProgress } from "@/lib/progress";

/** Direct .mp4/.webm/.m3u8 links use the native player; anything else (embed pages) uses an iframe. */
const DIRECT = /\.(mp4|webm|ogg|mov|m3u8)(\?|$)/i;

type Server = { name: string; tag: string; url: (anilistId: number, ep: number) => string };

/** Embed servers keyed by AniList media id — used when the episode has no manual video link. */
export const EMBED_SERVERS: Server[] = [
  { name: "Sunucu 1 (Videasy)", tag: "Reklamsız / Önerilen", url: (id, ep) => `https://player.videasy.to/anime/${id}/${ep}` },
  { name: "Sunucu 2 (VidLink)", tag: "Temiz", url: (id, ep) => `https://vidlink.pro/anime/${id}/${ep}/sub` },
  { name: "Sunucu 3 (VidSrc)", tag: "Alternatif", url: (id, ep) => `https://vidsrc.sh/embed/anime/ani${id}/${ep}/sub` },
  { name: "Sunucu 4 (Vidnest)", tag: "HD", url: (id, ep) => `https://vidnest.fun/anime/${id}/${ep}/sub` },
  { name: "Sunucu 5 (Vidy)", tag: "Yedek", url: (id, ep) => `https://www.vidy.st/anime/${id}/${ep}?autoplay=true` },
];

export function VideoPlayer({ url, title, k }: { url: string; title: string; k: string }) {
  if (DIRECT.test(url)) {
    return (
      <video key={k} src={url} controls autoPlay className="h-full w-full" data-testid="episode-video"
        onLoadedMetadata={(e) => {
          const p = getProgress(k);
          if (p && p.t / p.d < 0.95) e.currentTarget.currentTime = p.t;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          const s = Math.floor(v.currentTime);
          if (s % 5 === 0 && v.dataset["saved"] !== String(s)) {
            v.dataset["saved"] = String(s);
            saveProgress(k, v.currentTime, v.duration);
          }
        }}
        onPause={(e) => saveProgress(k, e.currentTarget.currentTime, e.currentTarget.duration)}
        onEnded={(e) => saveProgress(k, e.currentTarget.duration, e.currentTarget.duration)}
      />
    );
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

/** Sandbox without allow-popups blocks the ad tabs embed servers open; some servers refuse to play inside it. */
const AD_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-forms";
const AD_KEY = "axr-adblock";

/** Player with server switcher for AniList-based embeds (no manual link needed). */
export function EmbedPlayer({ anilistId, episode, title }: { anilistId: number; episode: number; title: string }) {
  const [srv, setSrv] = useState(0);
  const [adBlock, setAdBlock] = useState(true);
  useEffect(() => {
    if (localStorage.getItem(AD_KEY) === "off") setAdBlock(false);
  }, []);
  const toggleAd = () => {
    const next = !adBlock;
    setAdBlock(next);
    localStorage.setItem(AD_KEY, next ? "on" : "off");
  };
  const s = EMBED_SERVERS[srv]!;
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-t-xl bg-black">
        <iframe
          key={`${srv}-${episode}-${adBlock ? "a" : "n"}`}
          src={s.url(anilistId, episode)}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          {...(adBlock ? { sandbox: AD_SANDBOX } : {})}
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
        <a
          href={s.url(anilistId, episode)}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-medium text-primary hover:underline"
        >
          Yeni sekmede aç ↗
        </a>
        <div className="flex w-full items-center gap-3 rounded-lg bg-secondary/60 p-2">
          <button
            onClick={toggleAd}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              adBlock ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Reklam engelleyici: {adBlock ? "Açık" : "Kapalı"}
          </button>
          <span className="text-xs text-muted-foreground">
            {adBlock
              ? "\"Disable sandbox\" hatası çıkarsa önce başka sunucu dene, olmazsa bunu kapat."
              : "Kapalıyken tuşlara basınca reklam sayfası açılabilir — geri tuşuyla dön."}
          </span>
        </div>
        <p className="w-full text-xs text-muted-foreground">
          "Bağlanmayı reddetti" / "IP adresine bağlanılamadı" görürsen başka sunucuya geç. Hepsinde oluyorsa internet sağlayıcın bu siteleri engelliyordur — DNS'i 1.1.1.1 yap ya da Cloudflare WARP kullan.
        </p>
      </div>
    </div>
  );
}
