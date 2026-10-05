CREATE TABLE IF NOT EXISTS public.strategic_plans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter     text        NOT NULL,
  period_start date       NOT NULL,
  period_end   date       NOT NULL,
  goals       jsonb       NOT NULL DEFAULT '{}',
  snapshot    jsonb       NOT NULL DEFAULT '{}',
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own strategic plans"
  ON public.strategic_plans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_strategic_plans_user_created
  ON public.strategic_plans(user_id, created_at DESC);
