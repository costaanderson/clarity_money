-- Tabela para armazenar o briefing diário gerado pela Donna (IA)
-- Um briefing por usuário por dia; regenerável a qualquer momento.

CREATE TABLE IF NOT EXISTS public.donna_briefings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca rápida por usuário + data
CREATE INDEX IF NOT EXISTS donna_briefings_user_date_idx
  ON public.donna_briefings (user_id, briefing_date DESC);

-- RLS: usuário só vê seus próprios briefings
ALTER TABLE public.donna_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own donna briefings"
  ON public.donna_briefings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
