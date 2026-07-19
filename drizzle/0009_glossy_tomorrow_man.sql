ALTER TABLE "companies" ADD COLUMN "default_escalation_volatility_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "default_carbon_risk_premium_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "default_information_delivery_cost_percent" numeric(5, 2) DEFAULT '0' NOT NULL;