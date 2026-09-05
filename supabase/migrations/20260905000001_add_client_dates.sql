-- Adiciona campos de datas especiais ao perfil do cliente
-- birthday: aniversário (data completa, só dia/mês é usado para alertas recorrentes)
-- important_dates: array JSON de datas relevantes (casamento, eventos, etc.)
--   Estrutura: [{ "label": string, "month": number, "day": number, "year": number | null }]
--   Quando year = null → recorrente anualmente
--   Quando year = número → evento único naquele ano

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS important_dates jsonb;

COMMENT ON COLUMN public.clients.birthday IS 'Data de aniversário do cliente (PF) ou fundação (PJ).';
COMMENT ON COLUMN public.clients.important_dates IS 'Datas especiais: [{"label":"...","month":6,"day":15,"year":null}]. year=null = recorrente.';
