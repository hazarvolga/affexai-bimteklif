ALTER TABLE "normalized_quantity_rows" DROP CONSTRAINT "normalized_quantity_rows_review_status_check";--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_review_status_check" CHECK ("normalized_quantity_rows"."review_status" in ('pending_review', 'approved', 'accepted_exception', 'rejected'));--> statement-breakpoint
