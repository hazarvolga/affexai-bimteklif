CREATE TABLE "academy_activation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"lesson_slug" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_activation_events_type_check" CHECK ("academy_activation_events"."event_type" in ('registration_completed', 'first_lesson_opened', 'second_lesson_opened', 'learner_active_day', 'structural_early_access_requested'))
);
--> statement-breakpoint
CREATE TABLE "academy_learner_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"selected_lesson_slug" text,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"privacy_version" text NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent_version" text,
	"marketing_consent_at" timestamp with time zone,
	"acquisition_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_action_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_action_tokens_type_check" CHECK ("auth_action_tokens"."type" in ('verify_email', 'reset_password'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "academy_activation_events" ADD CONSTRAINT "academy_activation_events_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" ADD CONSTRAINT "academy_learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" ADD CONSTRAINT "academy_learner_profiles_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_activation_events_funnel" ON "academy_activation_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_academy_activation_events_user" ON "academy_activation_events" USING btree ("company_id","user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_academy_learner_profiles_company" ON "academy_learner_profiles" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_action_tokens_user_type" ON "auth_action_tokens" USING btree ("user_id","type","created_at");