-- Adiciona etapa "finalizado" ao pipeline e registra data de finalização por cliente.
-- Aditiva: não altera valores existentes.
ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 'finalizado';

ALTER TABLE clients ADD COLUMN finalized_at timestamptz;
