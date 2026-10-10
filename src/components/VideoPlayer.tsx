/** Direct .mp4/.webm/.m3u8 links use the native player; anything else (embed pages) uses an iframe. */
const DIRECT = /\.(mp4|webm|ogg|mov|m3u8)(\?|$)/i;

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
