CREATE TABLE IF NOT EXISTS public.auto_import_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  phase text NOT NULL DEFAULT 'season' CHECK (phase IN ('season', 'all')),
  page integer NOT NULL DEFAULT 1,
  last_run_at timestamptz,
  last_added integer NOT NULL DEFAULT 0,
  last_updated integer NOT NULL DEFAULT 0,
  total_added integer NOT NULL DEFAULT 0,
  last_error text
);

INSERT INTO public.auto_import_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.auto_import_settings TO authenticated;
GRANT ALL ON public.auto_import_settings TO service_role;

ALTER TABLE public.auto_import_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto import admin read" ON public.auto_import_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auto import admin update" ON public.auto_import_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
