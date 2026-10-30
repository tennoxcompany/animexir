import type { SupabaseClient } from "@supabase/supabase-js";
import {
  trGenre,
  trStatus,
  trSeason,
  cleanDesc,
  episodeTitles,
  episodeCount,
  type AniResult,
} from "./anilist";

// Otomatik çekme: hem GitHub Actions zamanlayıcısı hem de yönetim panelindeki "Şimdi çalıştır" bunu kullanır.
export type AutoImportSettings = {
  id: number;
  enabled: boolean;
  phase: "season" | "all";
  page: number;
  last_run_at: string | null;
  last_added: number;
  last_updated: number;
  total_added: number;
  last_error: string | null;
};

type Media = AniResult & {
  relations?: { edges: { relationType: string; node: AniResult & { type: string } }[] };
};

const FIELDS = `id title { romaji english } coverImage { extraLarge large } bannerImage description(asHtml: false)
  genres averageScore episodes status season seasonYear format
  studios(isMain: true) { nodes { name } } streamingEpisodes { title } nextAiringEpisode { episode }`;

// AniList boş (null) sezon filtresini yanlış yorumladığı için iki ayrı sorgu kullanılır.
const query = (
  seasonal: boolean,
) => `query ($page: Int${seasonal ? ", $season: MediaSeason, $year: Int" : ""}) {
  Page(page: $page, perPage: 6) { pageInfo { hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC, ${seasonal ? "season: $season, seasonYear: $year, " : ""}isAdult: false, format_in: [TV, TV_SHORT, ONA, MOVIE]) {
      ${FIELDS}
      relations { edges { relationType node { type ${FIELDS} } } } } } }`;

const SEASON_FORMATS = ["TV", "TV_SHORT", "ONA"];
const SEASON_LINKS = ["SEQUEL", "PREQUEL"];

function currentSeason() {
  const d = new Date();
  const m = d.getUTCMonth();
  return {
    season: ["WINTER", "SPRING", "SUMMER", "FALL"][Math.floor(m / 3)],
    year: d.getUTCFullYear(),
  };
}

async function fetchPage(phase: AutoImportSettings["phase"], page: number) {
  const seasonal = phase === "season";
  const vars = seasonal ? { page, ...currentSeason() } : { page };
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: query(seasonal), variables: vars }),
  });
  if (r.status === 429) throw new Error("AniList istek sınırı doldu, sonraki turda devam edilecek");
  if (!r.ok) throw new Error(`AniList'e ulaşılamadı (${r.status})`);
  const p = (await r.json()).data?.Page;
  return { media: (p?.media ?? []) as Media[], hasNext: !!p?.pageInfo?.hasNextPage };
}

/** Animeyi ve sezonlarını listeye açar; aynı AniList kaydı bir kez yer alır. */
function withSeasons(list: Media[]): AniResult[] {
  const out = new Map<number, AniResult>();
  for (const m of list) {
    out.set(m.id, m);
    for (const e of m.relations?.edges ?? []) {
      const n = e.node;
      if (
        n.type === "ANIME" &&
        SEASON_LINKS.includes(e.relationType) &&
        SEASON_FORMATS.includes(n.format ?? "") &&
        !out.has(n.id)
      )
        out.set(n.id, n);
    }
  }
  return [...out.values()];
}

/** Elle eklemeyle aynı kurallar: varsa günceller, yoksa ekler; var olan bölümlere ve video linklerine dokunmaz. */
async function saveAnime(db: SupabaseClient, a: AniResult): Promise<"added" | "updated"> {
  const season = trSeason(a.season, a.seasonYear);
  const row = {
    title: a.title.english || a.title.romaji || "İsimsiz",
    anilist_id: a.id,
    cover_url: a.coverImage.extraLarge || a.coverImage.large,
    banner_url: a.bannerImage || a.coverImage.extraLarge,
    description: cleanDesc(a.description),
    studio: a.studios.nodes[0]?.name ?? null,
    status: trStatus(a.status) + (season ? ` · ${season}` : ""),
    score: a.averageScore ? a.averageScore / 10 : 0,
    genres: a.genres.map(trGenre),
  };
  const { data: existing } = await db
    .from("animes")
    .select("id")
    .eq("anilist_id", a.id)
    .limit(1)
    .maybeSingle();
  let animeId: string;
  if (existing) {
    animeId = existing.id;
    const { error } = await db.from("animes").update(row).eq("id", animeId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db.from("animes").insert(row).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Anime eklenemedi");
    animeId = data.id;
  }
  const count = episodeCount(a);
  const rows = episodeTitles(a, count).map((t, i) => ({
    anime_id: animeId,
    number: i + 1,
    title: t,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("episodes")
      .upsert(rows.slice(i, i + 500), { onConflict: "anime_id,number", ignoreDuplicates: true });
    if (error) throw new Error("Bölümler eklenemedi: " + error.message);
  }
  return existing ? "updated" : "added";
}

export async function getAutoImportSettings(db: SupabaseClient) {
  const { data, error } = await db
    .from("auto_import_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as AutoImportSettings | null;
}

/** Bir tur çalıştırır: sıradaki AniList sayfasını sezonlarıyla çeker ve imleci ilerletir. */
export async function runAutoImport(db: SupabaseClient, opts: { force?: boolean } = {}) {
  const s = await getAutoImportSettings(db);
  if (!s) throw new Error("auto_import_settings tablosu bulunamadı (migration uygulanmamış)");
  if (!s.enabled && !opts.force) return { skipped: true, added: 0, updated: 0 };

  let added = 0;
  let updated = 0;
  try {
    const { media, hasNext } = await fetchPage(s.phase, s.page);
    for (const a of withSeasons(media)) {
      if ((await saveAnime(db, a)) === "added") added++;
      else updated++;
    }
    const next = hasNext
      ? { phase: s.phase, page: s.page + 1 }
      : { phase: s.phase === "season" ? "all" : "season", page: 1 };
    await db
      .from("auto_import_settings")
      .update({
        ...next,
        last_run_at: new Date().toISOString(),
        last_added: added,
        last_updated: updated,
        total_added: s.total_added + added,
        last_error: null,
      })
      .eq("id", 1);
    return { skipped: false, added, updated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .from("auto_import_settings")
      .update({
        last_run_at: new Date().toISOString(),
        last_added: added,
        last_updated: updated,
        total_added: s.total_added + added,
        last_error: msg,
      })
      .eq("id", 1);
    throw e;
  }
}
