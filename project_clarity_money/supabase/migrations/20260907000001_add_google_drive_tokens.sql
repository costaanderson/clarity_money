-- Tabela de tokens OAuth2 do Google Drive por usuário
CREATE TABLE IF NOT EXISTS public.google_drive_tokens (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  google_email  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own google drive tokens"
  ON public.google_drive_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
