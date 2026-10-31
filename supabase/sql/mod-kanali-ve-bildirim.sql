-- Lovable → More → Database → Manage → SQL editor içine yapıştırıp Run'a bas.

-- Topluluk #mod-kanali: yalnızca moderatörler ve yönetici okuyup yazabilir. Tekrar çalıştırılabilir.

DROP POLICY IF EXISTS "community read" ON public.community_messages;
CREATE POLICY "community read" ON public.community_messages FOR SELECT
  USING (channel <> 'mod-kanali' OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "community insert" ON public.community_messages;
CREATE POLICY "community insert" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND public.can_chat(auth.uid())
    AND (channel <> 'mod-kanali' OR public.is_staff(auth.uid()))
    AND (body NOT ILIKE '/everyone%' OR public.has_role(auth.uid(), 'admin'))
  );

-- Uygulama kapalıyken bildirim (Web Push): abonelikler, sunucu anahtarları ve gönderim kaydı. Tekrar çalıştırılabilir.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push subs own read" ON public.push_subscriptions;
CREATE POLICY "push subs own read" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push subs own delete" ON public.push_subscriptions;
CREATE POLICY "push subs own delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Cihaz başka hesapla açılırsa abonelik yeni hesaba geçer
CREATE OR REPLACE FUNCTION public.save_push_subscription(_endpoint text, _p256dh text, _auth text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'yetki yok'; END IF;
  INSERT INTO public.push_subscriptions (endpoint, user_id, p256dh, auth) VALUES (_endpoint, auth.uid(), _p256dh, _auth)
  ON CONFLICT (endpoint) DO UPDATE SET user_id = auth.uid(), p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, created_at = now();
END $$;
REVOKE ALL ON FUNCTION public.save_push_subscription(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text) TO authenticated;

-- Sunucu (VAPID) anahtarları: yalnızca sunucu erişir, ilk istekte otomatik üretilir
CREATE TABLE IF NOT EXISTS public.push_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key text NOT NULL,
  private_key text NOT NULL
);
REVOKE ALL ON public.push_config FROM anon, authenticated;
GRANT ALL ON public.push_config TO service_role;
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

-- Her /everyone mesajı yalnızca bir kez gönderilir
CREATE TABLE IF NOT EXISTS public.everyone_pushes (
  message_id uuid PRIMARY KEY REFERENCES public.community_messages(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.everyone_pushes FROM anon, authenticated;
GRANT ALL ON public.everyone_pushes TO service_role;
ALTER TABLE public.everyone_pushes ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
