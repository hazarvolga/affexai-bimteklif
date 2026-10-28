CREATE TABLE "worker_process_heartbeats" (
	"instance_id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"revision" text,
	"revision_source" text,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_process_heartbeats_kind_check" CHECK ("worker_process_heartbeats"."kind" IN ('worker', 'ifc-worker')),
	CONSTRAINT "worker_process_heartbeats_revision_check" CHECK ("worker_process_heartbeats"."revision" IS NULL OR "worker_process_heartbeats"."revision" ~ '^[A-Fa-f0-9]{7,64}$'),
	CONSTRAINT "worker_process_heartbeats_revision_source_check" CHECK (("worker_process_heartbeats"."revision" IS NULL AND "worker_process_heartbeats"."revision_source" IS NULL) OR ("worker_process_heartbeats"."revision" IS NOT NULL AND "worker_process_heartbeats"."revision_source" IS NOT NULL AND "worker_process_heartbeats"."revision_source" IN ('build', 'env')))
);

--> statement-breakpoint
ALTER TABLE "worker_process_heartbeats" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "worker_process_heartbeats_seen_at_idx" ON "worker_process_heartbeats" USING btree ("seen_at");
--> statement-breakpoint
CREATE POLICY "worker_heartbeat_definer" ON "worker_process_heartbeats" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_owner' AND session_user IN ('bimmetraj_worker', 'bimmetraj_control')) WITH CHECK (current_user = 'bimmetraj_owner' AND session_user = 'bimmetraj_worker');
--> statement-breakpoint
CREATE POLICY "worker_process_heartbeats_backup_read" ON "worker_process_heartbeats" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "worker_process_heartbeats_owner_migration" ON "worker_process_heartbeats" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE public.worker_process_heartbeats OWNER TO bimmetraj_owner;
--> statement-breakpoint
ALTER TABLE public.worker_process_heartbeats FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_worker_heartbeat(p_id uuid, p_kind text, p_revision text, p_revision_source text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN RAISE EXCEPTION 'worker role required' USING ERRCODE = '42501'; END IF;
  -- Serialize quota checks across processes using the shared worker identity.
  PERFORM pg_advisory_xact_lock(hashtext('bimmetraj.worker_heartbeat.quota'));
  DELETE FROM public.worker_process_heartbeats WHERE seen_at < clock_timestamp() - interval '1 day';
  IF EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id AND kind <> p_kind) THEN
    RAISE EXCEPTION 'heartbeat kind mismatch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id AND seen_at > clock_timestamp() - interval '10 seconds') THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id) THEN
    IF (SELECT count(*) FROM public.worker_process_heartbeats WHERE kind = p_kind) >= 32 THEN
      DELETE FROM public.worker_process_heartbeats WHERE instance_id = (
        SELECT instance_id FROM public.worker_process_heartbeats WHERE kind = p_kind AND seen_at < clock_timestamp() - interval '90 seconds' ORDER BY seen_at LIMIT 1
      );
    END IF;
    IF (SELECT count(*) FROM public.worker_process_heartbeats WHERE kind = p_kind) >= 32 THEN
      RAISE EXCEPTION 'heartbeat instance quota reached' USING ERRCODE = '54000';
    END IF;
  END IF;
  INSERT INTO public.worker_process_heartbeats(instance_id, kind, revision, revision_source, seen_at)
    VALUES (p_id, p_kind, p_revision, p_revision_source, clock_timestamp())
    ON CONFLICT (instance_id) DO UPDATE SET revision = EXCLUDED.revision, revision_source = EXCLUDED.revision_source, seen_at = clock_timestamp();
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_worker_heartbeat(uuid,text,text,text) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_worker_heartbeat(uuid,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_worker_heartbeat(uuid,text,text,text) TO bimmetraj_worker;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_worker_heartbeat_summary() RETURNS TABLE(kind text, last_seen timestamptz, active_instances bigint, revision text, revision_source text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT kinds.kind, latest.seen_at, (SELECT count(*) FROM public.worker_process_heartbeats h WHERE h.kind = kinds.kind AND h.seen_at >= clock_timestamp() - interval '90 seconds'), latest.revision, latest.revision_source
    FROM (VALUES ('worker'::text), ('ifc-worker'::text)) kinds(kind)
    LEFT JOIN LATERAL (SELECT h.seen_at, h.revision, h.revision_source FROM public.worker_process_heartbeats h WHERE h.kind = kinds.kind ORDER BY h.seen_at DESC LIMIT 1) latest ON true;
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_worker_heartbeat_summary() OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_worker_heartbeat_summary() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_worker_heartbeat_summary() TO bimmetraj_control;
