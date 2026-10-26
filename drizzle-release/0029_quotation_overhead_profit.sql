ALTER TABLE "quotations" ADD COLUMN "overhead_profit_percent" numeric(5, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "overhead_profit_total" numeric(20, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_overhead_profit_percent_check" CHECK ("quotations"."overhead_profit_percent" >= 0 AND "quotations"."overhead_profit_percent" <= 100);
