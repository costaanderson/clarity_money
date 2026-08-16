-- ============================================================
-- SETUP COMPLETO — Bússola CRM
-- Projeto: dzygdguzyyyrmcmzfpyb
-- Execute este script inteiro no SQL Editor do Supabase.
-- ============================================================

-- ── 1. FUNÇÕES COMPARTILHADAS ────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Auto-cria perfil ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. ENUMS ─────────────────────────────────────────────────

CREATE TYPE public.client_type    AS ENUM ('PF','PJ');
CREATE TYPE public.client_status  AS ENUM ('lead','ativo','arquivado');
CREATE TYPE public.note_kind      AS ENUM ('nota','contexto');
CREATE TYPE public.task_status    AS ENUM ('pendente','feito','cancelado');
CREATE TYPE public.task_source    AS ENUM ('manual','regra_ativacao');
CREATE TYPE public.rule_action    AS ENUM ('task','email','ambos');
CREATE TYPE public.ai_kind        AS ENUM ('resumo','mensagem','analise','briefing');
CREATE TYPE public.pipeline_stage AS ENUM (
  'novo','primeiro_contato','reuniao_agendada','reuniao_realizada',
  'fechamento','contrato_enviado','em_andamento','finalizado'
);
CREATE TYPE public.client_source  AS ENUM (
  'instagram','landing_page','indicacao','outro','google_ads'
);

-- ── 3. TABELAS ───────────────────────────────────────────────

-- profiles
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  email      TEXT,
  google_calendar_connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- categories
CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#8B9D77',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own categories" ON public.categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- clients
CREATE TABLE public.clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             public.client_type NOT NULL DEFAULT 'PF',
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  document         TEXT,
  status           public.client_status NOT NULL DEFAULT 'lead',
  category_id      UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  last_contact_at  TIMESTAMPTZ,
  next_action_at   TIMESTAMPTZ,
  pipeline_stage   public.pipeline_stage NOT NULL DEFAULT 'novo',
  pipeline_order   INTEGER NOT NULL DEFAULT 0,
  finalized_at     TIMESTAMPTZ,
  source           public.client_source NOT NULL DEFAULT 'outro',
  source_campaign  TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  landing_url      TEXT,
  referrer         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clients(user_id);
CREATE INDEX ON public.clients(status);
CREATE INDEX ON public.clients(category_id);
CREATE INDEX clients_pipeline_stage_idx ON public.clients(user_id, pipeline_stage, pipeline_order);
CREATE INDEX clients_source_idx ON public.clients(user_id, source, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own clients" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notes
CREATE TABLE public.notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind       public.note_kind NOT NULL DEFAULT 'nota',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notes(client_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notes" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- documents
CREATE TABLE public.documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  path           TEXT NOT NULL,
  size           BIGINT,
  mime           TEXT,
  extracted_text TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.documents(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own documents" ON public.documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tasks
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_at      TIMESTAMPTZ,
  status      public.task_status NOT NULL DEFAULT 'pendente',
  source      public.task_source NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tasks(user_id, status);
CREATE INDEX ON public.tasks(due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own tasks" ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activation_rules
CREATE TABLE public.activation_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  trigger_days_no_contact  INTEGER NOT NULL DEFAULT 30,
  applies_to_status        public.client_status NOT NULL DEFAULT 'lead',
  action                   public.rule_action NOT NULL DEFAULT 'task',
  email_subject            TEXT,
  email_body_template      TEXT,
  active                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_rules TO authenticated;
GRANT ALL ON public.activation_rules TO service_role;
ALTER TABLE public.activation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own activation rules" ON public.activation_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.activation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- calendar_events
CREATE TABLE public.calendar_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  google_event_id TEXT,
  title          TEXT NOT NULL,
  description    TEXT,
  location       TEXT,
  meet_link      TEXT,
  start_at       TIMESTAMPTZ NOT NULL,
  end_at         TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);
CREATE INDEX ON public.calendar_events(user_id, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own calendar events" ON public.calendar_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai_generations
CREATE TABLE public.ai_generations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  kind       public.ai_kind NOT NULL,
  prompt     TEXT,
  output     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_generations(client_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own ai generations" ON public.ai_generations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- client_stage_history
CREATE TABLE public.client_stage_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  stage      public.pipeline_stage NOT NULL,
  status     TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.client_stage_history TO authenticated;
GRANT ALL ON public.client_stage_history TO service_role;
ALTER TABLE public.client_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own client stage history" ON public.client_stage_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX client_stage_history_client_idx ON public.client_stage_history(client_id, changed_at);
CREATE INDEX client_stage_history_user_idx   ON public.client_stage_history(user_id, changed_at);

-- Trigger que registra mudanças de estágio/status no histórico
CREATE OR REPLACE FUNCTION public.log_client_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
REVOKE ALL ON FUNCTION public.log_client_stage_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_client_stage_change
  AFTER INSERT OR UPDATE OF pipeline_stage, status ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_stage_change();

-- lead_intake_tokens
CREATE TABLE public.lead_intake_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  label        TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_intake_tokens TO authenticated;
GRANT ALL ON public.lead_intake_tokens TO service_role;
ALTER TABLE public.lead_intake_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own lead intake tokens" ON public.lead_intake_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- lead_intake_log
CREATE TABLE public.lead_intake_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id   UUID REFERENCES public.lead_intake_tokens(id) ON DELETE SET NULL,
  ip         TEXT,
  ok         BOOLEAN NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_intake_log TO service_role;
ALTER TABLE public.lead_intake_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access" ON public.lead_intake_log FOR SELECT USING (false);
CREATE INDEX lead_intake_log_ip_idx    ON public.lead_intake_log(ip, created_at);
CREATE INDEX lead_intake_log_token_idx ON public.lead_intake_log(token_id, created_at);

-- client_diagnostics
CREATE TABLE public.client_diagnostics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  diagnostic_type TEXT NOT NULL DEFAULT 'sono_financeiro',
  score           INTEGER NOT NULL DEFAULT 0,
  max_score       INTEGER NOT NULL DEFAULT 0,
  stage_key       TEXT,
  stage_label     TEXT,
  answers         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_diagnostics TO authenticated;
GRANT ALL ON public.client_diagnostics TO service_role;
ALTER TABLE public.client_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own client diagnostics" ON public.client_diagnostics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_client_diagnostics_client ON public.client_diagnostics(client_id);
CREATE INDEX idx_client_diagnostics_user   ON public.client_diagnostics(user_id);

-- ── 4. STORAGE POLICIES ──────────────────────────────────────
-- (O bucket "client-documents" deve ser criado manualmente no
--  painel Storage → New bucket → nome: client-documents → private)

CREATE POLICY "own docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
