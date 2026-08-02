CREATE TYPE public.client_source AS ENUM ('instagram','landing_page','indicacao','outro');

ALTER TABLE public.clients
  ADD COLUMN source public.client_source NOT NULL DEFAULT 'outro',
  ADD COLUMN source_campaign text,
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN landing_url text,
  ADD COLUMN referrer text;

CREATE INDEX clients_source_idx ON public.clients(user_id, source, created_at);

-- Stage history (track pipeline_stage + status changes)
CREATE TABLE public.client_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stage public.pipeline_stage NOT NULL,
  status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.client_stage_history TO authenticated;
GRANT ALL ON public.client_stage_history TO service_role;
ALTER TABLE public.client_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stage history" ON public.client_stage_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX client_stage_history_client_idx ON public.client_stage_history(client_id, changed_at);
CREATE INDEX client_stage_history_user_idx ON public.client_stage_history(user_id, changed_at);

-- Trigger to record stage/status changes
CREATE OR REPLACE FUNCTION public.log_client_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_stage_history (client_id, user_id, stage, status)
    VALUES (NEW.id, NEW.user_id, NEW.pipeline_stage, NEW.status);
  ELSIF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.client_stage_history (client_id, user_id, stage, status)
    VALUES (NEW.id, NEW.user_id, NEW.pipeline_stage, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_client_stage_change() FROM PUBLIC;

CREATE TRIGGER trg_client_stage_change
AFTER INSERT OR UPDATE OF pipeline_stage, status ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_stage_change();

-- Backfill history with current state
INSERT INTO public.client_stage_history (client_id, user_id, stage, status, changed_at)
SELECT id, user_id, pipeline_stage, status, COALESCE(created_at, now())
FROM public.clients;

-- Lead intake tokens (LP posts here)
CREATE TABLE public.lead_intake_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_intake_tokens TO authenticated;
GRANT ALL ON public.lead_intake_tokens TO service_role;
ALTER TABLE public.lead_intake_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens" ON public.lead_intake_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Intake log (rate limit + audit)
CREATE TABLE public.lead_intake_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.lead_intake_tokens(id) ON DELETE SET NULL,
  ip text,
  ok boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_intake_log TO service_role;
ALTER TABLE public.lead_intake_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX lead_intake_log_ip_idx ON public.lead_intake_log(ip, created_at);
CREATE INDEX lead_intake_log_token_idx ON public.lead_intake_log(token_id, created_at);