CREATE FUNCTION public.bimmetraj_worker_get_quota_period(p_company_id uuid, p_at timestamp with time zone) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
DECLARE v_period text;
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN RAISE EXCEPTION 'worker role required' USING ERRCODE = '42501'; END IF;
  IF p_company_id IS NULL OR p_at IS NULL THEN RAISE EXCEPTION 'invalid quota period input' USING ERRCODE = '22023'; END IF;
  SELECT to_char(s.current_period_start, 'YYYY-MM-DD') INTO v_period
    FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
    WHERE s.company_id = p_company_id AND p.is_trial AND s.current_period_start IS NOT NULL AND s.current_period_end IS NOT NULL;
  RETURN coalesce(v_period, to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM'));
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_worker_get_quota_period(uuid, timestamp with time zone) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_worker_get_quota_period(uuid, timestamp with time zone) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_worker_get_quota_period(uuid, timestamp with time zone) TO bimmetraj_worker;
--> statement-breakpoint
UPDATE public.plans SET marketing_description = 'Yüksek teklif ve IFC kapasitesi için.' WHERE id = '2b507e20-83d1-4b21-9fc1-000000000005' AND marketing_description = 'Ekip yönetimi, yüksek kapasite ve öncelikli işleme için.';
