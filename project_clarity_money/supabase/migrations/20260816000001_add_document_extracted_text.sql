-- Adiciona coluna para armazenar o texto extraído de documentos para contexto da IA.
-- Aditiva: não altera dados existentes. NULL = documento ainda não processado / não processável.
ALTER TABLE documents ADD COLUMN extracted_text text;
