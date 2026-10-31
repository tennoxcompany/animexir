export const MOD_CHANNEL = "mod-kanali";

export const isEveryone = (body: string) => /^\/everyone\b/i.test(body.trim());

export const everyoneText = (body: string) => body.trim().replace(/^\/everyone\b/i, "").trim();

export async function enableDeviceNotifications() {
  if (!("Notification" in window)) return "unsupported" as const;
  return Notification.requestPermission();
}

/** Cihaza sistem bildirimi gösterir (PWA'da servis çalışanı üzerinden). */
export async function showDeviceNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body, icon: "/icon-192.png", badge: "/favicon-96.png", tag: `everyone-${Date.now()}`, data: { url: "/topluluk" } };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) return void (await reg.showNotification(title, opts));
  } catch {
    /* servis çalışanı yoksa normal bildirime düş */
  }
  const n = new Notification(title, opts);
  n.onclick = () => { window.focus(); window.location.assign("/topluluk"); };
}
