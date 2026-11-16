import { useEffect, useRef, useState } from "react";
import { Captions, Expand, LoaderCircle, Pause, Play, RotateCcw, RotateCw, Upload, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProgress, saveProgress } from "@/lib/progress";
import { isHlsVideo, playerTime, subtitleToVtt } from "@/lib/player";

export function NativePlayer({ url, title, k }: { url: string; title: string; k: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const subtitleUrl = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [captions, setCaptions] = useState(true);
  const [speed, setSpeed] = useState("1");

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    if (isHlsVideo(url) && !element.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          setError("Bu tarayıcı bu video akışını desteklemiyor.");
          return;
        }
        const hls = new Hls();
        destroy = () => hls.destroy();
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError("Video akışı açılamadı. Video bağlantısını veya internetini kontrol et.");
        });
        hls.loadSource(url);
        hls.attachMedia(element);
      }).catch(() => { if (!disposed) setError("Video akışı yüklenemedi."); });
    } else {
      element.src = url;
    }
    return () => {
      disposed = true;
      destroy?.();
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [url]);

  useEffect(() => () => {
    if (subtitleUrl.current) URL.revokeObjectURL(subtitleUrl.current);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    for (const track of Array.from(element.textTracks)) track.mode = captions ? "showing" : "disabled";
  }, [captions, subtitle]);

  const togglePlay = async () => {
    const element = video.current;
    if (!element) return;
    if (!element.paused) element.pause();
    else {
      try { await element.play(); setError(""); }
      catch { setError("Video başlatılamadı. Bağlantı erişime kapalı veya desteklenmeyen bir biçimde olabilir."); }
    }
  };
  const seek = (target: number) => {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration)) return;
    element.currentTime = Math.max(0, Math.min(element.duration, target));
    setTime(element.currentTime);
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (container.current?.requestFullscreen) await container.current.requestFullscreen();
      else (video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.();
    } catch { setError("Tam ekran bu tarayıcıda açılamadı."); }
  };

  return (
    <div ref={container} className="relative flex h-full w-full flex-col overflow-hidden bg-player text-player-foreground" data-testid="native-player">
      <div className="relative min-h-0 flex-1">
        <video ref={video} playsInline preload="metadata" aria-label={title} className="h-full w-full object-contain" data-testid="episode-video"
          onClick={togglePlay}
          onPlay={() => setPlaying(true)} onPause={(e) => { setPlaying(false); saveProgress(k, e.currentTarget.currentTime, e.currentTarget.duration); }}
          onWaiting={() => setBuffering(true)} onPlaying={() => { setBuffering(false); setError(""); }} onCanPlay={() => setBuffering(false)}
          onError={() => { setBuffering(false); setError("Video açılamadı. Doğrudan video bağlantısını kontrol et."); }}
          onLoadedMetadata={(e) => {
            const element = e.currentTarget;
            setDuration(Number.isFinite(element.duration) ? element.duration : 0);
            const progress = getProgress(k);
            if (progress && progress.t / progress.d < 0.95) element.currentTime = progress.t;
          }}
          onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
          onTimeUpdate={(e) => {
            const element = e.currentTarget;
            setTime(element.currentTime);
            const second = Math.floor(element.currentTime);
            if (second % 5 === 0 && element.dataset.saved !== String(second)) {
              element.dataset.saved = String(second);
              saveProgress(k, element.currentTime, element.duration);
            }
          }}
          onEnded={(e) => { setPlaying(false); saveProgress(k, e.currentTarget.duration, e.currentTarget.duration); }}>
          {subtitle && <track key={subtitle} kind="subtitles" src={subtitle} srcLang="tr" label="Türkçe" default onLoad={() => {
            if (video.current) for (const track of Array.from(video.current.textTracks)) track.mode = captions ? "showing" : "disabled";
          }} />}
        </video>
        {!playing && !error && !buffering && <Button size="icon" variant="default" title="Oynat" aria-label="Oynat" onClick={togglePlay} className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"><Play /></Button>}
        {buffering && !error && <LoaderCircle aria-label="Video yükleniyor" className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin motion-reduce:animate-none" />}
        {error && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-player/90 px-4 text-center text-xs sm:text-sm">{error}</div>}
      </div>
      <div className="shrink-0 border-t border-border bg-player-controls px-2 pb-2 pt-1 sm:px-3">
        <input type="range" aria-label="Video konumu" min={0} max={duration || 1} step="0.1" value={Math.min(time, duration || 1)} disabled={!duration} onChange={(e) => seek(Number(e.target.value))} className="h-4 w-full cursor-pointer accent-primary" />
        <div className="flex flex-wrap items-center gap-1">
          <Button size="icon" variant="ghost" title={playing ? "Duraklat" : "Oynat"} aria-label={playing ? "Duraklat" : "Oynat"} onClick={togglePlay}>{playing ? <Pause /> : <Play />}</Button>
          <Button size="icon" variant="ghost" title="10 saniye geri" aria-label="10 saniye geri" disabled={!duration} onClick={() => seek(time - 10)}><RotateCcw /></Button>
          <Button size="icon" variant="ghost" title="10 saniye ileri" aria-label="10 saniye ileri" disabled={!duration} onClick={() => seek(time + 10)}><RotateCw /></Button>
          <span className="text-[10px] tabular-nums sm:text-xs">{playerTime(time)} / {playerTime(duration)}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" title={muted ? "Sesi aç" : "Sesi kapat"} aria-label={muted ? "Sesi aç" : "Sesi kapat"} onClick={() => {
              if (!video.current) return;
              video.current.muted = !muted; setMuted(!muted);
            }}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</Button>
            <input type="range" aria-label="Ses seviyesi" min="0" max="1" step="0.05" value={muted ? 0 : volume} className="hidden w-16 accent-primary sm:block" onChange={(e) => {
              const value = Number(e.target.value);
              if (video.current) { video.current.volume = value; video.current.muted = false; }
              setVolume(value); setMuted(false);
            }} />
            <select aria-label="Oynatma hızı" value={speed} className="h-8 w-14 rounded border border-border bg-player-controls text-xs" onChange={(e) => {
              setSpeed(e.target.value); if (video.current) video.current.playbackRate = Number(e.target.value);
            }}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select>
            <Button size="icon" variant="ghost" title="Türkçe altyazı dosyası seç" aria-label="Türkçe altyazı dosyası seç" onClick={() => subtitleInput.current?.click()}><Upload /></Button>
            <Button size="icon" variant="ghost" title={captions ? "Altyazıyı kapat" : "Altyazıyı aç"} aria-label={captions ? "Altyazıyı kapat" : "Altyazıyı aç"} aria-pressed={Boolean(subtitle) && captions} disabled={!subtitle} className={subtitle && captions ? "text-primary" : ""} onClick={() => setCaptions(!captions)}><Captions /></Button>
            <Button size="icon" variant="ghost" title="Tam ekran" aria-label="Tam ekran" onClick={fullscreen}><Expand /></Button>
          </div>
        </div>
      </div>
      <input ref={subtitleInput} type="file" accept=".srt,.vtt" aria-label="Altyazı dosyası" className="hidden" onChange={async (e) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = "";
        if (!file) return;
        if (!/\.(srt|vtt)$/i.test(file.name) || file.size > 2 * 1024 * 1024) { setError("En fazla 2 MB boyutunda SRT veya VTT dosyası seç."); return; }
        try {
          const text = subtitleToVtt(await file.text());
          if (!text.includes("-->")) { setError("Altyazı dosyasında geçerli zaman kodları bulunamadı."); return; }
          if (subtitleUrl.current) URL.revokeObjectURL(subtitleUrl.current);
          const source = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
          subtitleUrl.current = source; setSubtitle(source); setCaptions(true); setError("");
        } catch { setError("Altyazı dosyası okunamadı."); }
      }} />
    </div>
  );
}