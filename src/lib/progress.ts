const key = (id: string) => `axr-pos-${id}`;

export function getProgress(id: string): { t: number; d: number } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const v = JSON.parse(localStorage.getItem(key(id)) ?? "null");
    return v && v.d > 0 ? v : null;
  } catch {
    return null;
  }
}

export function saveProgress(id: string, t: number, d: number) {
  if (d > 0) localStorage.setItem(key(id), JSON.stringify({ t, d }));
}
