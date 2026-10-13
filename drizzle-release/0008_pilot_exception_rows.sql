ALTER TABLE "smartcheck_pilot_measurements" ADD COLUMN "exception_rows" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_exception_rows_check" CHECK ("smartcheck_pilot_measurements"."exception_rows" >= 0);
