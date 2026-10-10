ALTER TABLE public.animes ADD COLUMN anilist_id integer;
COMMENT ON COLUMN public.animes.anilist_id IS 'AniList media ID; used to build embed player URLs for episodes without a manual video_url';