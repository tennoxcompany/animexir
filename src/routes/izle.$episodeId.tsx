import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Header";
import { UserBadge, UserName } from "@/components/UserName";
import { ModMenu } from "@/components/ModMenu";
import { ChatGuard } from "@/components/ChatGuard";
import { VideoPlayer, EmbedPlayer } from "@/components/VideoPlayer";
import { useAuth } from "@/lib/auth";
import { roomCode, timeAgo, type Anime, type Episode } from "@/lib/data";
import { animeParam, episodeHead, episodeParam, idFromParam, NOINDEX, loadSeoEpisode, seoMeta, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/izle/$episodeId")({
  loader: async ({ params }) => {
    const seo = await loadSeoEpisode(idFromParam(params.episodeId));
    const canon = seo?.animes && episodeParam(seo.id, seo.animes.title, seo.number);
    if (canon && params.episodeId !== canon) throw redirect({ to: "/izle/$episodeId", params: { episodeId: canon }, statusCode: 301 });
    return { seo };
  },
  head: ({ loaderData, params }) => {
    const ep = loaderData?.seo;
    const url = `${SITE_URL}/izle/${ep?.animes ? episodeParam(ep.id, ep.animes.title, ep.number) : params.episodeId}`;
    if (!ep?.animes) {
      return {
        meta: [...seoMeta({ title: "Bölüm İzle — AnimeXir", description: "Full HD anime bölümünü izle, yorum yap ve arkadaşlarınla birlikte izle.", url }), NOINDEX],
        links: [{ rel: "canonical", href: url }],
      };
    }
    return episodeHead({ ...ep, animes: ep.animes });
  },
  component: WatchPage,
});

function WatchPage() {
  const episodeId = idFromParam(Route.useParams().episodeId);
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [body, setBody] = useState("");

  const { data } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: async () => {
      const { data: ep } = await supabase.from("episodes").select("*, animes(*)").eq("id", episodeId).maybeSingle();
      if (!ep) return null;
      const { data: eps } = await supabase.from("episodes").select("*").eq("anime_id", ep.anime_id).order("number");
      return { ep: ep as Episode & { animes: Anime }, eps: (eps ?? []) as Episode[] };
    },
  });
  const comments = useQuery({
    queryKey: ["comments", episodeId],
    queryFn: async () => (await supabase.from("comments").select("*, profiles(username, avatar_url, badge)").eq("episode_id", episodeId).order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (userId && data?.ep) supabase.from("watch_history").insert({ user_id: userId, episode_id: episodeId }).then();
  }, [userId, episodeId, data?.ep]);

  if (!data) return <p className="p-10 text-muted-foreground">Yükleniyor...</p>;
  const { ep, eps } = data;
  const idx = eps.findIndex((e) => e.id === ep.id);
  const prev = eps[idx - 1], next = eps[idx + 1];

  const send = async () => {
    if (!userId) return toast.error("Yorum için giriş yap");
    if (!body.trim()) return;
    const { error } = await supabase.from("comments").insert({ episode_id: episodeId, user_id: userId, body: body.trim() });
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["comments", episodeId] });
  };
  const party = async () => {
    if (!userId) return toast.error("Oda kurmak için giriş yap");
    const code = roomCode();
    const { error } = await supabase.from("rooms").insert({ code, episode_id: episodeId, host_id: userId, title: `${ep.animes.title} — ${ep.number}. Bölüm` });
    if (error) return toast.error(error.message);
    navigate({ to: "/oda/$code", params: { code } });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          <Link to="/anime/$id" params={{ id: animeParam(ep.anime_id, ep.animes.title) }} className="hover:text-primary">{ep.animes.title}</Link> › {ep.number}. Bölüm
        </p>
        {ep.video_url ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-card">
            <VideoPlayer k={ep.id} url={ep.video_url} title={`${ep.animes.title} ${ep.number}. Bölüm`} />
          </div>
        ) : ep.animes.anilist_id ? (
          <EmbedPlayer anilistId={ep.animes.anilist_id} episode={ep.number} title={`${ep.animes.title} ${ep.number}. Bölüm`} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-card text-muted-foreground">Bu bölüm yakında eklenecek.</div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{ep.animes.title}</h1>
            <p className="text-muted-foreground">{ep.number}. Bölüm{ep.title ? `: ${ep.title}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {prev && <Button variant="glass" asChild><Link to="/izle/$episodeId" params={{ episodeId: episodeParam(prev.id, ep.animes.title, prev.number) }}><ChevronLeft /> Önceki</Link></Button>}
            {next && <Button variant="glass" asChild><Link to="/izle/$episodeId" params={{ episodeId: episodeParam(next.id, ep.animes.title, next.number) }}>Sonraki <ChevronRight /></Link></Button>}
            <Button variant="hero" onClick={party}><Users /> Birlikte İzle</Button>
            <Button variant="glass" onClick={() => { navigator.clipboard.writeText(location.href); toast.success("Bağlantı kopyalandı"); }}><Share2 /></Button>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Yorumlar ({comments.data?.length ?? 0})</h2>
          <ChatGuard>
          <div className="flex gap-2">
            <Textarea data-testid="comment-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder={userId ? "Spoiler vermeden yorumunu yaz..." : "Yorum yapmak için giriş yap"} />
            <Button data-testid="comment-send" variant="hero" onClick={send} className="self-end">Gönder</Button>
          </div>
          </ChatGuard>
          <div className="mt-6 space-y-4">
            {comments.data?.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <Avatar url={c.profiles?.avatar_url} name={c.profiles?.username} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><b><UserName id={c.user_id} name={c.profiles?.username} /></b> <UserBadge badge={c.profiles?.badge} className="text-xs" /> <span className="text-xs text-muted-foreground">· {timeAgo(c.created_at)}</span></p>
                  <p className="text-sm text-muted-foreground">{c.body}</p>
                </div>
                <ModMenu userId={c.user_id} name={c.profiles?.username} message={{ table: "comments", id: c.id, onDeleted: () => qc.invalidateQueries({ queryKey: ["comments", episodeId] }) }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4 lg:max-h-[80vh] lg:overflow-y-auto">
        <h3 className="mb-3 font-bold">Bölümler</h3>
        <div className="space-y-1">
          {eps.map((e) => (
            <Link key={e.id} to="/izle/$episodeId" params={{ episodeId: episodeParam(e.id, ep.animes.title, e.number) }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${e.id === ep.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <span className="w-6 font-bold">{e.number}</span>
              <span className="truncate">{e.title ?? `${e.number}. Bölüm`}</span>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
