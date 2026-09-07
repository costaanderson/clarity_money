ALTER TABLE public.google_drive_tokens
  ADD COLUMN IF NOT EXISTS folder_id   text,
  ADD COLUMN IF NOT EXISTS folder_name text;
