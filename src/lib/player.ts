export function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|m3u8)(?:[?#]|$)/i.test(url);
}

export function isHlsVideo(url: string) {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

export function subtitleToVtt(text: string) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (clean.startsWith("WEBVTT")) return clean;
  return `WEBVTT\n\n${clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
}

export function playerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const value = Math.floor(seconds);
  return value >= 3600
    ? `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
    : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}