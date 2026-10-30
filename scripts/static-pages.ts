// GitHub Pages: site haritasındaki her adres için <yol>.html üretir (404 yerine 200).
// Anime ve bölüm sayfalarına kendi başlık/açıklama/görsel etiketleri HTML'e doğrudan yazılır,
// her anime için kapaktan 1200x630 paylaşım görseli (og/<id>.jpg) üretilir.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { restSelect } from "@/lib/rest";
import { animeHead, animeParam, episodeHead, episodeParam, ogImageUrl, type SeoAnime, type SeoEpisode } from "@/lib/seo";

const DIR = "dist/client";
const ASSETS = "scripts/og-assets";
const ANIME_COLS = "id,title,description,cover_url,banner_url,genres,has_dub";

type Head = { meta: Record<string, string>[]; links: Record<string, string>[]; scripts?: { type: string; children: string }[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");

function renderHead(h: Head) {
  const meta = h.meta.map((m) => (m["title"] ? `<title>${esc(m["title"])}</title>` : `<meta ${attrs(m)}/>`));
  const links = h.links.map((l) => `<link ${attrs(l)}/>`);
  const scripts = (h.scripts ?? []).map((s) => `<script type="${s.type}">${s.children.replace(/</g, "\\u003c")}</script>`);
  return [...meta, ...links, ...scripts].join("");
}

const base = readFileSync(join(DIR, "_shell.html"), "utf8")
  .replace(/<link rel="canonical"[^>]*>/g, "")
  .replace(/<meta property="og:url"[^>]*>/g, "")
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
// Sayfaya özel etiketler eklenecekse genel başlık/açıklama/görsel etiketleri çıkarılır.
const bare = base
  .replace(/<title>[\s\S]*?<\/title>/, "")
  .replace(/<meta (name="description"|property="og:(title|description|type|image|site_name|locale)"|name="twitter:(title|description|image)")[^>]*>/g, "");

function write(path: string, html: string) {
  const file = join(DIR, `${path}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

async function fetchAll<T>(table: string, query: string) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await restSelect<T>(table, `${query}&order=created_at.desc`, [from, from + 999]);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function fetchImage(url: string | null) {
  if (!url) return null;
  const res = await fetch(url).catch(() => null);
  return res?.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

const markup = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function makeOgImage(a: SeoAnime) {
  const [cover, banner] = await Promise.all([fetchImage(a.cover_url), fetchImage(a.banner_url)]);
  const bgSrc = banner ?? cover;
  if (!cover || !bgSrc) return false;
  const W = 1200, H = 630;
  const bg = await sharp(bgSrc).resize(W, H, { fit: "cover" }).blur(14).modulate({ brightness: 0.45 }).toBuffer();
  const poster = await sharp(cover).resize(330, 470, { fit: "cover" }).toBuffer();
  const lang = a.has_dub ? "Türkçe Altyazılı &amp; Dublajlı İzle" : "Türkçe Altyazılı İzle";
  const title = await sharp({
    text: {
      text: `<span foreground="#ffffff" font_weight="bold">${markup(a.title)}</span>`,
      fontfile: join(ASSETS, "Sora.ttf"), font: "Sora 52", width: 680, height: 260, rgba: true, wrap: "word",
    },
  }).png().toBuffer();
  const sub = await sharp({
    text: { text: `<span foreground="#e11d48" font_weight="bold">${lang}</span>`, fontfile: join(ASSETS, "Sora.ttf"), font: "Sora 28", width: 680, rgba: true },
  }).png().toBuffer();
  const titleH = (await sharp(title).metadata()).height ?? 0;
  const logo = await sharp(join(ASSETS, "wordmark.png")).resize(300).toBuffer();
  const top = Math.max(110, Math.round((H - titleH - 70) / 2) - 20);
  await sharp(bg)
    .composite([
      { input: poster, left: 70, top: 80 },
      { input: title, left: 450, top },
      { input: sub, left: 452, top: top + titleH + 24 },
      { input: logo, left: W - 360, top: H - 120, blend: "screen" },
    ])
    .jpeg({ quality: 82 })
    .toFile(join(DIR, "og", `${a.id}.jpg`));
  return true;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { for (let t; (t = queue.shift()); ) await fn(t); }));
}

const sitemap = readFileSync(join(DIR, "sitemap.xml"), "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(([, loc]) => decodeURIComponent(new URL(loc!).pathname).replace(/^\/+|\/+$/g, ""))
  .filter((p) => p && !p.includes(".."));

const custom = new Map<string, string>();
try {
  mkdirSync(join(DIR, "og"), { recursive: true });
  const animes = await fetchAll<SeoAnime>("animes", `select=${ANIME_COLS}`);
  const episodes = await fetchAll<SeoEpisode>("episodes", `select=id,number,title,anime_id,created_at,animes(${ANIME_COLS})`);
  const withOg = new Set<string>();
  await pool(animes, 8, async (a) => {
    if (await makeOgImage(a).catch((e) => (console.warn("og", a.title, e?.message), false))) withOg.add(a.id);
  });
  const img = (a: SeoAnime) => (withOg.has(a.id) ? ogImageUrl(a.id) : a.banner_url || a.cover_url);
  for (const a of animes) custom.set(`anime/${animeParam(a.id, a.title)}`, renderHead(animeHead(a, img(a))));
  for (const ep of episodes) {
    if (ep.animes) custom.set(`izle/${episodeParam(ep.id, ep.animes.title, ep.number)}`, renderHead(episodeHead({ ...ep, animes: ep.animes }, img(ep.animes))));
  }
  console.log(`static-pages: ${withOg.size}/${animes.length} paylaşım görseli`);
} catch (e) {
  console.error("static-pages: veritabanına ulaşılamadı, genel etiketler kullanılacak", e);
}

for (const p of paths) {
  const head = custom.get(p);
  write(p, head ? bare.replace("</head>", `${head}</head>`) : base);
}
console.log(`static-pages: ${paths.length} sayfa, ${custom.size} sayfaya özel etiket`);
