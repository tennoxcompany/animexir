import { NativePlayer } from "@/components/NativePlayer";
import { isDirectVideo, normalizeVideoSource } from "@/lib/player";

/** Tek sunucu: Vidnest. AniList kimliğiyle çalışır — bölüme elle video linki eklenmemişse bu devreye girer. */
const vidnestUrl = (anilistId: number, ep: number) => `https://vidnest.fun/anime/${anilistId}/${ep}/sub`;

export function VideoPlayer({ url, title, k }: { url: string; title: string; k: string }) {
  let source: string;
  try { source = normalizeVideoSource(url); } catch {
    return <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">Bu bölümün video bağlantısı geçerli değil.</div>;
  }
  if (!source) return <div className="flex h-full items-center justify-center text-muted-foreground">Bu bölüm yakında eklenecek.</div>;
  if (isDirectVideo(source)) return <NativePlayer key={`${k}-${source}`} url={source} title={title} k={k} />;
  return (
    <iframe
      key={`${k}-${source}`}
      src={source}
      title={title}
      className="h-full w-full"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="no-referrer"
    />
  );
}

/** Vidnest player for AniList-based embeds. No sandbox: Vidnest refuses to play ("disable sandbox") when sandboxed. */
export function EmbedPlayer({ anilistId, episode, title }: { anilistId: number; episode: number; title: string }) {
  const src = vidnestUrl(anilistId, episode);
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-t-xl bg-player">
        <iframe
          key={`${anilistId}-${episode}`}
          src={src}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
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
          Reklam sekmesi açılırsa kapatıp geri dön, video devam eder. Video yüklenmezse sayfayı yenile ya da yeni sekmede aç. "Bağlanmayı reddetti" görürsen internet sağlayıcın engelliyordur — DNS'i 1.1.1.1 yap ya da Cloudflare WARP kullan.
        </p>
      </div>
    </div>
  );
}
