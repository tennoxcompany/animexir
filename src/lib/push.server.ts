import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MOD_CHANNEL, everyoneText, isEveryone } from "@/lib/everyone";

const db = () => supabaseAdmin as unknown as SupabaseClient;
const ALLOWED = ["https://animexir.duckdns.org", "https://animexir.lovable.app"];

export function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0]!,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

export const json = (request: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...cors(request) } });

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function generateVapid() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey("raw", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { public_key: b64url(pub as ArrayBuffer), private_key: jwk.d! };
}

export async function getVapid() {
  const read = () => db().from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  let { data } = await read();
  if (!data) {
    await db().from("push_config").upsert({ id: 1, ...(await generateVapid()) }, { onConflict: "id", ignoreDuplicates: true });
    ({ data } = await read());
  }
  if (!data) throw new Error("VAPID anahtarı oluşturulamadı");
  return { publicKey: data.public_key as string, privateKey: data.private_key as string };
}

/** Yöneticinin /everyone mesajını tüm moderatör cihazlarına gönderir. */
export async function sendEveryone(messageId: string) {
  const { data: m } = await db().from("community_messages").select("id, channel, user_id, body, created_at").eq("id", messageId).maybeSingle();
  if (!m || m.channel !== MOD_CHANNEL || !isEveryone(m.body)) return { error: "Geçersiz mesaj", status: 400 };
  if (Date.now() - new Date(m.created_at).getTime() > 5 * 60_000) return { error: "Mesaj çok eski", status: 400 };
  const { data: role } = await db().from("user_roles").select("role").eq("user_id", m.user_id).eq("role", "admin").maybeSingle();
  if (!role) return { error: "Yetki yok", status: 403 };
  const { error: dup } = await db().from("everyone_pushes").insert({ message_id: m.id });
  if (dup) return { sent: 0, skipped: true };

  const [{ data: admins }, { data: mods }] = await Promise.all([
    db().from("user_roles").select("user_id").eq("role", "admin"),
    db().from("moderators").select("user_id"),
  ]);
  const staff = [...new Set([...(admins ?? []), ...(mods ?? [])].map((r) => r.user_id as string))].filter((id) => id !== m.user_id);
  if (!staff.length) return { sent: 0 };
  const { data: subs } = await db().from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", staff);
  const vapid = { subject: "https://animexir.duckdns.org", ...(await getVapid()) };
  const data = JSON.stringify({ title: "AnimeXir · Yönetici duyurusu", body: everyoneText(m.body), url: "/topluluk", tag: `everyone-${m.id}` });

  const results = await Promise.all((subs ?? []).map(async (s) => {
    const sub: PushSubscription = { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      const res = await fetch(s.endpoint, await buildPushPayload({ data, options: { ttl: 86400, urgency: "high" } }, sub, vapid));
      if (res.status === 404 || res.status === 410) await db().from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      return res.ok;
    } catch (e) {
      console.error("push error", e);
      return false;
    }
  }));
  return { sent: results.filter(Boolean).length };
}
