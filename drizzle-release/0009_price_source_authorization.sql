ALTER TABLE "price_snapshots" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "authorization_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "authorization_scope" text;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "authorization_evidence_hash" text;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "authorized_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD COLUMN "authorized_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "authorization_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "authorization_scope" text;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "authorization_evidence_hash" text;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "authorized_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_authorized_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("authorized_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
WITH ranked_current_price_evidence AS (
  SELECT evidence.id,
    row_number() OVER (
      PARTITION BY evidence.company_id, evidence.quotation_item_id
      ORDER BY
        (evidence.price_snapshot_id IS NOT NULL AND evidence.price_snapshot_id = item.price_snapshot_id) DESC,
        evidence.created_at DESC,
        evidence.id DESC
    ) AS rank
  FROM quotation_item_evidence AS evidence
  INNER JOIN quotation_items AS item
    ON item.id = evidence.quotation_item_id
    AND item.company_id = evidence.company_id
  WHERE evidence.evidence_type = 'price'
    AND evidence.status = 'current'
)
UPDATE quotation_item_evidence AS evidence
SET status = 'superseded'
FROM ranked_current_price_evidence AS ranked
WHERE evidence.id = ranked.id
  AND ranked.rank > 1
--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_item_evidence_current_price_unique" ON "quotation_item_evidence" USING btree ("company_id","quotation_item_id") WHERE "quotation_item_evidence"."evidence_type" = 'price' AND "quotation_item_evidence"."status" = 'current';
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_authorization_status_check" CHECK ("price_sources"."authorization_status" in ('pending', 'authorized', 'restricted'));
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_authorization_evidence_check" CHECK ("price_sources"."authorization_status" <> 'authorized' OR ("price_sources"."authorization_evidence_hash" ~ '^[0-9a-f]{64}$' AND length("price_sources"."authorization_scope") > 0 AND "price_sources"."authorized_at" IS NOT NULL AND "price_sources"."authorized_by_user_id" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD CONSTRAINT "pricing_data_sources_authorization_status_check" CHECK ("pricing_data_sources"."authorization_status" in ('pending', 'authorized', 'restricted'));
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD CONSTRAINT "pricing_data_sources_authorization_evidence_check" CHECK ("pricing_data_sources"."authorization_status" <> 'authorized' OR ("pricing_data_sources"."authorization_evidence_hash" ~ '^[0-9a-f]{64}$' AND length("pricing_data_sources"."authorization_scope") > 0 AND "pricing_data_sources"."authorized_at" IS NOT NULL));
