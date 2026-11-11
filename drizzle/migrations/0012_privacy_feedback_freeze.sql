ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS frozen_at timestamptz;
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text CHECK (char_length(message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin read" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));