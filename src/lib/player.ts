/** Accept a video URL or the src of an iframe, never executable embed markup. */
export function normalizeVideoSource(input: string) {
  const value = input.trim();
  if (!value) return "";
  let source = value;
  if (value.startsWith("<")) {
    if (!/^<iframe\b/i.test(value)) throw new Error("Yalnızca bölüm bağlantısı veya iframe gömme kodu ekleyebilirsin.");
    const opening = value.match(/^<iframe\b[^>]*>/i)?.[0];
    const match = opening?.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    if (!match?.[2]) throw new Error("Gömme kodunda geçerli bir src bağlantısı bulunamadı.");
    source = match[2].replace(/&amp;/gi, "&").trim();
  }
  let parsed: URL;
  try { parsed = new URL(source); } catch { throw new Error("Geçerli bir HTTPS bölüm bağlantısı ekle."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Bölüm bağlantısı HTTPS ile başlamalı ve kullanıcı bilgisi içermemeli.");
  }
  return parsed.href;
}

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