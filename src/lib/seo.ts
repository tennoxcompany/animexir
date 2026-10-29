import { restSelect } from "@/lib/rest";

export const SITE_URL = "https://animexir.lovable.app";
export const SITE_TITLE = "AnimeXir — Türkçe Altyazılı ve Dublajlı Anime İzle";
export const SITE_DESCRIPTION =
  "AnimeXir ile Türkçe altyazılı ve dublajlı animeleri keşfet. Güncel anime bölümlerini takip et, anime takvimini incele ve arkadaşlarınla birlikte izleme odalarında buluş.";
export const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/lovp_0xvya506cf846aj39x6k0j3hy6/ae2e2b39e6f745b12ffe74dc8000a2d1_1793299552193.png";

/** Kişisel / giriş gerektiren sayfalar arama sonuçlarında görünmesin. */
export const NOINDEX = { name: "robots", content: "noindex, follow" };

/** Herkese açık sabit sayfalar için başlık, açıklama, Open Graph ve canonical üretir. */
export function pageHead(path: string, title: string, description: string) {
  const url = SITE_URL + path;
  return { meta: seoMeta({ title, description, image: OG_IMAGE, url }), links: [{ rel: "canonical", href: url }] };
}

export type SeoAnime = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  genres: string[] | null;
  has_dub: boolean | null;
};

export type SeoEpisode = { id: string; number: number; title: string | null; anime_id: string; animes: SeoAnime | null };

const ANIME_COLS = "id,title,description,cover_url,banner_url,genres,has_dub";

/** Arama motorları için kısa, düz metin açıklama üretir. */
export function shortText(s: string | null | undefined, max = 155) {
  const t = (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export async function loadSeoAnime(id: string): Promise<SeoAnime | null> {
  try {
    const rows = await restSelect<SeoAnime>("animes", `select=${ANIME_COLS}&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function loadSeoEpisode(id: string): Promise<SeoEpisode | null> {
  try {
    const rows = await restSelect<SeoEpisode>(
      "episodes",
      `select=id,number,title,anime_id,animes(${ANIME_COLS})&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Ortak meta etiketlerini (başlık, açıklama, Open Graph, Twitter) oluşturur. */
export function seoMeta({ title, description, image, url, type = "website" }: { title: string; description: string; image?: string | null; url: string; type?: string }) {
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "AnimeXir" },
    { property: "og:locale", content: "tr_TR" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image }, { name: "twitter:image", content: image });
  }
  return meta;
}
