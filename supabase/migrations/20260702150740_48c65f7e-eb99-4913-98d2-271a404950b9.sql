
-- Shared workspace: any authenticated user sees all rows across the CRM.
-- Profiles remain per-user; lead_intake_log remains locked.

DROP POLICY IF EXISTS "own clients" ON public.clients;
CREATE POLICY "workspace clients" ON public.clients FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own categories" ON public.categories;
CREATE POLICY "workspace categories" ON public.categories FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own notes" ON public.notes;
CREATE POLICY "workspace notes" ON public.notes FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own documents" ON public.documents;
CREATE POLICY "workspace documents" ON public.documents FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own tasks" ON public.tasks;
CREATE POLICY "workspace tasks" ON public.tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own rules" ON public.activation_rules;
CREATE POLICY "workspace rules" ON public.activation_rules FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own events" ON public.calendar_events;
CREATE POLICY "workspace events" ON public.calendar_events FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own ai" ON public.ai_generations;
CREATE POLICY "workspace ai" ON public.ai_generations FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owner can manage own diagnostics" ON public.client_diagnostics;
CREATE POLICY "workspace diagnostics" ON public.client_diagnostics FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own stage history" ON public.client_stage_history;
CREATE POLICY "workspace stage history" ON public.client_stage_history FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "own tokens" ON public.lead_intake_tokens;
CREATE POLICY "workspace tokens" ON public.lead_intake_tokens FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- Storage: shared access to client-documents bucket for authenticated users
DROP POLICY IF EXISTS "own documents read" ON storage.objects;
DROP POLICY IF EXISTS "own documents write" ON storage.objects;
DROP POLICY IF EXISTS "own documents update" ON storage.objects;
DROP POLICY IF EXISTS "own documents delete" ON storage.objects;

CREATE POLICY "workspace docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents');
CREATE POLICY "workspace docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "workspace docs update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-documents') WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "workspace docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents');
