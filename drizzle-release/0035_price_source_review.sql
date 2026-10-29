CREATE TABLE "global_price_source_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "global_price_source_review_events_action_check" CHECK ("global_price_source_review_events"."action" in ('verify', 'revoke', 'invalidated'))
);

--> statement-breakpoint
CREATE TABLE "tenant_price_source_review_invalidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_price_source_review_invalidations_reason_check" CHECK ("tenant_price_source_review_invalidations"."reason" in ('source_identity_or_authorization_changed', 'review_evidence_changed'))
);

--> statement-breakpoint
ALTER TABLE "tenant_price_source_review_invalidations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "review_status" text DEFAULT 'legacy_unverified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "review_evidence_reference" text;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "review_scope" text;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "review_allows_quotations" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "reviewed_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "review_status" text DEFAULT 'legacy_unverified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "review_evidence_reference" text;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "review_scope" text;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "review_allows_quotations" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "reviewed_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "global_price_source_review_events" ADD CONSTRAINT "global_price_source_review_events_source_id_pricing_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."pricing_data_sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "global_price_source_review_events" ADD CONSTRAINT "global_price_source_review_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_price_source_review_invalidations" ADD CONSTRAINT "tenant_price_source_review_invalidations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_price_source_review_invalidations" ADD CONSTRAINT "tenant_price_source_review_invalidations_source_id_company_id_price_sources_id_company_id_fk" FOREIGN KEY ("source_id","company_id") REFERENCES "public"."price_sources"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_review_status_check" CHECK ("price_sources"."review_status" in ('legacy_unverified', 'verified', 'revoked'));
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_review_evidence_check" CHECK ("price_sources"."review_status" <> 'verified' OR ("price_sources"."review_evidence_reference" IS NOT NULL AND length(trim("price_sources"."review_evidence_reference")) > 0 AND "price_sources"."review_scope" IS NOT NULL AND length(trim("price_sources"."review_scope")) > 0 AND "price_sources"."review_allows_quotations" = true AND "price_sources"."reviewed_by_user_id" IS NOT NULL AND "price_sources"."reviewed_at" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD CONSTRAINT "pricing_data_sources_review_status_check" CHECK ("pricing_data_sources"."review_status" in ('legacy_unverified', 'verified', 'revoked'));
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD CONSTRAINT "pricing_data_sources_review_evidence_check" CHECK ("pricing_data_sources"."review_status" <> 'verified' OR ("pricing_data_sources"."review_evidence_reference" IS NOT NULL AND length(trim("pricing_data_sources"."review_evidence_reference")) > 0 AND "pricing_data_sources"."review_scope" IS NOT NULL AND length(trim("pricing_data_sources"."review_scope")) > 0 AND "pricing_data_sources"."review_allows_quotations" = true AND "pricing_data_sources"."reviewed_by_user_id" IS NOT NULL AND "pricing_data_sources"."reviewed_at" IS NOT NULL));
--> statement-breakpoint
CREATE POLICY "tenant_price_source_review_invalidations_app_tenant_read" ON "tenant_price_source_review_invalidations" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "tenant_price_source_review_invalidations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "tenant_price_source_review_invalidations_owner_trigger_insert" ON "tenant_price_source_review_invalidations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_owner' AND session_user = 'bimmetraj_app' AND "tenant_price_source_review_invalidations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "tenant_price_source_review_invalidations_backup_read" ON "tenant_price_source_review_invalidations" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "tenant_price_source_review_invalidations_owner_migration" ON "tenant_price_source_review_invalidations" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE public.global_price_source_review_events OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON TABLE public.global_price_source_review_events FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.global_price_source_review_events TO bimmetraj_app;
--> statement-breakpoint
ALTER TABLE public.tenant_price_source_review_invalidations OWNER TO bimmetraj_owner;
--> statement-breakpoint
ALTER TABLE public.tenant_price_source_review_invalidations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.tenant_price_source_review_invalidations FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker;
--> statement-breakpoint
GRANT SELECT ON TABLE public.tenant_price_source_review_invalidations TO bimmetraj_app;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_lock_tenant_member(p_user_id uuid, p_company_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
DECLARE current_role text;
BEGIN
  IF session_user <> 'bimmetraj_app' OR current_setting('bimmetraj.user_id', true) IS DISTINCT FROM p_user_id::text OR current_setting('bimmetraj.company_id', true) IS DISTINCT FROM p_company_id::text THEN RAISE EXCEPTION 'tenant context required' USING ERRCODE = '42501'; END IF;
  SELECT m.role::text INTO current_role FROM public.memberships m WHERE m.user_id=p_user_id AND m.company_id=p_company_id FOR SHARE OF m;
  RETURN current_role;
END $function$;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_lock_price_reviewer(p_user_id uuid, p_company_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
DECLARE permitted boolean;
BEGIN
  IF session_user <> 'bimmetraj_app' OR current_setting('bimmetraj.user_id', true) IS DISTINCT FROM p_user_id::text OR current_setting('bimmetraj.company_id', true) IS DISTINCT FROM p_company_id::text THEN RAISE EXCEPTION 'tenant context required' USING ERRCODE = '42501'; END IF;
  SELECT u.email_verified IS NOT NULL AND m.role IN ('owner', 'admin') INTO permitted FROM public.memberships m JOIN public.users u ON u.id=m.user_id WHERE m.user_id=p_user_id AND m.company_id=p_company_id FOR SHARE OF m,u;
  RETURN coalesce(permitted, false);
END $function$;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_lock_global_price_reviewer(p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
DECLARE permitted boolean;
BEGIN
  IF session_user <> 'bimmetraj_app' THEN RAISE EXCEPTION 'application role required' USING ERRCODE = '42501'; END IF;
  SELECT u.is_super_admin AND u.email_verified IS NOT NULL INTO permitted FROM public.users u WHERE u.id=p_user_id FOR SHARE OF u;
  RETURN coalesce(permitted, false);
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_lock_tenant_member(uuid,uuid) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_lock_tenant_member(uuid,uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_lock_tenant_member(uuid,uuid) TO bimmetraj_app;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_lock_price_reviewer(uuid,uuid) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_lock_price_reviewer(uuid,uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_lock_price_reviewer(uuid,uuid) TO bimmetraj_app;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_lock_global_price_reviewer(uuid) OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_lock_global_price_reviewer(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bimmetraj_lock_global_price_reviewer(uuid) TO bimmetraj_app;
--> statement-breakpoint
CREATE FUNCTION public.bimmetraj_invalidate_price_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $function$
DECLARE invalidation_reason text;
BEGIN
  IF (TG_TABLE_NAME = 'price_sources' AND ((to_jsonb(OLD) -> 'source_type'), (to_jsonb(OLD) -> 'name'), (to_jsonb(OLD) -> 'authority'), (to_jsonb(OLD) -> 'source_url'), (to_jsonb(OLD) -> 'source_document_identifier'), (to_jsonb(OLD) -> 'source_document_hash'), (to_jsonb(OLD) -> 'license_status'), (to_jsonb(OLD) -> 'authorization_status'), (to_jsonb(OLD) -> 'authorization_scope'), (to_jsonb(OLD) -> 'authorization_evidence_hash')) IS DISTINCT FROM ((to_jsonb(NEW) -> 'source_type'), (to_jsonb(NEW) -> 'name'), (to_jsonb(NEW) -> 'authority'), (to_jsonb(NEW) -> 'source_url'), (to_jsonb(NEW) -> 'source_document_identifier'), (to_jsonb(NEW) -> 'source_document_hash'), (to_jsonb(NEW) -> 'license_status'), (to_jsonb(NEW) -> 'authorization_status'), (to_jsonb(NEW) -> 'authorization_scope'), (to_jsonb(NEW) -> 'authorization_evidence_hash')))
     OR (TG_TABLE_NAME = 'pricing_data_sources' AND ((to_jsonb(OLD) -> 'code'), (to_jsonb(OLD) -> 'name'), (to_jsonb(OLD) -> 'authority'), (to_jsonb(OLD) -> 'category'), (to_jsonb(OLD) -> 'source_url'), (to_jsonb(OLD) -> 'version_tag'), (to_jsonb(OLD) -> 'authorization_status'), (to_jsonb(OLD) -> 'authorization_scope'), (to_jsonb(OLD) -> 'authorization_evidence_hash')) IS DISTINCT FROM ((to_jsonb(NEW) -> 'code'), (to_jsonb(NEW) -> 'name'), (to_jsonb(NEW) -> 'authority'), (to_jsonb(NEW) -> 'category'), (to_jsonb(NEW) -> 'source_url'), (to_jsonb(NEW) -> 'version_tag'), (to_jsonb(NEW) -> 'authorization_status'), (to_jsonb(NEW) -> 'authorization_scope'), (to_jsonb(NEW) -> 'authorization_evidence_hash')))
     OR ((to_jsonb(OLD) ->> 'review_status') = 'verified' AND ((to_jsonb(OLD) -> 'review_evidence_reference'), (to_jsonb(OLD) -> 'review_scope'), (to_jsonb(OLD) -> 'review_allows_quotations')) IS DISTINCT FROM ((to_jsonb(NEW) -> 'review_evidence_reference'), (to_jsonb(NEW) -> 'review_scope'), (to_jsonb(NEW) -> 'review_allows_quotations')) AND (to_jsonb(NEW) -> 'reviewed_at') IS NOT DISTINCT FROM (to_jsonb(OLD) -> 'reviewed_at')) THEN
    IF OLD.review_status = 'verified' THEN
      invalidation_reason := CASE WHEN (OLD.review_evidence_reference, OLD.review_scope, OLD.review_allows_quotations) IS DISTINCT FROM (NEW.review_evidence_reference, NEW.review_scope, NEW.review_allows_quotations) AND NEW.reviewed_at IS NOT DISTINCT FROM OLD.reviewed_at THEN 'review_evidence_changed' ELSE 'source_identity_or_authorization_changed' END;
      IF TG_TABLE_NAME = 'price_sources' THEN
        INSERT INTO public.tenant_price_source_review_invalidations(company_id,source_id,reason) VALUES (OLD.company_id,OLD.id,invalidation_reason);
      ELSE
        INSERT INTO public.global_price_source_review_events(source_id,actor_user_id,action,before,after) VALUES (OLD.id,NULL,'invalidated',jsonb_build_object('status','verified'),jsonb_build_object('status','legacy_unverified','reason',invalidation_reason));
      END IF;
    END IF;
    NEW.review_status := 'legacy_unverified';
  END IF;
  RETURN NEW;
END $function$;
--> statement-breakpoint
ALTER FUNCTION public.bimmetraj_invalidate_price_review() OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bimmetraj_invalidate_price_review() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER price_sources_review_invalidation BEFORE UPDATE ON public.price_sources FOR EACH ROW EXECUTE FUNCTION public.bimmetraj_invalidate_price_review();
--> statement-breakpoint
CREATE TRIGGER pricing_data_sources_review_invalidation BEFORE UPDATE ON public.pricing_data_sources FOR EACH ROW EXECUTE FUNCTION public.bimmetraj_invalidate_price_review();
