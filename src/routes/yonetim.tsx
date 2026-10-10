import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { fetchAnimes, GENRES } from "@/lib/data";
import { AniListImport } from "@/components/AniListImport";

export const Route = createFileRoute("/yonetim")({
  head: () => ({
    meta: [
      { title: "Yönetici Paneli — AnimeXir" },
      { name: "description", content: "AnimeXir anime ve bölüm yönetimi." },
      { property: "og:title", content: "Yönetici Paneli — AnimeXir" },
      { property: "og:description", content: "Anime ve bölüm yönetimi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const empty = { title: "", cover_url: "", banner_url: "", description: "", studio: "", status: "Devam Ediyor", score: "8.0", genres: [] as string[], has_dub: false, featured: false };

function Admin() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const animes = useQuery({ queryKey: ["animes"], queryFn: fetchAnimes });
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [ep, setEp] = useState({ number: "", title: "", video_url: "" });
  const [bulkId, setBulkId] = useState<string>("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const bulkEps = useQuery({
    queryKey: ["bulk-eps", bulkId], enabled: !!bulkId,
    queryFn: async () => (await supabase.from("episodes").select("*").eq("anime_id", bulkId).order("number")).data ?? [],
  });

  const eps = useQuery({
    queryKey: ["admin-eps", selected], enabled: !!selected,
    queryFn: async () => (await supabase.from("episodes").select("*").eq("anime_id", selected).order("number")).data ?? [],
  });

  if (loading) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  if (!isAdmin) return <div className="p-10"><p>Bu sayfa sadece yöneticiler içindir.</p><Link to="/" className="text-primary">Ana sayfa</Link></div>;

  const refresh = () => { qc.invalidateQueries({ queryKey: ["animes"] }); qc.invalidateQueries({ queryKey: ["latest"] }); };

  const saveAnime = async () => {
    if (!f.title.trim()) return toast.error("Başlık gerekli");
    const row = { ...f, score: Number(f.score) || 0, cover_url: f.cover_url || null, banner_url: f.banner_url || null };
    if (row.featured) await supabase.from("animes").update({ featured: false }).neq("id", editId ?? "00000000-0000-0000-0000-000000000000");
    const { error } = editId ? await supabase.from("animes").update(row).eq("id", editId) : await supabase.from("animes").insert(row);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Güncellendi" : "Anime eklendi");
    setF(empty); setEditId(null); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Bu anime ve tüm bölümleri silinsin mi?")) return;
    await supabase.from("animes").delete().eq("id", id); refresh();
  };
  const addEp = async () => {
    if (!selected || !ep.number) return toast.error("Anime ve bölüm numarası gerekli");
    const { error } = await supabase.from("episodes").upsert({ anime_id: selected, number: Number(ep.number), title: ep.title || null, video_url: ep.video_url || null }, { onConflict: "anime_id,number" });
    if (error) return toast.error(error.message);
    toast.success("Bölüm kaydedildi");
    setEp({ number: "", title: "", video_url: "" }); eps.refetch(); refresh();
  };

  const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <AniListImport onDone={refresh} />
      <h1 className="text-3xl font-bold">Yönetici Paneli</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">{editId ? "Animeyi düzenle" : "Yeni anime ekle"}</h2>
          <Input placeholder="Başlık" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input placeholder="Afiş görseli (https://...)" value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} />
          <Input placeholder="Geniş banner görseli (https://...)" value={f.banner_url} onChange={(e) => setF({ ...f, banner_url: e.target.value })} />
          <Textarea placeholder="Açıklama" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Stüdyo" value={f.studio} onChange={(e) => setF({ ...f, studio: e.target.value })} />
            <select className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option>Devam Ediyor</option><option>Tamamlandı</option><option>Yakında</option>
            </select>
            <Input type="number" step="0.1" min="0" max="10" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-1">
            {GENRES.map((g) => (
              <button key={g} type="button" onClick={() => setF({ ...f, genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g] })}
                className={`rounded-full px-3 py-1 text-xs ${f.genres.includes(g) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{g}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.has_dub} onChange={(e) => setF({ ...f, has_dub: e.target.checked })} /> Türkçe dublaj var</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Ana sayfada öne çıkar</label>
          <div className="flex gap-2">
            <Button variant="hero" onClick={saveAnime}>{editId ? "Güncelle" : "Ekle"}</Button>
            {editId && <Button variant="outline" onClick={() => { setEditId(null); setF(empty); }}>Vazgeç</Button>}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Bölüm ekle / güncelle</h2>
          <select className={sel} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Anime seç</option>
            {animes.data?.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Input type="number" placeholder="No" value={ep.number} onChange={(e) => setEp({ ...ep, number: e.target.value })} />
            <Input placeholder="Bölüm başlığı" value={ep.title} onChange={(e) => setEp({ ...ep, title: e.target.value })} />
          </div>
          <Input placeholder="Video bağlantısı (.mp4 veya gömme/embed linki)" value={ep.video_url} onChange={(e) => setEp({ ...ep, video_url: e.target.value })} />
          <Button variant="hero" onClick={addEp}>Kaydet</Button>
          <div className="max-h-64 space-y-1 overflow-y-auto pt-2">
            {eps.data?.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-sm">
                <button className="text-left" onClick={() => setEp({ number: String(e.number), title: e.title ?? "", video_url: e.video_url ?? "" })}>
                  {e.number}. {e.title} {e.video_url ? "" : <span className="text-muted-foreground">(video yok)</span>}
                </button>
                <button className="text-xs text-destructive" onClick={async () => { await supabase.from("episodes").delete().eq("id", e.id); eps.refetch(); }}>Sil</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Toplu video linki ekle</h2>
        <p className="mt-1 text-sm text-muted-foreground">Anime seç, tüm bölümler listelenir; her bölüme video linkini yapıştırıp kaydet. .mp4 linki doğrudan oynar, diğer linkler gömme oynatıcıda açılır.</p>
        <select className={`${sel} mt-3`} value={bulkId} onChange={(e) => setBulkId(e.target.value)}>
          <option value="">Anime seç</option>
          {animes.data?.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <div className="mt-4 space-y-2">
          {bulkEps.data?.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-sm font-bold">{e.number}.</span>
              <Input
                placeholder="Video linki"
                value={links[e.id] ?? e.video_url ?? ""}
                onChange={(ev) => setLinks({ ...links, [e.id]: ev.target.value })}
              />
              <Button size="sm" variant={e.video_url ? "glass" : "hero"} disabled={saving === e.id}
                onClick={async () => {
                  setSaving(e.id);
                  const url = (links[e.id] ?? e.video_url ?? "").trim();
                  const { error } = await supabase.from("episodes").update({ video_url: url || null }).eq("id", e.id);
                  setSaving(null);
                  if (error) return toast.error(error.message);
                  toast.success(`${e.number}. bölüm kaydedildi`);
                  bulkEps.refetch(); refresh();
                }}>
                {saving === e.id ? "..." : "Kaydet"}
              </Button>
            </div>
          ))}
          {bulkId && bulkEps.data?.length === 0 && <p className="text-sm text-muted-foreground">Bu animede bölüm yok.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Animeler ({animes.data?.length ?? 0})</h2>
        <div className="space-y-2">
          {animes.data?.map((a) => (
            <div key={a.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
              {a.cover_url && <img src={a.cover_url} alt="" className="h-16 w-11 rounded object-cover" />}
              <div className="flex-1">
                <p className="font-semibold">{a.title} {a.featured && <span className="text-xs text-gold">★ Öne çıkan</span>}</p>
                <p className="text-xs text-muted-foreground">{a.episode_count} bölüm · {a.genres.join(", ")}</p>
              </div>
              <Button size="sm" variant="glass" onClick={() => { setEditId(a.id); setF({ title: a.title, cover_url: a.cover_url ?? "", banner_url: a.banner_url ?? "", description: a.description ?? "", studio: a.studio ?? "", status: a.status ?? "Devam Ediyor", score: String(a.score ?? 0), genres: a.genres, has_dub: a.has_dub, featured: a.featured }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Düzenle</Button>
              <Button size="sm" variant="outline" onClick={() => del(a.id)}>Sil</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
