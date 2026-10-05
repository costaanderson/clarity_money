
ALTER TYPE public.client_source ADD VALUE IF NOT EXISTS 'google_ads';

CREATE TABLE public.client_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  diagnostic_type TEXT NOT NULL DEFAULT 'sono_financeiro',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  stage_key TEXT,
  stage_label TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_diagnostics TO authenticated;
GRANT ALL ON public.client_diagnostics TO service_role;

ALTER TABLE public.client_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own diagnostics"
  ON public.client_diagnostics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_client_diagnostics_client ON public.client_diagnostics(client_id);
CREATE INDEX idx_client_diagnostics_user ON public.client_diagnostics(user_id);
