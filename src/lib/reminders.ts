import { useEffect, useMemo, useState } from "react";
import type { Airing } from "@/lib/schedule";

export type Reminder = { id: number; episode: number; airingAt: number; title: string; cover: string | null; siteId?: string; seen?: boolean; alerted?: boolean };
export type Follow = { mediaId: number; title: string; cover: string | null; siteId: string };

const KEY = "axr-reminders";
const EVT = "axr-reminders-change";

const FKEY = "axr-follows";

function load<T>(k: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; }
}
const read = () => load<Reminder>(KEY);
export const readFollows = () => load<Follow>(FKEY);
export function write(list: Reminder[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}
export { read as readReminders };

export function toggleFollow(f: Follow) {
  const list = readFollows();
  const on = !list.some((x) => x.mediaId === f.mediaId);
  localStorage.setItem(FKEY, JSON.stringify(on ? [...list, f] : list.filter((x) => x.mediaId !== f.mediaId)));
  window.dispatchEvent(new Event(EVT));
  return on;
}

type Next = { id: number; nextAiringEpisode: { id: number; episode: number; airingAt: number } | null };
export async function fetchNext(ids: number[]): Promise<Next[]> {
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: "query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids) { id nextAiringEpisode { id episode airingAt } } } }", variables: { ids } }),
  });
  if (!r.ok) throw new Error("AniList'e ulaşılamadı");
  return (await r.json()).data?.Page?.media ?? [];
}

export async function syncFollows() {
  const follows = readFollows();
  if (!follows.length) return;
  const next = await fetchNext(follows.map((f) => f.mediaId));
  const list = read();
  let changed = false;
  for (const m of next) {
    const n = m.nextAiringEpisode;
    const f = follows.find((x) => x.mediaId === m.id);
    if (!n || !f || list.some((r) => r.id === n.id)) continue;
    list.push({ id: n.id, episode: n.episode, airingAt: n.airingAt, title: f.title, cover: f.cover, siteId: f.siteId });
    changed = true;
  }
  if (changed) write(list);
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
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sync = () => { setList(read()); setTick((t) => t + 1); };
    sync();
    const t = setInterval(() => setNow(Date.now() / 1000), 30_000);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { clearInterval(t); window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const aired = list.filter((r) => r.airingAt <= now).sort((a, b) => b.airingAt - a.airingAt);
  const upcoming = list.filter((r) => r.airingAt > now).sort((a, b) => a.airingAt - b.airingAt);
  const follows = useMemo(() => new Set(readFollows().map((f) => f.mediaId)), [list, tick]);
  return { follows, ids: new Set(list.map((r) => r.id)), aired, upcoming, unseen: aired.filter((r) => !r.seen).length };
}
