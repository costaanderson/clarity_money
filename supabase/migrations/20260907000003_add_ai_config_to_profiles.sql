ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_provider text,
  ADD COLUMN IF NOT EXISTS ai_api_key  text,
  ADD COLUMN IF NOT EXISTS ai_model    text;
