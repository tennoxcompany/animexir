-- Lovable → More → Database → Manage → SQL editor içine yapıştırıp Run'a bas.

-- Destek Merkezi: talepler ve talep süreci. Tekrar çalıştırılabilir.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('hesap','xir','oynatma','icerik','uygulama','telif','oneri','guvenlik','diger')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','approved','rejected','closed')),
  mod_note text CHECK (mod_note IS NULL OR char_length(mod_note) <= 2000),
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_user_time_idx ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_time_idx ON public.support_tickets (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_idx ON public.support_ticket_events (ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT ON public.support_ticket_events TO authenticated;
GRANT ALL ON public.support_tickets, public.support_ticket_events TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

-- Talebi sadece sahibi ve moderatör/yönetici görür
DROP POLICY IF EXISTS "tickets read own or staff" ON public.support_tickets;
CREATE POLICY "tickets read own or staff" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "tickets insert own" ON public.support_tickets;
CREATE POLICY "tickets insert own" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'open' AND mod_note IS NULL AND handled_by IS NULL AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS "ticket events read" ON public.support_ticket_events;
CREATE POLICY "ticket events read" ON public.support_ticket_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff(auth.uid()))));

-- Yeni talep süreç geçmişine "Açık" olarak düşer
CREATE OR REPLACE FUNCTION public.support_ticket_opened()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, status) VALUES (NEW.id, NEW.user_id, 'open');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.support_ticket_opened() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS support_ticket_opened ON public.support_tickets;
CREATE TRIGGER support_ticket_opened AFTER INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.support_ticket_opened();

-- Moderatör/yönetici: durumu değiştirir ve isteğe bağlı not bırakır
CREATE OR REPLACE FUNCTION public.update_support_ticket(_id uuid, _status text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'yetki yok'; END IF;
  IF _status NOT IN ('open','reviewing','approved','rejected','closed') THEN RAISE EXCEPTION 'gecersiz durum'; END IF;
  IF _n IS NOT NULL AND char_length(_n) > 2000 THEN RAISE EXCEPTION 'not cok uzun'; END IF;
  UPDATE public.support_tickets
    SET status = _status, mod_note = coalesce(_n, mod_note), handled_by = auth.uid(), updated_at = now()
    WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'talep bulunamadi'; END IF;
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, status, note) VALUES (_id, auth.uid(), _status, _n);
END $$;
REVOKE ALL ON FUNCTION public.update_support_ticket(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_support_ticket(uuid, text, text) TO authenticated;

-- Spam koruması: 10 dakikada 3, günde 10 talep
DROP TRIGGER IF EXISTS rl_support_burst ON public.support_tickets;
DROP TRIGGER IF EXISTS rl_support_day ON public.support_tickets;
CREATE TRIGGER rl_support_burst BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '3', '600');
CREATE TRIGGER rl_support_day BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', 'created_at', '10', '86400');

NOTIFY pgrst, 'reload schema';
