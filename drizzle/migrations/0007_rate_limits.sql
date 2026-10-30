-- Saldırı / spam koruması: kısa sürede çok fazla kayıt eklemeyi veritabanı seviyesinde engeller.
-- Yöneticiler ve moderatörler muaftır. Tekrar çalıştırılabilir.

CREATE INDEX IF NOT EXISTS room_messages_user_time_idx ON public.room_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_messages_user_time_idx ON public.community_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_user_time_idx ON public.comments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rooms_host_time_idx ON public.rooms (host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS friendships_requester_time_idx ON public.friendships (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS watch_history_user_time_idx ON public.watch_history (user_id, watched_at DESC);

-- Argümanlar: kullanıcı sütunu, zaman sütunu, izin verilen adet, saniye
CREATE OR REPLACE FUNCTION public.enforce_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_col text := TG_ARGV[0];
  _time_col text := TG_ARGV[1];
  _max integer := TG_ARGV[2]::integer;
  _secs integer := TG_ARGV[3]::integer;
  _uid uuid;
  _n integer;
BEGIN
  EXECUTE format('SELECT ($1).%I', _user_col) INTO _uid USING NEW;
  IF _uid IS NULL OR public.is_staff(_uid) THEN RETURN NEW; END IF;
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = $1 AND %I > now() - make_interval(secs => $2)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, _user_col, _time_col)
    INTO _n USING _uid, _secs;
  IF _n >= _max THEN
    RAISE EXCEPTION 'Çok hızlı gidiyorsun, biraz bekleyip tekrar dene.' USING ERRCODE = 'P0429';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_rate_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rl_room_messages_burst ON public.room_messages;
DROP TRIGGER IF EXISTS rl_room_messages_minute ON public.room_messages;
CREATE TRIGGER rl_room_messages_burst BEFORE INSERT ON public.room_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '5', '10');
CREATE TRIGGER rl_room_messages_minute BEFORE INSERT ON public.room_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '20', '60');

DROP TRIGGER IF EXISTS rl_community_burst ON public.community_messages;
DROP TRIGGER IF EXISTS rl_community_minute ON public.community_messages;
CREATE TRIGGER rl_community_burst BEFORE INSERT ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '5', '10');
CREATE TRIGGER rl_community_minute BEFORE INSERT ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '20', '60');

DROP TRIGGER IF EXISTS rl_comments_burst ON public.comments;
DROP TRIGGER IF EXISTS rl_comments_hour ON public.comments;
CREATE TRIGGER rl_comments_burst BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '3', '30');
CREATE TRIGGER rl_comments_hour BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '30', '3600');

DROP TRIGGER IF EXISTS rl_dm_burst ON public.direct_messages;
DROP TRIGGER IF EXISTS rl_dm_minute ON public.direct_messages;
CREATE TRIGGER rl_dm_burst BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('sender_id', 'created_at', '8', '10');
CREATE TRIGGER rl_dm_minute BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('sender_id', 'created_at', '30', '60');

DROP TRIGGER IF EXISTS rl_rooms ON public.rooms;
CREATE TRIGGER rl_rooms BEFORE INSERT ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('host_id', 'created_at', '5', '600');

DROP TRIGGER IF EXISTS rl_friendships ON public.friendships;
CREATE TRIGGER rl_friendships BEFORE INSERT ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('requester_id', 'created_at', '20', '600');

DROP TRIGGER IF EXISTS rl_watch_history ON public.watch_history;
CREATE TRIGGER rl_watch_history BEFORE INSERT ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'watched_at', '60', '60');
