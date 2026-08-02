REVOKE EXECUTE ON FUNCTION public.log_client_stage_change() FROM PUBLIC, anon, authenticated;

CREATE POLICY "no direct access" ON public.lead_intake_log FOR SELECT USING (false);