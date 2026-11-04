// Tek büyük sitemap.xml'i parçalara böler ve sitemap.xml'i bu parçaları listeleyen ana dizine çevirir.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

if (!groups.sayfalar.some((u) => u.includes(`<loc>${SITE}/animeler</loc>`))) {
  groups.sayfalar.push(`  <url>\n    <loc>${SITE}/animeler</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
}

const urlset = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

const files: [string, string[]][] = [["sitemap-sayfalar.xml", groups.sayfalar], ["sitemap-animeler.xml", groups.animeler]];
for (let i = 0; i * CHUNK < groups.bolumler.length; i++) files.push([`sitemap-bolumler-${i + 1}.xml`, groups.bolumler.slice(i * CHUNK, (i + 1) * CHUNK)]);

const today = new Date().toISOString().slice(0, 10);
const entries: string[] = [];
for (const [name, urls] of files) {
  if (!urls.length) continue;
  writeFileSync(join(DIR, name), urlset(urls));
  entries.push(`  <sitemap>\n    <loc>${SITE}/${name}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`);
  console.log(`split-sitemap: ${name} -> ${urls.length} adres`);
}

writeFileSync(
  join(DIR, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>\n`,
);
