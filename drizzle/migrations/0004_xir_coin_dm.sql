-- Xir Coin cüzdanı (yalnızca sunucu fonksiyonları değiştirebilir)
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  last_claim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet read own" ON public.user_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Satın alınan VIP özellikler ve seçilen renkler (herkes görebilir, yalnızca fonksiyonlarla değişir)
CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owned text[] NOT NULL DEFAULT '{}',
  vip_badge boolean NOT NULL DEFAULT false,
  name_color text,
  profile_theme jsonb,
  site_theme jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_cosmetics TO anon, authenticated;
GRANT ALL ON public.user_cosmetics TO service_role;
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics read" ON public.user_cosmetics FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.xir_item_price(_item text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _item
    WHEN 'vip_badge' THEN 200
    WHEN 'name_color' THEN 150
    WHEN 'profile_theme' THEN 300
    WHEN 'site_theme' THEN 250
    ELSE NULL END
$$;

-- Günlük ödül: Türkiye saatine göre günde bir kez 10 Xir Coin
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  _w public.user_wallets;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'giris gerekli'; END IF;
  INSERT INTO public.user_wallets (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_wallets SET coins = coins + 10, last_claim = _today
    WHERE user_id = _uid AND (last_claim IS NULL OR last_claim < _today)
    RETURNING * INTO _w;
  IF FOUND THEN RETURN json_build_object('claimed', true, 'coins', _w.coins); END IF;
  SELECT * INTO _w FROM public.user_wallets WHERE user_id = _uid;
  RETURN json_build_object('claimed', false, 'coins', _w.coins);
END $$;

-- Satın alma: yöneticiler (kurucu) ücret ödemez
CREATE OR REPLACE FUNCTION public.buy_xir_item(_item text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _price integer := public.xir_item_price(_item);
  _admin boolean;
  _coins integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'giris gerekli'; END IF;
  IF _price IS NULL THEN RAISE EXCEPTION 'bilinmeyen urun'; END IF;
  _admin := public.has_role(_uid, 'admin');
  INSERT INTO public.user_wallets (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_cosmetics (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.user_cosmetics WHERE user_id = _uid AND _item = ANY(owned)) THEN
    RAISE EXCEPTION 'zaten sahipsin';
  END IF;
  IF NOT _admin THEN
    UPDATE public.user_wallets SET coins = coins - _price WHERE user_id = _uid AND coins >= _price;
    IF NOT FOUND THEN RAISE EXCEPTION 'yetersiz Xir Coin'; END IF;
  END IF;
  UPDATE public.user_cosmetics SET owned = array_append(owned, _item),
    vip_badge = vip_badge OR _item = 'vip_badge', updated_at = now()
    WHERE user_id = _uid;
  SELECT coins INTO _coins FROM public.user_wallets WHERE user_id = _uid;
  RETURN json_build_object('coins', _coins);
END $$;

-- Renk ve tema ayarları: sadece sahip olunan (veya yönetici) özellikler kaydedilir
CREATE OR REPLACE FUNCTION public.save_xir_cosmetics(_vip_badge boolean, _name_color text, _profile_theme jsonb, _site_theme jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _admin boolean;
  _owned text[];
  _hex text := '^#[0-9a-fA-F]{6}$';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'giris gerekli'; END IF;
  _admin := public.has_role(_uid, 'admin');
  INSERT INTO public.user_cosmetics (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT owned INTO _owned FROM public.user_cosmetics WHERE user_id = _uid;
  IF _name_color IS NOT NULL AND _name_color !~ _hex THEN RAISE EXCEPTION 'gecersiz renk'; END IF;
  IF _profile_theme IS NOT NULL AND NOT ((_profile_theme->>'from') ~ _hex AND (_profile_theme->>'to') ~ _hex) THEN RAISE EXCEPTION 'gecersiz renk'; END IF;
  IF _site_theme IS NOT NULL AND NOT ((_site_theme->>'primary') ~ _hex AND coalesce(_site_theme->>'secondary', '#000000') ~ _hex) THEN RAISE EXCEPTION 'gecersiz renk'; END IF;
  UPDATE public.user_cosmetics SET
    vip_badge = CASE WHEN _admin OR 'vip_badge' = ANY(_owned) THEN coalesce(_vip_badge, false) ELSE false END,
    name_color = CASE WHEN _admin OR 'name_color' = ANY(_owned) THEN _name_color ELSE NULL END,
    profile_theme = CASE WHEN _admin OR 'profile_theme' = ANY(_owned) THEN _profile_theme ELSE NULL END,
    site_theme = CASE WHEN _admin OR 'site_theme' = ANY(_owned) THEN _site_theme ELSE NULL END,
    updated_at = now()
  WHERE user_id = _uid;
END $$;

REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buy_xir_item(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_xir_cosmetics(boolean, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_xir_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_xir_cosmetics(boolean, text, jsonb, jsonb) TO authenticated;

-- Özel mesajlar (sadece arkadaşlar arasında)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS direct_messages_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_idx ON public.direct_messages (recipient_id, read_at);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm read own" ON public.direct_messages FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "dm send to friends" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND read_at IS NULL AND EXISTS (
    SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND (
      (f.requester_id = sender_id AND f.addressee_id = recipient_id) OR
      (f.requester_id = recipient_id AND f.addressee_id = sender_id))
  )
);
CREATE POLICY "dm mark read" ON public.direct_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
