// Tek büyük sitemap.xml'i parçalara böler ve sitemap.xml'i bu parçaları listeleyen ana dizine çevirir.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { restSelect } from "@/lib/rest";
import { episodeVideoUrls, idFromParam, ogImageUrl, shortText } from "@/lib/seo";

const DIR = "dist/client";
const SITE = "https://animexir.duckdns.org";
const CHUNK = 5000;
const EXCLUDE = /^\/(giris|yonetim|profil|sifre-sifirla|mesajlar|magaza)(\/|$)/;

const src = readFileSync(join(DIR, "sitemap.xml"), "utf8");
const seen = new Set<string>();
const groups: Record<"sayfalar" | "animeler" | "bolumler", string[]> = { sayfalar: [], animeler: [], bolumler: [] };

for (const [block] of src.matchAll(/<url>[\s\S]*?<\/url>/g)) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
  if (!loc || !loc.startsWith(SITE) || seen.has(loc)) continue;
  const path = new URL(loc.replace(/&amp;/g, "&")).pathname;
  if (EXCLUDE.test(path)) continue;
  seen.add(loc);
  const key = path.startsWith("/izle/") ? "bolumler" : path.startsWith("/anime/") ? "animeler" : "sayfalar";
  groups[key].push(`  ${block.trim()}`);
}

type Ep = { id: string; number: number; title: string | null; created_at: string | null; video_url: string | null; animes: { id: string; title: string; description: string | null; cover_url: string | null; banner_url: string | null; has_dub: boolean | null; anilist_id: number | null } | null };

async function fetchEpisodes() {
  const rows: Ep[] = [];
  const cols = "id,number,title,created_at,video_url,animes(id,title,description,cover_url,banner_url,has_dub,anilist_id)";
  for (let from = 0; ; from += 1000) {
    const page = await restSelect<Ep>("episodes", `select=${cols}&order=created_at.desc`, [from, from + 999]);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function videoTag(ep: Ep) {
  const a = ep.animes;
  if (!a) return "";
  const v = episodeVideoUrls(ep);
  const thumb = existsSync(join(DIR, "og", `${a.id}.jpg`)) ? ogImageUrl(a.id) : a.banner_url || a.cover_url;
  if (!thumb || (!v.contentUrl && !v.embedUrl)) return "";
  const epName = ep.title && !/^\d+\. Bölüm$/.test(ep.title) ? ` — ${ep.title}` : "";
  const lang = a.has_dub ? "Türkçe Altyazılı & Dublajlı" : "Türkçe Altyazılı";
  const desc = shortText(`${a.title} ${ep.number}. bölüm ${lang} Full HD izle. ${a.description ?? ""}`, 2000);
  return [
    "    <video:video>",
    `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
    `      <video:title>${esc(`${a.title} ${ep.number}. Bölüm${epName}`.slice(0, 100))}</video:title>`,
    `      <video:description>${esc(desc)}</video:description>`,
    v.contentUrl ? `      <video:content_loc>${esc(v.contentUrl)}</video:content_loc>` : `      <video:player_loc>${esc(v.embedUrl!)}</video:player_loc>`,
    ep.created_at ? `      <video:publication_date>${new Date(ep.created_at).toISOString()}</video:publication_date>` : "",
    "      <video:family_friendly>yes</video:family_friendly>",
    "    </video:video>",
  ].filter(Boolean).join("\n");
}

let videos = 0;
try {
  const eps = new Map((await fetchEpisodes()).map((e) => [e.id, e]));
  groups.bolumler = groups.bolumler.map((block) => {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)![1]!;
    const ep = eps.get(idFromParam(new URL(loc).pathname.split("/").pop()!));
    const tag = ep ? videoTag(ep) : "";
    if (!tag) return block;
    videos++;
    return block.replace(/\s*<\/url>$/, `\n${tag}\n  </url>`);
  });
} catch (e) {
  console.error("split-sitemap: bölüm videoları alınamadı, video bilgisi eklenmeyecek", e);
}
console.log(`split-sitemap: ${videos} bölüme video bilgisi eklendi`);

if (!groups.sayfalar.some((u) => u.includes(`<loc>${SITE}/animeler</loc>`))) {
  groups.sayfalar.push(`  <url>\n    <loc>${SITE}/animeler</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
}

const VIDEO_NS = ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
const urlset = (urls: string[], video = false) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${video ? VIDEO_NS : ""}>\n${urls.join("\n")}\n</urlset>\n`;

const files: [string, string[]][] = [["sitemap-sayfalar.xml", groups.sayfalar], ["sitemap-animeler.xml", groups.animeler]];
for (let i = 0; i * CHUNK < groups.bolumler.length; i++) files.push([`sitemap-bolumler-${i + 1}.xml`, groups.bolumler.slice(i * CHUNK, (i + 1) * CHUNK)]);

const today = new Date().toISOString().slice(0, 10);
const entries: string[] = [];
for (const [name, urls] of files) {
  if (!urls.length) continue;
  writeFileSync(join(DIR, name), urlset(urls, name.startsWith("sitemap-bolumler")));
  entries.push(`  <sitemap>\n    <loc>${SITE}/${name}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`);
  console.log(`split-sitemap: ${name} -> ${urls.length} adres`);
}

writeFileSync(
  join(DIR, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>\n`,
);
