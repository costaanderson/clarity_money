-- 1. Lock down lead_intake_tokens to owner only
DROP POLICY IF EXISTS "workspace tokens" ON public.lead_intake_tokens;

CREATE POLICY "Users manage their own lead intake tokens"
  ON public.lead_intake_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Remove permissive storage policies for client-documents bucket.
-- Keep only the ownership-scoped "own docs" policies.
DROP POLICY IF EXISTS "workspace docs read" ON storage.objects;
DROP POLICY IF EXISTS "workspace docs insert" ON storage.objects;
DROP POLICY IF EXISTS "workspace docs update" ON storage.objects;
DROP POLICY IF EXISTS "workspace docs delete" ON storage.objects;