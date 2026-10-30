// GitHub Pages: site haritasındaki her adres için <yol>.html üretir; böylece sayfalar 404 yerine 200 döner.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const dir = "dist/client";
const shell = readFileSync(join(dir, "_shell.html"), "utf8")
  .replace(/<link rel="canonical"[^>]*>/g, "")
  .replace(/<meta property="og:url"[^>]*>/g, "")
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
const sitemap = readFileSync(join(dir, "sitemap.xml"), "utf8");

let count = 0;
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = decodeURIComponent(new URL(loc).pathname).replace(/^\/+|\/+$/g, "");
  if (!path || path.includes("..")) continue;
  const file = join(dir, `${path}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, shell);
  count++;
}
console.log(`static-pages: ${count} sayfa üretildi`);
