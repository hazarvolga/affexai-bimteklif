CREATE TABLE "academy_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"access_mode" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_editions_product_version_key" UNIQUE("product_id","version"),
	CONSTRAINT "academy_editions_access_mode_check" CHECK ("academy_editions"."access_mode" in ('free_pilot', 'invited', 'paid'))
);
--> statement-breakpoint
CREATE TABLE "academy_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_enrollments_user_company_edition_key" UNIQUE("user_id","company_id","edition_id"),
	CONSTRAINT "academy_enrollments_status_check" CHECK ("academy_enrollments"."status" in ('active', 'expired', 'refunded', 'revoked')),
	CONSTRAINT "academy_enrollments_source_check" CHECK ("academy_enrollments"."source" in ('pilot', 'invite', 'purchase', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "academy_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "academy_editions" ADD CONSTRAINT "academy_editions_product_id_academy_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."academy_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_edition_id_academy_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."academy_editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_enrollments_access" ON "academy_enrollments" USING btree ("company_id","user_id","status","ends_at");--> statement-breakpoint
INSERT INTO "academy_products" ("code", "name") VALUES ('allplan-pro', 'Allplan Pro Track') ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "academy_editions" ("product_id", "version", "name", "access_mode")
SELECT "id", '2026.1', 'Allplan Pro Pilot 2026.1', 'free_pilot' FROM "academy_products" WHERE "code" = 'allplan-pro'
ON CONFLICT ("product_id", "version") DO NOTHING;--> statement-breakpoint
INSERT INTO "academy_enrollments" ("edition_id", "company_id", "user_id", "status", "source")
SELECT edition."id", membership."company_id", membership."user_id", 'active', 'pilot'
FROM "memberships" membership
CROSS JOIN "academy_editions" edition
INNER JOIN "academy_products" product ON product."id" = edition."product_id"
WHERE product."code" = 'allplan-pro' AND edition."version" = '2026.1'
ON CONFLICT ("user_id", "company_id", "edition_id") DO NOTHING;
