CREATE TABLE "admin_mfa_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"secret_ciphertext" text,
	"pending_ciphertext" text,
	"pending_expires_at" timestamp with time zone,
	"pending_recovery_hashes" jsonb,
	"pending_password_fingerprint" text,
	"last_counter" integer DEFAULT -1 NOT NULL,
	"recovery_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL
);

--> statement-breakpoint
CREATE TABLE "admin_mfa_challenges" (
	"challenge_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"password_fingerprint" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_epoch" uuid;
--> statement-breakpoint
ALTER TABLE "admin_mfa_accounts" ADD CONSTRAINT "admin_mfa_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_mfa_challenges" ADD CONSTRAINT "admin_mfa_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_mfa_challenges_expires_at_idx" ON "admin_mfa_challenges" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE public.admin_mfa_accounts OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON TABLE public.admin_mfa_accounts FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_mfa_accounts TO bimmetraj_control;
--> statement-breakpoint
ALTER TABLE public.admin_mfa_challenges OWNER TO bimmetraj_owner;
--> statement-breakpoint
REVOKE ALL ON TABLE public.admin_mfa_challenges FROM PUBLIC, bimmetraj_app, bimmetraj_control, bimmetraj_worker;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_mfa_challenges TO bimmetraj_control;
