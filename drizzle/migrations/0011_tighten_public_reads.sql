DROP POLICY IF EXISTS "moderators read" ON public.moderators;
CREATE POLICY "moderators read own or staff" ON public.moderators FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
REVOKE SELECT ON public.moderators FROM anon;

DROP POLICY IF EXISTS "cosmetics read" ON public.user_cosmetics;
CREATE POLICY "cosmetics read own or admin" ON public.user_cosmetics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.user_cosmetics FROM anon;

DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read signed in" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.public_moderator_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id FROM public.moderators $$;
GRANT EXECUTE ON FUNCTION public.public_moderator_ids() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_cosmetics()
RETURNS TABLE(user_id uuid, owned text[], vip_badge boolean, name_color text, profile_theme jsonb, site_theme jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.user_id,
         CASE WHEN c.user_id = auth.uid() THEN c.owned ELSE '{}'::text[] END,
         c.vip_badge, c.name_color, c.profile_theme,
         CASE WHEN c.user_id = auth.uid() THEN c.site_theme ELSE NULL END
  FROM public.user_cosmetics c
$$;
GRANT EXECUTE ON FUNCTION public.public_cosmetics() TO anon, authenticated;