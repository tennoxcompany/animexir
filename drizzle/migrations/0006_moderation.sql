-- Moderatörler (herkes görebilir: sohbette MOD etiketi için)
CREATE TABLE IF NOT EXISTS public.moderators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderators TO anon, authenticated;
GRANT ALL ON public.moderators TO service_role;
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moderators read" ON public.moderators;
CREATE POLICY "moderators read" ON public.moderators FOR SELECT USING (true);

-- Susturma ve yasaklar (yalnızca fonksiyonlarla değişir)
CREATE TABLE IF NOT EXISTS public.user_sanctions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  banned boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_sanctions TO authenticated;
GRANT ALL ON public.user_sanctions TO service_role;
ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.moderators WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.is_moderator(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_sanctions WHERE user_id = _user_id AND banned)
$$;

-- Yazabilir mi: yasaklı ya da susturulmuş değilse
CREATE OR REPLACE FUNCTION public.can_chat(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_sanctions
    WHERE user_id = _user_id AND (banned OR (muted_until IS NOT NULL AND muted_until > now()))
  )
$$;

DROP POLICY IF EXISTS "sanctions read own or staff" ON public.user_sanctions;
CREATE POLICY "sanctions read own or staff" ON public.user_sanctions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Yönetici herkesi, moderatör sadece normal üyeleri cezalandırabilir
CREATE OR REPLACE FUNCTION public.assert_can_sanction(_target uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RAISE EXCEPTION 'yetki yok'; END IF;
  IF _target = _uid THEN RAISE EXCEPTION 'kendine islem yapamazsin'; END IF;
  IF public.has_role(_target, 'admin') THEN RAISE EXCEPTION 'yoneticiye islem yapilamaz'; END IF;
  IF public.is_moderator(_target) AND NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'moderatore islem yapilamaz'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_moderator(_user_id uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'yetki yok'; END IF;
  IF _on THEN
    INSERT INTO public.moderators (user_id, granted_by) VALUES (_user_id, auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.moderators WHERE user_id = _user_id;
  END IF;
END $$;

-- _minutes NULL ise kalıcı susturma
CREATE OR REPLACE FUNCTION public.mute_user(_user_id uuid, _minutes integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _until timestamptz := CASE WHEN _minutes IS NULL THEN 'infinity'::timestamptz ELSE now() + make_interval(mins => _minutes) END;
BEGIN
  PERFORM public.assert_can_sanction(_user_id);
  IF _minutes IS NOT NULL AND _minutes <= 0 THEN RAISE EXCEPTION 'gecersiz sure'; END IF;
  INSERT INTO public.user_sanctions (user_id, muted_until, updated_by) VALUES (_user_id, _until, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET muted_until = _until, updated_by = auth.uid(), updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.unmute_user(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_can_sanction(_user_id);
  UPDATE public.user_sanctions SET muted_until = NULL, updated_by = auth.uid(), updated_at = now() WHERE user_id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.ban_user(_user_id uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_can_sanction(_user_id);
  INSERT INTO public.user_sanctions (user_id, banned, updated_by) VALUES (_user_id, _on, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET banned = _on, updated_by = auth.uid(), updated_at = now();
  IF _on THEN DELETE FROM public.moderators WHERE user_id = _user_id; END IF;
END $$;

REVOKE ALL ON FUNCTION public.assert_can_sanction(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_moderator(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mute_user(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unmute_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ban_user(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_moderator(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mute_user(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmute_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user(uuid, boolean) TO authenticated;

-- Sohbet/yorum yazma: susturulan ve yasaklı yazamaz
DROP POLICY IF EXISTS "room msgs insert" ON public.room_messages;
CREATE POLICY "room msgs insert" ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_chat(auth.uid()));
DROP POLICY IF EXISTS "community insert" ON public.community_messages;
CREATE POLICY "community insert" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_chat(auth.uid()));
DROP POLICY IF EXISTS "comments insert own" ON public.comments;
CREATE POLICY "comments insert own" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_chat(auth.uid()));

-- Mesaj silme: sahibi, moderatör veya yönetici
DROP POLICY IF EXISTS "room msgs delete" ON public.room_messages;
CREATE POLICY "room msgs delete" ON public.room_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "community delete" ON public.community_messages;
CREATE POLICY "community delete" ON public.community_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "comments delete own or admin" ON public.comments;
CREATE POLICY "comments delete own or admin" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Yasaklı hesap: özel mesaj, oda kurma ve profil düzenleme de kapalı (susturulan DM atabilir)
DROP POLICY IF EXISTS "dm send to friends" ON public.direct_messages;
CREATE POLICY "dm send to friends" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND read_at IS NULL AND NOT public.is_banned(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND (
      (f.requester_id = sender_id AND f.addressee_id = recipient_id) OR
      (f.requester_id = recipient_id AND f.addressee_id = sender_id))
  )
);
DROP POLICY IF EXISTS "rooms create" ON public.rooms;
CREATE POLICY "rooms create" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id AND NOT public.is_banned(auth.uid())) WITH CHECK (auth.uid() = id);
