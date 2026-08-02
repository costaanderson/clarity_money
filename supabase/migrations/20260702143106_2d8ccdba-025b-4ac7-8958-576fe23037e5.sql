CREATE TYPE public.pipeline_stage AS ENUM ('novo','primeiro_contato','reuniao_agendada','reuniao_realizada','fechamento','contrato_enviado','em_andamento');

ALTER TABLE public.clients ADD COLUMN pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'novo';
ALTER TABLE public.clients ADD COLUMN pipeline_order integer NOT NULL DEFAULT 0;

CREATE INDEX clients_pipeline_stage_idx ON public.clients(user_id, pipeline_stage, pipeline_order);