-- Replace permissive "workspace" ALL policies with owner-scoped policies on user_id

DROP POLICY IF EXISTS "workspace rules" ON public.activation_rules;
CREATE POLICY "Users manage their own activation rules" ON public.activation_rules
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace ai" ON public.ai_generations;
CREATE POLICY "Users manage their own ai generations" ON public.ai_generations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace events" ON public.calendar_events;
CREATE POLICY "Users manage their own calendar events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace categories" ON public.categories;
CREATE POLICY "Users manage their own categories" ON public.categories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace diagnostics" ON public.client_diagnostics;
CREATE POLICY "Users manage their own client diagnostics" ON public.client_diagnostics
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace stage history" ON public.client_stage_history;
CREATE POLICY "Users manage their own client stage history" ON public.client_stage_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace clients" ON public.clients;
CREATE POLICY "Users manage their own clients" ON public.clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace documents" ON public.documents;
CREATE POLICY "Users manage their own documents" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace notes" ON public.notes;
CREATE POLICY "Users manage their own notes" ON public.notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workspace tasks" ON public.tasks;
CREATE POLICY "Users manage their own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);