export type FeaturedComment = {
  id: string;
  body: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
  episodes: { anime_id: string; number: number } | null;
};

export function selectFeaturedComments(comments: FeaturedComment[], featuredIds: string[]) {
  const ids = new Set(featuredIds);
  return comments.filter((comment) => comment.body.trim().length > 0 && comment.episodes != null && ids.has(comment.episodes.anime_id));
}