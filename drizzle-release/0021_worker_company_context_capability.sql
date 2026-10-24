CREATE OR REPLACE FUNCTION public.bimmetraj_worker_get_company_context(p_company_id uuid)
RETURNS TABLE(company_exists boolean, active_standard text, smartcheck_max_waste_percent numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN
    RAISE EXCEPTION 'Worker company context function requires the worker session role' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id),
      company.active_standard,
      company.smartcheck_max_waste_percent
    FROM public.companies company
    WHERE company.id = p_company_id;
END;
$function$
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_worker_get_company_context(uuid) OWNER TO bimmetraj_owner
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.bimmetraj_worker_get_company_context(uuid) FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker, bimmetraj_backup
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_worker_get_company_context(uuid) TO bimmetraj_worker
