import { getProgress, saveProgress } from "@/lib/progress";

/** Direct .mp4/.webm/.m3u8 links use the native player; anything else (embed pages) uses an iframe. */
const DIRECT = /\.(mp4|webm|ogg|mov|m3u8)(\?|$)/i;

/** Tek sunucu: Vidnest. AniList kimliğiyle çalışır — bölüme elle video linki eklenmemişse bu devreye girer. */
const vidnestUrl = (anilistId: number, ep: number) => `https://vidnest.fun/anime/${anilistId}/${ep}/sub`;

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

/** Sandbox without allow-popups permanently blocks the ad tabs the embed server tries to open on clicks. */
const PLAYER_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-forms";

/** Vidnest player for AniList-based embeds (no manual link needed). Ads/popups are blocked by the sandbox. */
export function EmbedPlayer({ anilistId, episode, title }: { anilistId: number; episode: number; title: string }) {
  const src = vidnestUrl(anilistId, episode);
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-t-xl bg-black">
        <iframe
          key={`${anilistId}-${episode}`}
          src={src}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox={PLAYER_SANDBOX}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-b-xl border border-t-0 border-border bg-card p-3">
        <span className="text-sm font-semibold text-muted-foreground">Sunucu: Vidnest (HD)</span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-medium text-primary hover:underline"
        >
          Yeni sekmede aç ↗
        </a>
        <p className="w-full text-xs text-muted-foreground">
          Video yüklenmezse sayfayı yenile ya da yeni sekmede aç. "Bağlanmayı reddetti" görürsen internet sağlayıcın engelliyordur — DNS'i 1.1.1.1 yap ya da Cloudflare WARP kullan.
        </p>
      </div>
    </div>
  );
}
