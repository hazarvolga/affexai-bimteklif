CREATE TABLE "revoked_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE INDEX "revoked_sessions_expires_at_idx" ON "revoked_sessions" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE public.revoked_sessions OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON TABLE public.revoked_sessions FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker;
--> statement-breakpoint
GRANT SELECT ON TABLE public.revoked_sessions TO bimmetraj_control;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_revoke_session(p_token_hash text, p_user_id uuid, p_expires_at timestamp with time zone) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' OR p_user_id IS NULL OR p_expires_at IS NULL THEN RAISE EXCEPTION 'invalid session revocation' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.revoked_sessions(token_hash,user_id,expires_at) VALUES (p_token_hash,p_user_id,p_expires_at)
    ON CONFLICT (token_hash) DO UPDATE SET expires_at = GREATEST(public.revoked_sessions.expires_at, EXCLUDED.expires_at);
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_revoke_session(text,uuid,timestamp with time zone) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_revoke_session(text,uuid,timestamp with time zone) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_revoke_session(text,uuid,timestamp with time zone) TO bimmetraj_control;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_cleanup_revoked_sessions() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.revoked_sessions WHERE token_hash IN (SELECT token_hash FROM public.revoked_sessions WHERE expires_at < clock_timestamp() - interval '7 days' ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED);
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_cleanup_revoked_sessions() OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_cleanup_revoked_sessions() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_cleanup_revoked_sessions() TO bimmetraj_control;
