import { supabase } from "@/integrations/supabase/client";

export { MOD_CHANNEL, everyoneText, isEveryone } from "@/lib/everyone";

// Statik site (duckdns) sunucu içermez; bildirim API'si lovable.app sunucusunda çalışır.
const PUSH_API = import.meta.env["VITE_STATIC_SPA"] === "1" ? "https://animexir.lovable.app" : "";

const keyBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function swRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/pwabuilder-sw.js"));
  await navigator.serviceWorker.ready;
  return reg;
}

/** Cihazı uygulama kapalıyken de bildirim alacak şekilde kaydeder. */
export async function subscribePush() {
  const reg = await swRegistration();
  if (!reg || !("PushManager" in window) || Notification.permission !== "granted") return false;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = (await (await fetch(`${PUSH_API}/api/push/key`)).json()) as { publicKey: string };
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  }
  const j = sub.toJSON();
  const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, string>) => PromiseLike<{ error: unknown }>;
  const { error } = await rpc("save_push_subscription", { _endpoint: j.endpoint!, _p256dh: j.keys!["p256dh"]!, _auth: j.keys!["auth"]! });
  return !error;
}

export async function enableDeviceNotifications() {
  if (!("Notification" in window)) return "unsupported" as const;
  const p = await Notification.requestPermission();
  if (p === "granted") await subscribePush().catch(() => false);
  return p;
}

export async function pushEveryone(messageId: string) {
  const res = await fetch(`${PUSH_API}/api/push/everyone`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  return (await res.json()) as { sent?: number; error?: string };
}

/** Cihaza sistem bildirimi gösterir (PWA'da servis çalışanı üzerinden). */
export async function showDeviceNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body, icon: "/icon-192.png", badge: "/favicon-96.png", tag, data: { url: "/topluluk" } };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) return void (await reg.showNotification(title, opts));
  } catch {
    /* servis çalışanı yoksa normal bildirime düş */
  }
  const n = new Notification(title, opts);
  n.onclick = () => { window.focus(); window.location.assign("/topluluk"); };
}
