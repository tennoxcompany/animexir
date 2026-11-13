CREATE TABLE public.room_members (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room members own read" ON public.room_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "room members self join" ON public.room_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room AND user_id = _user)
      OR EXISTS (SELECT 1 FROM public.rooms WHERE id = _room AND host_id = _user)
$$;

DROP POLICY IF EXISTS "room msgs read signed in" ON public.room_messages;
CREATE POLICY "room msgs read members" ON public.room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()) OR public.is_staff(auth.uid()));