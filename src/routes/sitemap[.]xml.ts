import { createFileRoute } from "@tanstack/react-router";
import { restSelect } from "@/lib/rest";

const SITE = "https://animexir.lovable.app";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/topluluk", changefreq: "daily", priority: "0.7" },
  { path: "/takvim", changefreq: "daily", priority: "0.7" },
  { path: "/birlikte-izle", changefreq: "weekly", priority: "0.7" },
  { path: "/giris", changefreq: "monthly", priority: "0.3" },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// Supabase tek seferde en fazla 1000 satır döndürür; hepsini sayfa sayfa çekiyoruz.
async function fetchAll(table: "animes" | "episodes") {
  const rows: { id: string; created_at: string }[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const data = await restSelect<{ id: string; created_at: string }>(table, "select=id,created_at&order=created_at.desc", [from, from + size - 1]);
    rows.push(...data);
    if (data.length < size) break;
  }
  return rows;
}

function url(loc: string, opts: { lastmod?: string; changefreq: string; priority: string }) {
  return [
    "  <url>",
    `    <loc>${esc(loc)}</loc>`,
    opts.lastmod ? `    <lastmod>${opts.lastmod.slice(0, 10)}</lastmod>` : "",
    `    <changefreq>${opts.changefreq}</changefreq>`,
    `    <priority>${opts.priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const parts = STATIC_PAGES.map((p) => url(SITE + p.path, p));
        try {
          const [animes, episodes] = await Promise.all([fetchAll("animes"), fetchAll("episodes")]);
          for (const a of animes) parts.push(url(`${SITE}/anime/${a.id}`, { lastmod: a.created_at, changefreq: "weekly", priority: "0.9" }));
          for (const e of episodes) parts.push(url(`${SITE}/izle/${e.id}`, { lastmod: e.created_at, changefreq: "monthly", priority: "0.6" }));
        } catch (err) {
          // Veritabanına ulaşılamazsa en azından sabit sayfaları döndür.
          console.error("sitemap error", err);
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
