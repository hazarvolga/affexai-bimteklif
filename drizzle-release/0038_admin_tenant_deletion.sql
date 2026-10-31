ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_target_company_id_companies_id_fk";

--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_company_id_companies_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_clear_deleted_company_usage(p_company_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  IF p_company_id IS NULL OR EXISTS (SELECT 1 FROM public.memberships WHERE company_id = p_company_id) THEN
    RAISE EXCEPTION 'quota counters can only be cleared for a company without members' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.usage_records WHERE company_id = p_company_id;
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_clear_deleted_company_usage(uuid) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_clear_deleted_company_usage(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_clear_deleted_company_usage(uuid) TO bimmetraj_control;
--> statement-breakpoint
GRANT DELETE ON TABLE public.invitations TO bimmetraj_control;
