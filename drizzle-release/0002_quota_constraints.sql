ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_company_id_period_key" UNIQUE("company_id","period");
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_monthly_quote_limit_nonnegative" CHECK ("plans"."monthly_quote_limit" >= 0);
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_monthly_price_nonnegative" CHECK ("plans"."monthly_price" >= 0);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_bonus_quote_limit_nonnegative" CHECK ("subscriptions"."bonus_quote_limit" >= 0);
--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_quote_count_nonnegative" CHECK ("usage_records"."quote_count" >= 0);
