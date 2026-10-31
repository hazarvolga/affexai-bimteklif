CREATE POLICY "activities_admin_deletion_capability" ON "activities" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "clients_admin_deletion_capability" ON "clients" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "company_industry_settings_admin_deletion_capability" ON "company_industry_settings" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "cost_components_admin_deletion_capability" ON "cost_components" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "deals_admin_deletion_capability" ON "deals" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "quotation_financials_admin_deletion_capability" ON "quotation_financials" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "quotation_item_evidence_admin_deletion_capability" ON "quotation_item_evidence" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "quotation_items_admin_deletion_capability" ON "quotation_items" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "quotations_admin_deletion_capability" ON "quotations" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "usage_alerts_admin_deletion_capability" ON "usage_alerts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner') WITH CHECK (false);
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_clear_deleted_company_rows(p_company_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  IF p_company_id IS NULL OR EXISTS (SELECT 1 FROM public.memberships WHERE company_id = p_company_id) THEN
    RAISE EXCEPTION 'tenant rows can only be cleared for a company without members' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.activities WHERE company_id = p_company_id;
  DELETE FROM public.deals WHERE company_id = p_company_id;
  DELETE FROM public.quotation_item_evidence WHERE company_id = p_company_id;
  DELETE FROM public.cost_components WHERE quotation_id IN (SELECT id FROM public.quotations WHERE company_id = p_company_id);
  DELETE FROM public.quotation_financials WHERE quotation_id IN (SELECT id FROM public.quotations WHERE company_id = p_company_id);
  DELETE FROM public.quotation_items WHERE company_id = p_company_id;
  DELETE FROM public.quotations WHERE company_id = p_company_id;
  DELETE FROM public.clients WHERE company_id = p_company_id;
  DELETE FROM public.company_industry_settings WHERE company_id = p_company_id;
  DELETE FROM public.usage_alerts WHERE company_id = p_company_id;
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_clear_deleted_company_rows(uuid) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_clear_deleted_company_rows(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_clear_deleted_company_rows(uuid) TO bimmetraj_control;
