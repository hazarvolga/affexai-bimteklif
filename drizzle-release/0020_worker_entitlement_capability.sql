CREATE OR REPLACE FUNCTION public.bimmetraj_worker_get_entitlement(p_company_id uuid)
RETURNS TABLE(company_exists boolean, subscription_status text, current_period_end timestamp with time zone, plan_id uuid, plan_is_active boolean, monthly_ifc_limit integer, ifc_max_file_mb integer, ifc_max_concurrent integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN
    RAISE EXCEPTION 'Worker entitlement function requires the worker session role' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id),
      subscription.status::text,
      subscription.current_period_end,
      subscription.plan_id,
      plan.is_active,
      plan.monthly_ifc_limit,
      plan.ifc_max_file_mb,
      plan.ifc_max_concurrent
    FROM (SELECT 1) anchor
    LEFT JOIN public.subscriptions subscription ON subscription.company_id = p_company_id
    LEFT JOIN public.plans plan ON plan.id = subscription.plan_id;
END;
$function$
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_worker_get_entitlement(uuid) OWNER TO bimmetraj_owner
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.bimmetraj_worker_get_entitlement(uuid) FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker, bimmetraj_backup
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_worker_get_entitlement(uuid) TO bimmetraj_worker
