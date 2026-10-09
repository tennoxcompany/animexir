import { supabase } from "@/integrations/supabase/client";

export type Anime = {
  id: string; title: string; cover_url: string | null; banner_url: string | null;
  description: string | null; studio: string | null; status: string | null;
  score: number | null; genres: string[]; has_dub: boolean; featured: boolean; created_at: string;
};
export type Episode = { id: string; anime_id: string; number: number; title: string | null; video_url: string | null; created_at: string };

export const GENRES = ["Aksiyon", "Macera", "Shounen", "Fantezi", "Doğaüstü", "Gizem", "Dram", "Komedi", "Bilim Kurgu", "Romantik"];

export async function fetchAnimes() {
  const { data, error } = await supabase.from("animes").select("*, episodes(count)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a: any) => ({ ...a, episode_count: a.episodes?.[0]?.count ?? 0 })) as (Anime & { episode_count: number })[];
}

export async function fetchLatestEpisodes() {
  const { data, error } = await supabase.from("episodes").select("*, animes(title, cover_url)").not("video_url", "is", null).order("created_at", { ascending: false }).limit(8);
  if (error) throw error;
  return data as (Episode & { animes: { title: string; cover_url: string | null } | null })[];
}

export function roomCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

export function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "şimdi";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return `${Math.floor(s / 86400)} gün önce`;
}
