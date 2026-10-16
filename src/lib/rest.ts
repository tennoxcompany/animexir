// Supabase REST (PostgREST) için hafif, sadece okuma yapan yardımcı.
// Sitemap ve SEO başlıkları sunucuda çalışırken supabase-js'in realtime/websocket
// katmanına ihtiyaç duymadan veri çekmek için kullanılır.

function env(name: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[`VITE_${name}`];
  if (v) return v;
  if (typeof process !== "undefined") return process.env?.[name];
  return undefined;
}

function baseUrl() {
  const publicUrl = (env("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  // Sunucuda, varsa aynı backend'in iç (runtime) adresini kullan — client.ts ile aynı mantık.
  if (typeof window === "undefined" && typeof process !== "undefined") {
    const serverUrl = process.env?.["SUPABASE_URL"]?.replace(/\/+$/, "");
    if (serverUrl && serverUrl !== publicUrl && process.env?.["SUPABASE_PUBLISHABLE_KEY"] === env("SUPABASE_PUBLISHABLE_KEY")) return serverUrl;
  }
  return publicUrl;
}

export async function restSelect<T>(table: string, query: string, range?: [number, number]): Promise<T[]> {
  const key = env("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const headers: Record<string, string> = { apikey: key, Accept: "application/json" };
  if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;
  if (range) headers["Range"] = `${range[0]}-${range[1]}`;
  const res = await fetch(`${baseUrl()}/rest/v1/${table}?${query}`, { headers });
  if (!res.ok) throw new Error(`REST ${table} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}
