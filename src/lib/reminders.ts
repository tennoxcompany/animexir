import { useEffect, useState } from "react";
import type { Airing } from "@/lib/schedule";

export type Reminder = { id: number; episode: number; airingAt: number; title: string; cover: string | null; siteId?: string; seen?: boolean };

const KEY = "axr-reminders";
const EVT = "axr-reminders-change";

function read(): Reminder[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(list: Reminder[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function toggleReminder(x: Airing, siteId?: string) {
  const list = read();
  if (list.some((r) => r.id === x.id)) return write(list.filter((r) => r.id !== x.id));
  write([...list, {
    id: x.id, episode: x.episode, airingAt: x.airingAt, siteId,
    title: x.media.title.english ?? x.media.title.romaji ?? "", cover: x.media.coverImage.large,
  }]);
}
export const removeReminder = (id: number) => write(read().filter((r) => r.id !== id));
export const markSeen = () => {
  const now = Date.now() / 1000;
  write(read().map((r) => (r.airingAt <= now ? { ...r, seen: true } : r)));
};

export function useReminders() {
  const [list, setList] = useState<Reminder[]>([]);
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    const t = setInterval(() => setNow(Date.now() / 1000), 30_000);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { clearInterval(t); window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const aired = list.filter((r) => r.airingAt <= now).sort((a, b) => b.airingAt - a.airingAt);
  const upcoming = list.filter((r) => r.airingAt > now).sort((a, b) => a.airingAt - b.airingAt);
  return { ids: new Set(list.map((r) => r.id)), aired, upcoming, unseen: aired.filter((r) => !r.seen).length };
}
