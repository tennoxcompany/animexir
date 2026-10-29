import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnimes } from "@/lib/data";

const KEY = "axr-anime-seen";
const EVT = "axr-anime-seen-change";

function seenAt() {
  const v = localStorage.getItem(KEY);
  if (v) return v;
  const now = new Date().toISOString();
  localStorage.setItem(KEY, now);
  return now;
}

export function markAnimesSeen() {
  localStorage.setItem(KEY, new Date().toISOString());
  window.dispatchEvent(new Event(EVT));
}

/** Kullanıcının son baktığı andan sonra siteye eklenen animeler. */
export function useNewAnimes() {
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes, refetchInterval: 5 * 60_000 });
  const [since, setSince] = useState<string | null>(null);
  useEffect(() => {
    const s = () => setSince(seenAt());
    s();
    window.addEventListener(EVT, s);
    return () => window.removeEventListener(EVT, s);
  }, []);
  const fresh = useMemo(
    () => (since ? (animes.data ?? []).filter((a) => Date.parse(a.created_at) > Date.parse(since)).slice(0, 10) : []),
    [animes.data, since],
  );
  return { fresh, all: animes.data };
}
