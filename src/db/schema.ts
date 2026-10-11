import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  primaryKey,
  foreignKey,
  pgEnum,
  index,
  check,
  bigint,
  jsonb,
  uniqueIndex,
  unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { SourceEvidence } from "../smartcheck/schemas/source-evidence.schema";
import type { StructuredCondition } from "../smartcheck/schemas/structured-condition.schema";

// ─── GLOBAL ENUMS ───
export const currencyEnum = pgEnum("currency", ["TRY", "USD", "EUR"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "negotiation", "won", "lost", "archived"]);
export const pipelineStageEnum = pgEnum("pipeline_stage", ["lead", "contacted", "quotation_sent", "negotiation", "won", "lost"]);
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "manager", "viewer"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["starter", "pro", "elite", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled"]);
export const activityTypeEnum = pgEnum("activity_type", ["call", "email", "meeting", "quotation_update", "stage_change", "note"]);
export const impactLevelEnum = pgEnum("impact_level", ["low", "medium", "high"]);

// ─── MODULE ENUMS ───
export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "queued",
  "processing",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
  "archived"
]);

export const processingRunStatusEnum = pgEnum("processing_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
]);

export const processingStageEnum = pgEnum("processing_stage", [
  "queued",
  "parsing",
  "normalizing",
  "validating",
  "awaiting_review",
  "extracting_rules",
  "consolidating",
  "preparing_review",
  "completed",
  "failed",
  "cancelled"
]);

export const reviewSessionStatusEnum = pgEnum("review_session_status", [
  "draft",
  "submitted",
  "in_progress",
  "completed",
  "cancelled",
  "reopened"
]);

export const ruleCandidateStatusEnum = pgEnum("rule_candidate_status", [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "deferred",
  "merged"
]);

export const ruleScopeEnum = pgEnum("rule_scope_type", ["company", "quotation"]);
export const ruleStatusEnum = pgEnum("rule_status", ["draft", "active", "inactive", "archived"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const findingStatusEnum = pgEnum("finding_status", [
  "open",
  "in_progress",
  "resolved",
  "disputed",
  "accepted_exception",
  "rejected"
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "inline_guide",
  "checklist",
  "example",
  "document",
  "image",
  "video",
  "external_link"
]);

export const errorCategoryEnum = pgEnum("error_category", [
  "classification_code",
  "quantity_unit",
  "modeling_standard",
  "missing_duplicate",
  "pricing_margin"
]);

export const competencySignalStatusEnum = pgEnum("competency_signal_status", [
  "observing",
  "suggested",
  "manager_confirmed",
  "dismissed",
  "resolved"
]);

// ─── TABLES ───

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  emailVerified: timestamp("email_verified"),
  verificationToken: text("verification_token"),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authActionTokens = pgTable("auth_action_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeCheck: check("auth_action_tokens_type_check", sql`${table.type} in ('verify_email', 'reset_password')`),
  idxUserActionTokens: index("idx_auth_action_tokens_user_type").on(table.userId, table.type, table.createdAt),
}));

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  requestCount: integer("request_count").default(0).notNull(),
  resetsAt: timestamp("resets_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  requestCountCheck: check("rate_limit_buckets_request_count_check", sql`${table.requestCount} >= 0`),
  idxRateLimitExpiry: index("idx_rate_limit_buckets_expiry").on(table.resetsAt),
}));

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  taxNumber: text("tax_number"),
  taxOffice: text("tax_office"),
  address: text("address"),
  signatureUrl: text("signature_url"),
  stampUrl: text("stamp_url"),
  defaultCurrency: currencyEnum("default_currency").default("TRY").notNull(),
  defaultVatRate: integer("default_vat_rate").default(20).notNull(),
  countryCode: text("country_code").default("TR").notNull(),
  measurementSystem: text("measurement_system").default("metric").notNull(),
  activeStandard: text("active_standard").default("TBDY_TS500").notNull(),
  classificationSystem: text("classification_system").default("CSB_TR").notNull(),
  smartcheckMaxWastePercent: numeric("smartcheck_max_waste_percent", { precision: 5, scale: 2 }).default("20").notNull(),
  defaultEscalationVolatilityPercent: numeric("default_escalation_volatility_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  defaultCarbonRiskPremiumPercent: numeric("default_carbon_risk_premium_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  defaultInformationDeliveryCostPercent: numeric("default_information_delivery_cost_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  phone: text("phone"),
  email: text("email"),
  isSmartcheckEnabled: boolean("is_smartcheck_enabled").default(false).notNull(),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  countryCodeCheck: check("companies_country_code_check", sql`${table.countryCode} in ('TR', 'DE', 'GB', 'US', 'AE')`),
  measurementSystemCheck: check("companies_measurement_system_check", sql`${table.measurementSystem} in ('metric', 'imperial')`),
  activeStandardCheck: check("companies_active_standard_check", sql`${table.activeStandard} in ('TBDY_TS500', 'EUROCODE_2', 'ACI_318')`),
  classificationSystemCheck: check("companies_classification_system_check", sql`${table.classificationSystem} in ('CSB_TR', 'DIN_276', 'CSI_MASTERFORMAT', 'NRM2_UK')`),
}));

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  role: userRoleEnum("role").default("viewer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userCompanyUnique: unique("memberships_user_id_company_id_key").on(table.userId, table.companyId),
  };
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  monthlyQuoteLimit: integer("monthly_quote_limit").notNull(),
  monthlyPrice: integer("monthly_price").notNull(),
  monthlyIfcLimit: integer("monthly_ifc_limit"),
  ifcMaxFileMb: integer("ifc_max_file_mb").default(50).notNull(),
  ifcMaxConcurrent: integer("ifc_max_concurrent").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  marketingBadge: text("marketing_badge"),
  marketingDescription: text("marketing_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  monthlyQuoteLimitNonnegative: check("plans_monthly_quote_limit_nonnegative", sql`${table.monthlyQuoteLimit} >= 0`),
  monthlyPriceNonnegative: check("plans_monthly_price_nonnegative", sql`${table.monthlyPrice} >= 0`),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull().unique(),
  plan: subscriptionPlanEnum("plan").default("starter").notNull(), // Keep for legacy fallback
  planId: uuid("plan_id").references(() => plans.id),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  bonusQuoteLimit: integer("bonus_quote_limit").default(0).notNull(),
  bonusIfcLimit: integer("bonus_ifc_limit").default(0).notNull(),
  currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  bonusQuoteLimitNonnegative: check("subscriptions_bonus_quote_limit_nonnegative", sql`${table.bonusQuoteLimit} >= 0`),
}));


// 12. usage_logs (Kept in original order, lazy evaluation for FK to avoid TDZ & Drizzle TTY Prompt)
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  feature: text("feature").notNull(),
  count: integer("count").default(1).notNull(),
  tokensUsed: integer("tokens_used"),
  costEstimate: numeric("cost_estimate", { precision: 10, scale: 5 }),
  date: timestamp("date").defaultNow().notNull(),
  documentProcessingRunId: uuid("document_processing_run_id"),
}, (table) => {
  return {
    processingRunFk: foreignKey({
      columns: [table.documentProcessingRunId, table.companyId],
      foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.companyId],
    }).onDelete("no action"),
    companyRunIdx: index("idx_usage_logs_processing_run").on(table.companyId, table.documentProcessingRunId),
  };
});

export const usageAlerts = pgTable("usage_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  email: text("email").notNull(),
  role: text("role").default("member").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source"),
  status: text("status").default("new").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pilotApplications = pgTable("pilot_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  teamSize: text("team_size"),
  currentWorkflow: text("current_workflow"),
  source: text("source").default("website").notNull(),
  status: text("status").default("new").notNull(),
  offerAmount: numeric("offer_amount", { precision: 12, scale: 2 }),
  offerCurrency: text("offer_currency").default("TRY").notNull(),
  offerSentAt: timestamp("offer_sent_at"),
  paymentStatus: text("payment_status").default("not_offered").notNull(),
  paidAt: timestamp("paid_at"),
  contactedAt: timestamp("contacted_at"),
  qualifiedAt: timestamp("qualified_at"),
  convertedAt: timestamp("converted_at"),
  consentAt: timestamp("consent_at").notNull(),
  provisionedCompanyId: uuid("provisioned_company_id").references(() => companies.id),
  provisionedUserId: uuid("provisioned_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("idx_pilot_applications_email").on(table.email),
  statusIdx: index("idx_pilot_applications_status").on(table.status),
}));

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  pipelineStage: pipelineStageEnum("pipeline_stage").default("lead").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  quoteNumber: text("quote_number").notNull(),
  projectName: text("project_name").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  currency: currencyEnum("currency").default("TRY").notNull(),
  notes: text("notes"),
  status: quoteStatusEnum("status").default("draft").notNull(),
  industryId: text("industry_id").references(() => industries.id),
  projectDurationMonths: integer("project_duration_months").default(1).notNull(),
  escalationVolatilityPercent: numeric("escalation_volatility_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  procurementProfile: text("procurement_profile").default("standard").notNull(),
  carbonRiskPremiumPercent: numeric("carbon_risk_premium_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  informationDeliveryLevel: text("information_delivery_level").default("none").notNull(),
  informationDeliveryCostPercent: numeric("information_delivery_cost_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  observedActualCost: numeric("observed_actual_cost", { precision: 20, scale: 2 }),
  observedActualDurationMonths: integer("observed_actual_duration_months"),
  calibrationStatus: text("calibration_status").default("not_collected").notNull(),
  calibrationNote: text("calibration_note"),
  pricingSnapshotLockStatus: text("pricing_snapshot_lock_status").default("unlocked").notNull(),
  pricingSnapshotLockedAt: timestamp("pricing_snapshot_locked_at", { withTimezone: true }),
  pricingSnapshotLockedByUserId: uuid("pricing_snapshot_locked_by_user_id"),
  pricingSnapshotLockHash: text("pricing_snapshot_lock_hash"),
  subtotal: numeric("subtotal", { precision: 20, scale: 2 }).notNull(),
  discountTotal: numeric("discount_total", { precision: 20, scale: 2 }).notNull(),
  vatTotal: numeric("vat_total", { precision: 20, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 20, scale: 2 }).notNull(),
  revisionVersion: integer("revision_version").default(1).notNull(),
  parentId: uuid("parent_id"),
  isLatest: boolean("is_latest").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyQuoteUnique: unique("quotations_id_company_id_key").on(table.id, table.companyId),
    pricingSnapshotLockUserFk: foreignKey({
      columns: [table.pricingSnapshotLockedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    pricingSnapshotLockStatusCheck: check("quotations_pricing_snapshot_lock_status_check", sql`${table.pricingSnapshotLockStatus} in ('unlocked', 'locked', 'stale')`),
  };
});

// ============================================================
// SMARTCHECK PHASE 3 — PRICE SOURCES AND IMMUTABLE SNAPSHOTS
// ============================================================

export const priceSources = pgTable("price_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  sourceType: text("source_type").notNull(),
  name: text("name").notNull(),
  authority: text("authority"),
  sourceUrl: text("source_url"),
  sourceDocumentIdentifier: text("source_document_identifier"),
  sourceDocumentHash: text("source_document_hash").notNull(),
  licenseStatus: text("license_status").default("unknown").notNull(),
  jurisdiction: text("jurisdiction"),
  region: text("region"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companySourceUnique: unique("price_sources_id_company_id_key").on(table.id, table.companyId),
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  sourceTypeCheck: check("price_sources_source_type_check", sql`${table.sourceType} in ('official_reference', 'supplier_quote', 'company_actual', 'index_adjusted', 'manual_override')`),
  licenseStatusCheck: check("price_sources_license_status_check", sql`${table.licenseStatus} in ('unknown', 'verified', 'restricted', 'not_applicable')`),
  sourceHashCheck: check("price_sources_source_document_hash_check", sql`length(${table.sourceDocumentHash}) >= 16`),
  sourceLookupIdx: index("idx_price_sources_lookup").on(table.companyId, table.sourceType, table.region),
}));

export const priceSnapshots = pgTable("price_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  priceSourceId: uuid("price_source_id").notNull(),
  snapshotKey: text("snapshot_key").notNull(),
  externalReference: text("external_reference"),
  positionCode: text("position_code"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  amount: numeric("amount", { precision: 20, scale: 4 }).notNull(),
  currency: currencyEnum("currency").default("TRY").notNull(),
  vatStatus: text("vat_status").default("unknown").notNull(),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }),
  freightStatus: text("freight_status").default("unknown").notNull(),
  region: text("region"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  sourceDocumentHash: text("source_document_hash").notNull(),
  sourceVersion: text("source_version"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  reviewStatus: text("review_status").default("advisory").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companySnapshotUnique: unique("price_snapshots_id_company_id_key").on(table.id, table.companyId),
  sourceFk: foreignKey({
    columns: [table.priceSourceId, table.companyId],
    foreignColumns: [priceSources.id, priceSources.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  snapshotKeyUnique: unique("price_snapshots_company_source_key").on(table.companyId, table.priceSourceId, table.snapshotKey),
  amountCheck: check("price_snapshots_amount_check", sql`${table.amount} >= 0`),
  confidenceCheck: check("price_snapshots_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  vatStatusCheck: check("price_snapshots_vat_status_check", sql`${table.vatStatus} in ('included', 'excluded', 'unknown')`),
  freightStatusCheck: check("price_snapshots_freight_status_check", sql`${table.freightStatus} in ('included', 'excluded', 'unknown')`),
  reviewStatusCheck: check("price_snapshots_review_status_check", sql`${table.reviewStatus} in ('draft', 'advisory', 'approved', 'rejected')`),
  validityCheck: check("price_snapshots_validity_check", sql`${table.validUntil} IS NULL OR ${table.validFrom} IS NULL OR ${table.validUntil} >= ${table.validFrom}`),
  sourceHashCheck: check("price_snapshots_source_document_hash_check", sql`length(${table.sourceDocumentHash}) >= 16`),
  snapshotLookupIdx: index("idx_price_snapshots_lookup").on(table.companyId, table.reviewStatus, table.validUntil),
}));

// ============================================================
// SMARTCHECK PHASE 4 — CONTROLLED OFFICIAL SOURCE INGESTION
// ============================================================

export const sourceIntelligenceAdapters = pgTable("source_intelligence_adapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  adapterKey: text("adapter_key").notNull(),
  sourceKind: text("source_kind").notNull(),
  displayName: text("display_name").notNull(),
  authority: text("authority").notNull(),
  sourceUrl: text("source_url").notNull(),
  allowedHost: text("allowed_host").notNull(),
  jurisdiction: text("jurisdiction").default("TR").notNull(),
  region: text("region"),
  cadence: text("cadence").default("manual").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  configurationJson: jsonb("configuration_json").$type<Record<string, unknown>>().default({}).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastSourceHash: text("last_source_hash"),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyAdapterUnique: unique("source_intelligence_adapters_id_company_id_key").on(table.id, table.companyId),
  adapterKeyUnique: unique("source_intelligence_adapters_company_key").on(table.companyId, table.adapterKey),
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  sourceKindCheck: check("source_intelligence_adapters_source_kind_check", sql`${table.sourceKind} in ('price', 'regulation', 'index')`),
  adapterKeyCheck: check("source_intelligence_adapters_adapter_key_check", sql`${table.adapterKey} in ('yfk', 'tuik', 'gib', 'resmi_gazete')`),
  cadenceCheck: check("source_intelligence_adapters_cadence_check", sql`${table.cadence} in ('manual', 'daily', 'weekly', 'monthly')`),
  idxLookup: index("idx_source_intelligence_adapters_lookup").on(table.companyId, table.enabled, table.sourceKind),
}));

export const sourceIngestionRuns = pgTable("source_ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  adapterId: uuid("adapter_id").notNull(),
  priceSourceId: uuid("price_source_id"),
  runKey: text("run_key").notNull(),
  sourceDocumentIdentifier: text("source_document_identifier").notNull(),
  sourceUrl: text("source_url").notNull(),
  status: text("status").default("queued").notNull(),
  sourceHash: text("source_hash"),
  previousSourceHash: text("previous_source_hash"),
  parserVersion: text("parser_version").notNull(),
  httpStatus: integer("http_status"),
  requestedByUserId: uuid("requested_by_user_id").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  diffSummaryJson: jsonb("diff_summary_json").$type<Record<string, unknown>>().default({}).notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyRunUnique: unique("source_ingestion_runs_id_company_id_key").on(table.id, table.companyId),
  runKeyUnique: unique("source_ingestion_runs_company_run_key").on(table.companyId, table.runKey),
  adapterFk: foreignKey({
    columns: [table.adapterId, table.companyId],
    foreignColumns: [sourceIntelligenceAdapters.id, sourceIntelligenceAdapters.companyId],
  }).onDelete("restrict"),
  priceSourceFk: foreignKey({
    columns: [table.priceSourceId, table.companyId],
    foreignColumns: [priceSources.id, priceSources.companyId],
  }).onDelete("restrict"),
  requesterFk: foreignKey({
    columns: [table.requestedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  statusCheck: check("source_ingestion_runs_status_check", sql`${table.status} in ('queued', 'fetching', 'quarantined', 'parsed', 'diffed', 'awaiting_review', 'approved', 'rejected', 'unchanged', 'failed')`),
  sourceHashCheck: check("source_ingestion_runs_source_hash_check", sql`${table.sourceHash} IS NULL OR length(${table.sourceHash}) >= 16`),
  idxLookup: index("idx_source_ingestion_runs_lookup").on(table.companyId, table.adapterId, table.status, table.createdAt),
}));

export const sourceIngestionArtifacts = pgTable("source_ingestion_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  ingestionRunId: uuid("ingestion_run_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyArtifactUnique: unique("source_ingestion_artifacts_id_company_id_key").on(table.id, table.companyId),
  runArtifactUnique: unique("source_ingestion_artifacts_run_type_key").on(table.companyId, table.ingestionRunId, table.artifactType),
  runFk: foreignKey({
    columns: [table.ingestionRunId, table.companyId],
    foreignColumns: [sourceIngestionRuns.id, sourceIngestionRuns.companyId],
  }).onDelete("cascade"),
  artifactTypeCheck: check("source_ingestion_artifacts_type_check", sql`${table.artifactType} in ('raw', 'normalized', 'diff', 'error')`),
  checksumCheck: check("source_ingestion_artifacts_checksum_check", sql`length(${table.checksumSha256}) >= 16`),
  sizeCheck: check("source_ingestion_artifacts_size_check", sql`${table.sizeBytes} >= 0`),
  idxLookup: index("idx_source_ingestion_artifacts_lookup").on(table.companyId, table.ingestionRunId, table.artifactType),
}));

export const sourceReviewItems = pgTable("source_review_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  ingestionRunId: uuid("ingestion_run_id").notNull(),
  artifactId: uuid("artifact_id"),
  priceSnapshotId: uuid("price_snapshot_id"),
  itemType: text("item_type").notNull(),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  proposedPayloadJson: jsonb("proposed_payload_json").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default("pending").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyReviewUnique: unique("source_review_items_id_company_id_key").on(table.id, table.companyId),
  runFk: foreignKey({
    columns: [table.ingestionRunId, table.companyId],
    foreignColumns: [sourceIngestionRuns.id, sourceIngestionRuns.companyId],
  }).onDelete("cascade"),
  artifactFk: foreignKey({
    columns: [table.artifactId, table.companyId],
    foreignColumns: [sourceIngestionArtifacts.id, sourceIngestionArtifacts.companyId],
  }).onDelete("restrict"),
  priceSnapshotFk: foreignKey({
    columns: [table.priceSnapshotId, table.companyId],
    foreignColumns: [priceSnapshots.id, priceSnapshots.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  itemTypeCheck: check("source_review_items_type_check", sql`${table.itemType} in ('price_snapshot', 'regulation_diff')`),
  statusCheck: check("source_review_items_status_check", sql`${table.status} in ('pending', 'approved', 'rejected')`),
  idxQueue: index("idx_source_review_items_queue").on(table.companyId, table.status, table.itemType, table.createdAt),
}));

// ============================================================
// SMARTCHECK PHASE 5 — ADVISORY REGULATION VERSIONS
// ============================================================

export const regulationVersions = pgTable("regulation_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  sourceReviewItemId: uuid("source_review_item_id").notNull(),
  ingestionRunId: uuid("ingestion_run_id").notNull(),
  versionKey: text("version_key").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  impactLevel: impactLevelEnum("impact_level").notNull(),
  authority: text("authority").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceDocumentIdentifier: text("source_document_identifier").notNull(),
  sourceDocumentHash: text("source_document_hash").notNull(),
  sourceVersion: text("source_version"),
  sourceText: text("source_text").notNull(),
  jurisdiction: text("jurisdiction").default("TR").notNull(),
  contractType: text("contract_type"),
  applicability: text("applicability"),
  exceptions: text("exceptions"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  governanceStatus: text("governance_status").default("advisory").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyVersionUnique: unique("regulation_versions_id_company_id_key").on(table.id, table.companyId),
  versionKeyUnique: unique("regulation_versions_company_key").on(table.companyId, table.versionKey),
  reviewItemFk: foreignKey({
    columns: [table.sourceReviewItemId, table.companyId],
    foreignColumns: [sourceReviewItems.id, sourceReviewItems.companyId],
  }).onDelete("restrict"),
  ingestionRunFk: foreignKey({
    columns: [table.ingestionRunId, table.companyId],
    foreignColumns: [sourceIngestionRuns.id, sourceIngestionRuns.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  categoryCheck: check("regulation_versions_category_check", sql`${table.category} in ('tax', 'labor', 'material', 'procurement', 'legal')`),
  statusCheck: check("regulation_versions_status_check", sql`${table.governanceStatus} in ('draft', 'advisory', 'approved', 'rejected')`),
  hashCheck: check("regulation_versions_source_hash_check", sql`length(${table.sourceDocumentHash}) >= 16`),
  validityCheck: check("regulation_versions_validity_check", sql`${table.effectiveUntil} IS NULL OR ${table.effectiveFrom} IS NULL OR ${table.effectiveUntil} >= ${table.effectiveFrom}`),
  idxLookup: index("idx_regulation_versions_lookup").on(table.companyId, table.governanceStatus, table.effectiveFrom),
}));

export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  quotationId: uuid("quotation_id").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 2 }).notNull(),
  costUnitPrice: numeric("cost_unit_price", { precision: 20, scale: 2 }),
  wastePercent: numeric("waste_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  costCategory: text("cost_category").default("material").notNull(),
  quantitySource: text("quantity_source").default("manual").notNull(),
  priceSource: text("price_source").default("manual").notNull(),
  sourceReference: text("source_reference"),
  verificationStatus: text("verification_status").default("unverified").notNull(),
  sourceDocumentId: uuid("source_document_id"),
  sourceProcessingRunId: uuid("source_processing_run_id"),
  sourceQuantityRowId: uuid("source_quantity_row_id"),
  sourceCellRange: text("source_cell_range"),
  sourceRuleVersion: text("source_rule_version"),
  transferIdempotencyKey: text("transfer_idempotency_key"),
  priceSnapshotId: uuid("price_snapshot_id"),
  priceSnapshotLockedAt: timestamp("price_snapshot_locked_at", { withTimezone: true }),
  priceSnapshotStatus: text("price_snapshot_status").default("none").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }).default("20").notNull(),
  total: numeric("total", { precision: 20, scale: 2 }).notNull(),
}, (table) => {
  return {
    companyItemUnique: unique("quotation_items_id_company_id_key").on(table.id, table.companyId),
    companyQuoteItemUnique: unique("quotation_items_id_quotation_id_company_id_key").on(table.id, table.quotationId, table.companyId),
    quotationFk: foreignKey({
      columns: [table.quotationId, table.companyId],
      foreignColumns: [quotations.id, quotations.companyId],
    }).onDelete("no action"),
    priceSnapshotFk: foreignKey({
      columns: [table.priceSnapshotId, table.companyId],
      foreignColumns: [priceSnapshots.id, priceSnapshots.companyId],
    }).onDelete("restrict"),
    transferIdempotencyUnique: uniqueIndex("quotation_items_transfer_idempotency_idx").on(table.companyId, table.quotationId, table.transferIdempotencyKey).where(sql`${table.transferIdempotencyKey} IS NOT NULL`),
  priceSnapshotStatusCheck: check("quotation_items_price_snapshot_status_check", sql`${table.priceSnapshotStatus} in ('none', 'attached', 'locked', 'stale', 'missing')`),
  };
});

export const quotationItemEvidence = pgTable("quotation_item_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  quotationId: uuid("quotation_id").notNull(),
  quotationItemId: uuid("quotation_item_id").notNull(),
  evidenceType: text("evidence_type").notNull(),
  evidenceKey: text("evidence_key").notNull(),
  priceSnapshotId: uuid("price_snapshot_id"),
  sourceDocumentId: uuid("source_document_id"),
  sourceProcessingRunId: uuid("source_processing_run_id"),
  sourceQuantityRowId: uuid("source_quantity_row_id"),
  sourceCellRange: text("source_cell_range"),
  sourceDocumentHash: text("source_document_hash"),
  capturedValueJson: jsonb("captured_value_json").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default("current").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyEvidenceUnique: unique("quotation_item_evidence_id_company_id_key").on(table.id, table.companyId),
  quotationFk: foreignKey({
    columns: [table.quotationId, table.companyId],
    foreignColumns: [quotations.id, quotations.companyId],
  }).onDelete("cascade"),
  quotationItemFk: foreignKey({
    columns: [table.quotationItemId, table.quotationId, table.companyId],
    foreignColumns: [quotationItems.id, quotationItems.quotationId, quotationItems.companyId],
  }).onDelete("cascade"),
  priceSnapshotFk: foreignKey({
    columns: [table.priceSnapshotId, table.companyId],
    foreignColumns: [priceSnapshots.id, priceSnapshots.companyId],
  }).onDelete("restrict"),
  documentFk: foreignKey({
    columns: [table.sourceDocumentId, table.companyId],
    foreignColumns: [documents.id, documents.companyId],
  }).onDelete("restrict"),
  processingRunFk: foreignKey({
    columns: [table.sourceProcessingRunId, table.sourceDocumentId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
  }).onDelete("restrict"),
  quantityRowFk: foreignKey({
    columns: [table.sourceQuantityRowId, table.companyId],
    foreignColumns: [normalizedQuantityRows.id, normalizedQuantityRows.companyId],
  }).onDelete("restrict"),
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  evidenceKeyUnique: unique("quotation_item_evidence_key_unique").on(table.companyId, table.quotationItemId, table.evidenceKey),
  evidenceTypeCheck: check("quotation_item_evidence_type_check", sql`${table.evidenceType} in ('quantity', 'price', 'rule', 'source')`),
  statusCheck: check("quotation_item_evidence_status_check", sql`${table.status} in ('current', 'stale', 'superseded')`),
  sourceHashCheck: check("quotation_item_evidence_source_hash_check", sql`${table.sourceDocumentHash} IS NULL OR length(${table.sourceDocumentHash}) >= 16`),
  evidenceLookupIdx: index("idx_quotation_item_evidence_lookup").on(table.companyId, table.quotationId, table.quotationItemId),
}));

export const regulationAlerts = pgTable("regulation_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  impactLevel: impactLevelEnum("impact_level").notNull(),
  summary: text("summary").notNull(),
  affectedModules: text("affected_modules").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  companyCreatedIdx: index("idx_regulation_alerts_company_created").on(table.companyId, table.createdAt),
}));

export const industries = pgTable("industries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configJson: text("config_json").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const companyIndustrySettings = pgTable("company_industry_settings", {
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  industryId: text("industry_id").references(() => industries.id).notNull(),
  preferredModel: text("preferred_model").default("balanced"),
  customRules: text("custom_rules"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.companyId, table.industryId] }),
  };
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  quotationId: uuid("quotation_id").references(() => quotations.id),
  name: text("name").notNull(),
  stage: pipelineStageEnum("stage").default("lead").notNull(),
  value: numeric("value", { precision: 20, scale: 2 }).default("0"),
  probability: numeric("probability", { precision: 5, scale: 2 }).default("0"),
  expectedCloseDate: timestamp("expected_close_date"),
  riskLevel: text("risk_level").default("low"),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  dealId: uuid("deal_id").references(() => deals.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const costComponents = pgTable("cost_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull().unique(),
  materialCost: numeric("material_cost", { precision: 20, scale: 2 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 20, scale: 2 }).default("0"),
  logisticsCost: numeric("logistics_cost", { precision: 20, scale: 2 }).default("0"),
  subcontractorCost: numeric("subcontractor_cost", { precision: 20, scale: 2 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 20, scale: 2 }).default("0"),
});

export const quotationFinancials = pgTable("quotation_financials", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull().unique(),
  totalCost: numeric("total_cost", { precision: 20, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 20, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 20, scale: 2 }).notNull(),
  margin: numeric("margin", { precision: 5, scale: 2 }).notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  riskLevel: text("risk_level").notNull(),
  costDataStatus: text("cost_data_status").default("incomplete").notNull(),
  currencyExposure: text("currency_exposure"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// SMARTCHECK PHASE 1
// ============================================================

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  uploadedByUserId: uuid("uploaded_by_user_id").notNull(),
  originalFileName: text("original_file_name").notNull(),
  displayName: text("display_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  importMappingJson: jsonb("import_mapping_json").$type<Record<string, string | number>>().default({}).notNull(),
  status: documentStatusEnum("status").default("uploaded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => {
  return {
    companyDocUnique: unique("documents_id_company_id_key").on(table.id, table.companyId),
    uploadedByFk: foreignKey({
      columns: [table.uploadedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxCompanyStatus: index("idx_documents_company_status").on(table.companyId, table.status),
    fileSizeCheck: check("documents_file_size_bytes_check", sql`${table.fileSizeBytes} > 0`),
    archiveConsistencyCheck: check(
      "documents_archive_consistency_check",
      sql`(${table.status} = 'archived' AND ${table.archivedAt} IS NOT NULL) OR (${table.status} != 'archived' AND ${table.archivedAt} IS NULL)`
    ),
  };
});

export const documentProcessingRuns = pgTable("document_processing_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  status: processingRunStatusEnum("status").default("queued").notNull(),
  currentStage: processingStageEnum("current_stage").default("queued").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  pipelineVersion: integer("pipeline_version").default(1).notNull(),
  provider: text("provider"),
  model: text("model"),
  progressPercent: integer("progress_percent").default(0).notNull(),
  progressMessage: text("progress_message"),
  quotaConsumed: boolean("quota_consumed").default(false).notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyRunUnique: unique("document_processing_runs_id_company_id_key").on(table.id, table.companyId),
    companyDocIdUnique: unique("document_processing_runs_id_document_id_company_id_key").on(table.id, table.documentId, table.companyId),
    companyIdempotencyUnique: unique("document_processing_runs_company_id_document_id_idem_key").on(table.companyId, table.documentId, table.idempotencyKey),
    documentFk: foreignKey({
      columns: [table.documentId, table.companyId],
      foreignColumns: [documents.id, documents.companyId],
    }).onDelete("no action"),
    idxRunsLookup: index("idx_processing_runs_lookup").on(table.companyId, table.documentId, table.status),
    pipelineVersionCheck: check("document_processing_runs_pipeline_version_check", sql`${table.pipelineVersion} > 0`),
    progressPercentCheck: check("document_processing_runs_progress_percent_check", sql`${table.progressPercent} >= 0 AND ${table.progressPercent} <= 100`),
  };
});

export const documentProcessingArtifacts = pgTable("document_processing_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  processingRunId: uuid("processing_run_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  storageKey: text("storage_key").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyArtifactUnique: unique("document_processing_artifacts_id_company_id_key").on(table.id, table.companyId),
  runArtifactUnique: unique("document_processing_artifacts_run_type_key").on(table.companyId, table.processingRunId, table.artifactType),
  runFk: foreignKey({
    columns: [table.processingRunId, table.documentId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
  }).onDelete("cascade"),
  sizeCheck: check("document_processing_artifacts_size_check", sql`${table.sizeBytes} >= 0`),
}));

export const normalizedQuantityRows = pgTable("normalized_quantity_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  processingRunId: uuid("processing_run_id").notNull(),
  sheetName: text("sheet_name").notNull(),
  sourceRowNumber: integer("source_row_number").notNull(),
  sourceCellRange: text("source_cell_range").notNull(),
  rawDescription: text("raw_description"),
  rawPositionCode: text("raw_position_code"),
  rawUnit: text("raw_unit"),
  rawQuantity: text("raw_quantity"),
  rawPrice: text("raw_price"),
  rawWastePercent: text("raw_waste_percent"),
  formulaJson: jsonb("formula_json").$type<Record<string, string>>().default({}).notNull(),
  normalizedDescription: text("normalized_description"),
  normalizedPositionCode: text("normalized_position_code"),
  normalizedUnit: text("normalized_unit"),
  normalizedQuantity: numeric("normalized_quantity", { precision: 20, scale: 4 }),
  normalizedPrice: numeric("normalized_price", { precision: 20, scale: 2 }),
  normalizedWastePercent: numeric("normalized_waste_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  quantitySource: text("quantity_source").default("document").notNull(),
  priceSource: text("price_source").default("document").notNull(),
  mappingConfidence: numeric("mapping_confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  reviewStatus: text("review_status").default("pending_review").notNull(),
  findingsJson: jsonb("findings_json").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  reviewerUserId: uuid("reviewer_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyRowUnique: unique("normalized_quantity_rows_id_company_id_key").on(table.id, table.companyId),
  sourceRowUnique: unique("normalized_quantity_rows_source_key").on(table.companyId, table.processingRunId, table.sheetName, table.sourceRowNumber),
  runFk: foreignKey({
    columns: [table.processingRunId, table.documentId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
  }).onDelete("cascade"),
  reviewerFk: foreignKey({
    columns: [table.reviewerUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  reviewStatusCheck: check("normalized_quantity_rows_review_status_check", sql`${table.reviewStatus} in ('pending_review', 'approved', 'accepted_exception', 'rejected')`),
  confidenceCheck: check("normalized_quantity_rows_confidence_check", sql`${table.mappingConfidence} >= 0 AND ${table.mappingConfidence} <= 1`),
}));

export const smartcheckAuditLogs = pgTable("smartcheck_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actorFk: foreignKey({
    columns: [table.userId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  idxAuditLookup: index("idx_smartcheck_audit_lookup").on(table.companyId, table.createdAt),
}));

// ============================================================
// SMARTCHECK PILOT EVIDENCE CONTROL
// ============================================================

export const smartcheckPilotCases = pgTable("smartcheck_pilot_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  pilotId: text("pilot_id").notNull(),
  customerReference: text("customer_reference").notNull(),
  projectReference: text("project_reference").notNull(),
  discipline: text("discipline").default("MEP").notNull(),
  permissionReference: text("permission_reference").notNull(),
  permissionGrantedAt: timestamp("permission_granted_at", { withTimezone: true }).notNull(),
  retentionUntil: timestamp("retention_until", { withTimezone: true }).notNull(),
  status: text("status").default("admitted").notNull(),
  expectedRowCount: integer("expected_row_count"),
  workflowStartedAt: timestamp("workflow_started_at", { withTimezone: true }).defaultNow().notNull(),
  workflowCompletedAt: timestamp("workflow_completed_at", { withTimezone: true }),
  reviewerUserId: uuid("reviewer_user_id"),
  reviewerRole: text("reviewer_role"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerDecision: text("reviewer_decision"),
  reviewerNotes: text("reviewer_notes"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyCaseUnique: unique("smartcheck_pilot_cases_id_company_id_key").on(table.id, table.companyId),
  pilotDocumentUnique: unique("smartcheck_pilot_cases_pilot_document_key").on(table.companyId, table.pilotId, table.documentId),
  documentFk: foreignKey({
    columns: [table.documentId, table.companyId],
    foreignColumns: [documents.id, documents.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewerUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  statusCheck: check("smartcheck_pilot_cases_status_check", sql`${table.status} in ('admitted', 'processing', 'review', 'completed', 'failed', 'rejected')`),
  expectedRowCountCheck: check("smartcheck_pilot_cases_expected_row_count_check", sql`${table.expectedRowCount} IS NULL OR ${table.expectedRowCount} >= 0`),
  retentionCheck: check("smartcheck_pilot_cases_retention_check", sql`${table.retentionUntil} >= ${table.permissionGrantedAt}`),
  reviewerDecisionCheck: check("smartcheck_pilot_cases_reviewer_decision_check", sql`${table.reviewerDecision} IS NULL OR ${table.reviewerDecision} in ('approved', 'rejected', 'accepted_exception')`),
  idxLookup: index("idx_smartcheck_pilot_cases_lookup").on(table.companyId, table.status, table.retentionUntil),
}));

export const smartcheckPilotMeasurements = pgTable("smartcheck_pilot_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  pilotCaseId: uuid("pilot_case_id").notNull(),
  processingRunId: uuid("processing_run_id"),
  measuredByUserId: uuid("measured_by_user_id").notNull(),
  measurementKey: text("measurement_key").notNull(),
  measuredAt: timestamp("measured_at", { withTimezone: true }).defaultNow().notNull(),
  totalRows: integer("total_rows").default(0).notNull(),
  parsedRows: integer("parsed_rows").default(0).notNull(),
  manuallyCorrectedRows: integer("manually_corrected_rows").default(0).notNull(),
  findingCount: integer("finding_count").default(0).notNull(),
  approvedRows: integer("approved_rows").default(0).notNull(),
  transferredRows: integer("transferred_rows").default(0).notNull(),
  provenanceCompleteRows: integer("provenance_complete_rows").default(0).notNull(),
  processingDurationSeconds: integer("processing_duration_seconds"),
  workflowDurationSeconds: integer("workflow_duration_seconds"),
  parseRate: numeric("parse_rate", { precision: 5, scale: 4 }),
  manualReentryFreeRate: numeric("manual_reentry_free_rate", { precision: 5, scale: 4 }),
  provenanceCoverage: numeric("provenance_coverage", { precision: 5, scale: 4 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyMeasurementUnique: unique("smartcheck_pilot_measurements_id_company_id_key").on(table.id, table.companyId),
  measurementIdempotencyUnique: unique("smartcheck_pilot_measurements_case_key").on(table.companyId, table.pilotCaseId, table.measurementKey),
  caseFk: foreignKey({
    columns: [table.pilotCaseId, table.companyId],
    foreignColumns: [smartcheckPilotCases.id, smartcheckPilotCases.companyId],
  }).onDelete("cascade"),
  runFk: foreignKey({
    columns: [table.processingRunId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.companyId],
  }).onDelete("restrict"),
  measuredByFk: foreignKey({
    columns: [table.measuredByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  nonNegativeCheck: check("smartcheck_pilot_measurements_non_negative_check", sql`${table.totalRows} >= 0 AND ${table.parsedRows} >= 0 AND ${table.manuallyCorrectedRows} >= 0 AND ${table.findingCount} >= 0 AND ${table.approvedRows} >= 0 AND ${table.transferredRows} >= 0 AND ${table.provenanceCompleteRows} >= 0`),
  rateCheck: check("smartcheck_pilot_measurements_rate_check", sql`(${table.parseRate} IS NULL OR (${table.parseRate} >= 0 AND ${table.parseRate} <= 1)) AND (${table.manualReentryFreeRate} IS NULL OR (${table.manualReentryFreeRate} >= 0 AND ${table.manualReentryFreeRate} <= 1)) AND (${table.provenanceCoverage} IS NULL OR (${table.provenanceCoverage} >= 0 AND ${table.provenanceCoverage} <= 1))`),
  durationCheck: check("smartcheck_pilot_measurements_duration_check", sql`(${table.processingDurationSeconds} IS NULL OR ${table.processingDurationSeconds} >= 0) AND (${table.workflowDurationSeconds} IS NULL OR ${table.workflowDurationSeconds} >= 0)`),
  idxLookup: index("idx_smartcheck_pilot_measurements_lookup").on(table.companyId, table.pilotCaseId, table.measuredAt),
}));

// ============================================================
// SMARTCHECK PHASE 6 — SUPPLIER QUOTE MARKET INTELLIGENCE
// ============================================================

export const supplierQuoteSubmissions = pgTable("supplier_quote_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id"),
  sourceDocumentHash: text("source_document_hash").notNull(),
  sourceDocumentIdentifier: text("source_document_identifier").notNull(),
  sourceUrl: text("source_url"),
  supplierName: text("supplier_name").notNull(),
  supplierContact: text("supplier_contact"),
  quoteNumber: text("quote_number"),
  quoteDate: timestamp("quote_date", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  currency: currencyEnum("currency").default("TRY").notNull(),
  region: text("region"),
  deliveryTerms: text("delivery_terms"),
  deliveryLocation: text("delivery_location"),
  vatStatus: text("vat_status").default("unknown").notNull(),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }),
  freightStatus: text("freight_status").default("unknown").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  status: text("status").default("awaiting_review").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companySubmissionUnique: unique("supplier_quote_submissions_id_company_id_key").on(table.id, table.companyId),
  documentFk: foreignKey({
    columns: [table.documentId, table.companyId],
    foreignColumns: [documents.id, documents.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  statusCheck: check("supplier_quote_submissions_status_check", sql`${table.status} in ('draft', 'awaiting_review', 'approved', 'rejected', 'expired')`),
  vatStatusCheck: check("supplier_quote_submissions_vat_status_check", sql`${table.vatStatus} in ('included', 'excluded', 'unknown')`),
  freightStatusCheck: check("supplier_quote_submissions_freight_status_check", sql`${table.freightStatus} in ('included', 'excluded', 'unknown')`),
  confidenceCheck: check("supplier_quote_submissions_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  hashCheck: check("supplier_quote_submissions_source_hash_check", sql`length(${table.sourceDocumentHash}) >= 16`),
  validityCheck: check("supplier_quote_submissions_validity_check", sql`${table.validUntil} IS NULL OR ${table.quoteDate} IS NULL OR ${table.validUntil} >= ${table.quoteDate}`),
  idxLookup: index("idx_supplier_quote_submissions_lookup").on(table.companyId, table.status, table.validUntil),
}));

export const supplierQuoteEntries = pgTable("supplier_quote_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  submissionId: uuid("submission_id").notNull(),
  sourceProcessingRunId: uuid("source_processing_run_id"),
  sourceQuantityRowId: uuid("source_quantity_row_id"),
  sourceRowKey: text("source_row_key").notNull(),
  positionCode: text("position_code"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 4 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 4 }).notNull(),
  currency: currencyEnum("currency").default("TRY").notNull(),
  vatStatus: text("vat_status").default("unknown").notNull(),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }),
  freightStatus: text("freight_status").default("unknown").notNull(),
  region: text("region"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  sourceCellRange: text("source_cell_range"),
  baselineCount: integer("baseline_count").default(0).notNull(),
  outlierStatus: text("outlier_status").default("insufficient_data").notNull(),
  outlierScore: numeric("outlier_score", { precision: 8, scale: 3 }),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0").notNull(),
  reviewStatus: text("review_status").default("pending").notNull(),
  reviewerUserId: uuid("reviewer_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  priceSnapshotId: uuid("price_snapshot_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyEntryUnique: unique("supplier_quote_entries_id_company_id_key").on(table.id, table.companyId),
  sourceRowUnique: unique("supplier_quote_entries_source_row_key").on(table.companyId, table.submissionId, table.sourceRowKey),
  submissionFk: foreignKey({
    columns: [table.submissionId, table.companyId],
    foreignColumns: [supplierQuoteSubmissions.id, supplierQuoteSubmissions.companyId],
  }).onDelete("cascade"),
  sourceRunFk: foreignKey({
    columns: [table.sourceProcessingRunId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.companyId],
  }).onDelete("restrict"),
  sourceRowFk: foreignKey({
    columns: [table.sourceQuantityRowId, table.companyId],
    foreignColumns: [normalizedQuantityRows.id, normalizedQuantityRows.companyId],
  }).onDelete("restrict"),
  reviewerFk: foreignKey({
    columns: [table.reviewerUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  priceSnapshotFk: foreignKey({
    columns: [table.priceSnapshotId, table.companyId],
    foreignColumns: [priceSnapshots.id, priceSnapshots.companyId],
  }).onDelete("restrict"),
  vatStatusCheck: check("supplier_quote_entries_vat_status_check", sql`${table.vatStatus} in ('included', 'excluded', 'unknown')`),
  freightStatusCheck: check("supplier_quote_entries_freight_status_check", sql`${table.freightStatus} in ('included', 'excluded', 'unknown')`),
  outlierStatusCheck: check("supplier_quote_entries_outlier_status_check", sql`${table.outlierStatus} in ('normal', 'outlier', 'insufficient_data', 'not_evaluated')`),
  reviewStatusCheck: check("supplier_quote_entries_review_status_check", sql`${table.reviewStatus} in ('pending', 'approved', 'rejected')`),
  quantityCheck: check("supplier_quote_entries_quantity_check", sql`${table.quantity} > 0`),
  unitPriceCheck: check("supplier_quote_entries_unit_price_check", sql`${table.unitPrice} >= 0`),
  baselineCountCheck: check("supplier_quote_entries_baseline_count_check", sql`${table.baselineCount} >= 0`),
  confidenceCheck: check("supplier_quote_entries_confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  validityCheck: check("supplier_quote_entries_validity_check", sql`${table.validUntil} IS NULL OR ${table.validFrom} IS NULL OR ${table.validUntil} >= ${table.validFrom}`),
  idxLookup: index("idx_supplier_quote_entries_lookup").on(table.companyId, table.submissionId, table.reviewStatus, table.outlierStatus),
}));

export const ruleCandidates = pgTable("rule_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  processingRunId: uuid("processing_run_id").notNull(),
  quotationId: uuid("quotation_id"),
  ruleCode: text("rule_code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  originalTextEvidence: text("original_text_evidence").notNull(),
  severity: severityEnum("severity").notNull(),
  errorCategory: errorCategoryEnum("error_category").notNull(),
  competencyArea: text("competency_area").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }).notNull(),
  sourceEvidenceJson: jsonb("source_evidence_json").$type<SourceEvidence>().notNull(),
  status: ruleCandidateStatusEnum("status").default("draft").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  rejectionReason: text("rejection_reason"),
  deferredUntil: timestamp("deferred_until", { withTimezone: true }),
  isSystemRule: boolean("is_system_rule").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyCandidateUnique: unique("rule_candidates_id_company_id_key").on(table.id, table.companyId),
    documentFk: foreignKey({
      columns: [table.documentId, table.companyId],
      foreignColumns: [documents.id, documents.companyId],
    }).onDelete("no action"),
    processingRunFk: foreignKey({
      columns: [table.processingRunId, table.documentId, table.companyId],
      foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
    }).onDelete("no action"),
    quotationFk: foreignKey({
      columns: [table.quotationId, table.companyId],
      foreignColumns: [quotations.id, quotations.companyId],
    }).onDelete("no action"),
    reviewerFk: foreignKey({
      columns: [table.reviewedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxCandidatesLookup: index("idx_rule_candidates_lookup").on(table.companyId, table.documentId, table.status),
    confidenceCheck: check("rule_candidates_confidence_check", sql`${table.confidenceScore} >= 0.00 AND ${table.confidenceScore} <= 1.00`),
  };
});

export const ruleRegistry = pgTable("rule_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  ruleCode: text("rule_code").notNull(),
  scope: ruleScopeEnum("scope").notNull(),
  quotationId: uuid("quotation_id"),
  status: ruleStatusEnum("status").default("draft").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  approvedByUserId: uuid("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deactivationReason: text("deactivation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyRuleUnique: unique("rule_registry_id_company_id_key").on(table.id, table.companyId),
    quotationFk: foreignKey({
      columns: [table.quotationId, table.companyId],
      foreignColumns: [quotations.id, quotations.companyId],
    }).onDelete("no action"),
    creatorFk: foreignKey({
      columns: [table.createdByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    approverFk: foreignKey({
      columns: [table.approvedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxRuleLookup: index("idx_rule_registry_lookup").on(table.companyId, table.status),
    currentVersionCheck: check("rule_registry_current_version_check", sql`${table.currentVersion} > 0`),
    scopeConsistencyCheck: check(
      "rule_registry_scope_consistency_check",
      sql`(${table.scope} = 'quotation' AND ${table.quotationId} IS NOT NULL) OR (${table.scope} = 'company' AND ${table.quotationId} IS NULL)`
    ),
  };
});

export const ruleVersions = pgTable("rule_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  ruleId: uuid("rule_id").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: severityEnum("severity").notNull(),
  errorCategory: errorCategoryEnum("error_category").notNull(),
  competencyArea: text("competency_area").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  canonicalStatement: text("canonical_statement").notNull(),
  structuredConditionJson: jsonb("structured_condition_json").$type<StructuredCondition>().notNull(),
  sourceEvidenceJson: jsonb("source_evidence_json").$type<SourceEvidence[]>().notNull(),
  sourceCandidateId: uuid("source_candidate_id"),
  changeLog: text("change_log"),
  governanceStatus: text("governance_status").default("draft").notNull(),
  jurisdiction: text("jurisdiction"),
  contractType: text("contract_type"),
  officialAuthority: text("official_authority"),
  sourceDocumentIdentifier: text("source_document_identifier"),
  sourceDocumentHash: text("source_document_hash"),
  standardVersion: text("standard_version"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  unitPolicyJson: jsonb("unit_policy_json").$type<Record<string, unknown>>().default({}).notNull(),
  roundingPolicyJson: jsonb("rounding_policy_json").$type<Record<string, unknown>>().default({}).notNull(),
  applicability: text("applicability"),
  exceptions: text("exceptions"),
  technicalReviewerUserId: uuid("technical_reviewer_user_id"),
  technicalApprovedAt: timestamp("technical_approved_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyRuleVersionUnique: unique("rule_versions_company_id_rule_id_version_key").on(table.companyId, table.ruleId, table.version),
    ruleFk: foreignKey({
      columns: [table.ruleId, table.companyId],
      foreignColumns: [ruleRegistry.id, ruleRegistry.companyId],
    }).onDelete("restrict"),
    candidateFk: foreignKey({
      columns: [table.sourceCandidateId, table.companyId],
      foreignColumns: [ruleCandidates.id, ruleCandidates.companyId],
    }).onDelete("no action"),
    creatorFk: foreignKey({
      columns: [table.createdByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    technicalReviewerFk: foreignKey({
      columns: [table.technicalReviewerUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxRuleVersionsLookup: index("idx_rule_versions_lookup").on(table.companyId, table.ruleId, table.version),
    candidateUniqueIndex: uniqueIndex("rule_versions_unique_candidate_idx")
      .on(table.companyId, table.sourceCandidateId)
      .where(sql`${table.sourceCandidateId} IS NOT NULL`),
    versionCheck: check("rule_versions_version_check", sql`${table.version} > 0`),
    governanceStatusCheck: check("rule_versions_governance_status_check", sql`${table.governanceStatus} in ('draft', 'advisory', 'approved')`),
  };
});

export const reviewSessions = pgTable("review_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  quotationId: uuid("quotation_id").notNull(),
  status: reviewSessionStatusEnum("status").default("draft").notNull(),
  assignedToUserId: uuid("assigned_to_user_id"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  totalFindingsCount: integer("total_findings_count").default(0).notNull(),
  openFindingsCount: integer("open_findings_count").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companySessionUnique: unique("review_sessions_id_company_id_key").on(table.id, table.companyId),
    companyQuoteSessionUnique: unique("review_sessions_id_quotation_id_company_id_key").on(table.id, table.quotationId, table.companyId),
    quotationFk: foreignKey({
      columns: [table.quotationId, table.companyId],
      foreignColumns: [quotations.id, quotations.companyId],
    }).onDelete("no action"),
    assigneeFk: foreignKey({
      columns: [table.assignedToUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    creatorFk: foreignKey({
      columns: [table.createdByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxReviewSessions: index("idx_review_sessions_lookup").on(table.companyId, table.quotationId, table.status),
    idxReviewSessionsAssignee: index("idx_review_sessions_assignee").on(table.companyId, table.assignedToUserId, table.status),
    totalFindingsCheck: check("review_sessions_total_findings_check", sql`${table.totalFindingsCount} >= 0`),
    openFindingsCheck: check("review_sessions_open_findings_check", sql`${table.openFindingsCount} >= 0`),
  };
});

export const reviewFindings = pgTable("review_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  reviewSessionId: uuid("review_session_id").notNull(),
  quotationId: uuid("quotation_id").notNull(),
  quotationItemId: uuid("quotation_item_id").notNull(),
  ruleId: uuid("rule_id"),
  reportedByUserId: uuid("reported_by_user_id").notNull(),
  errorCategory: errorCategoryEnum("error_category").notNull(),
  severity: severityEnum("severity").notNull(),
  details: text("details").notNull(),
  originalValue: text("original_value").notNull(),
  correctedValue: text("corrected_value"),
  status: findingStatusEnum("status").default("open").notNull(),
  resolvedByUserId: uuid("resolved_by_user_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyFindingUnique: unique("review_findings_id_company_id_key").on(table.id, table.companyId),
    sessionFk: foreignKey({
      columns: [table.reviewSessionId, table.quotationId, table.companyId],
      foreignColumns: [reviewSessions.id, reviewSessions.quotationId, reviewSessions.companyId],
    }).onDelete("no action"),
    quotationItemFk: foreignKey({
      columns: [table.quotationItemId, table.quotationId, table.companyId],
      foreignColumns: [quotationItems.id, quotationItems.quotationId, quotationItems.companyId],
    }).onDelete("no action"),
    ruleFk: foreignKey({
      columns: [table.ruleId, table.companyId],
      foreignColumns: [ruleRegistry.id, ruleRegistry.companyId],
    }).onDelete("no action"),
    reporterFk: foreignKey({
      columns: [table.reportedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    resolverFk: foreignKey({
      columns: [table.resolvedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxFindingsLookup: index("idx_review_findings_lookup").on(table.companyId, table.reviewSessionId),
  };
});

export const competencySignals = pgTable("competency_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").notNull(),
  ruleId: uuid("rule_id"),
  errorCategory: errorCategoryEnum("error_category").notNull(),
  competencyArea: text("competency_area").notNull(),
  evidenceCount: integer("evidence_count").default(1).notNull(),
  distinctQuotationCount: integer("distinct_quotation_count").default(1).notNull(),
  distinctReviewRoundCount: integer("distinct_review_round_count").default(1).notNull(),
  signalFingerprint: text("signal_fingerprint").notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).defaultNow().notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).defaultNow().notNull(),
  status: competencySignalStatusEnum("status").default("observing").notNull(),
  managerReviewedByUserId: uuid("manager_reviewed_by_user_id"),
  managerReviewedAt: timestamp("manager_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companySignalUnique: unique("competency_signals_id_company_id_key").on(table.id, table.companyId),
    companyUserSignalUnique: unique("competency_signals_id_user_id_company_id_key").on(table.id, table.userId, table.companyId),
    fingerprintUnique: unique("competency_signals_fingerprint_key").on(table.companyId, table.userId, table.signalFingerprint),
    ruleFk: foreignKey({
      columns: [table.ruleId, table.companyId],
      foreignColumns: [ruleRegistry.id, ruleRegistry.companyId],
    }).onDelete("no action"),
    userFk: foreignKey({
      columns: [table.userId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    managerFk: foreignKey({
      columns: [table.managerReviewedByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxSignalsUser: index("idx_competency_signals_user").on(table.companyId, table.userId, table.status),
    evidenceCountCheck: check("competency_signals_evidence_count_check", sql`${table.evidenceCount} >= 0`),
    distinctQuotationCheck: check("competency_signals_distinct_quotation_count_check", sql`${table.distinctQuotationCount} >= 0`),
    distinctReviewRoundCheck: check("competency_signals_distinct_review_round_count_check", sql`${table.distinctReviewRoundCount} >= 0`),
  };
});

export const competencySignalEvidence = pgTable("competency_signal_evidence", {
  companyId: uuid("company_id").notNull(),
  competencySignalId: uuid("competency_signal_id").notNull(),
  reviewFindingId: uuid("review_finding_id").notNull(),
  observedUserId: uuid("observed_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.companyId, table.competencySignalId, table.reviewFindingId] }),
    signalUserFk: foreignKey({
      columns: [table.competencySignalId, table.observedUserId, table.companyId],
      foreignColumns: [competencySignals.id, competencySignals.userId, competencySignals.companyId],
    }).onDelete("restrict"),
    findingFk: foreignKey({
      columns: [table.reviewFindingId, table.companyId],
      foreignColumns: [reviewFindings.id, reviewFindings.companyId],
    }).onDelete("restrict"),
  };
});

export const assistanceResources = pgTable("assistance_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  title: text("title").notNull(),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  estimatedDurationSeconds: integer("estimated_duration_seconds").default(180).notNull(),
  errorCategory: errorCategoryEnum("error_category").notNull(),
  competencyArea: text("competency_area").notNull(),
  contentBody: text("content_body"),
  externalUrl: text("external_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    companyResourceUnique: unique("assistance_resources_id_company_id_key").on(table.id, table.companyId),
    creatorFk: foreignKey({
      columns: [table.createdByUserId, table.companyId],
      foreignColumns: [memberships.userId, memberships.companyId],
    }).onDelete("restrict"),
    idxResourcesActive: index("idx_assistance_resources_active").on(table.companyId, table.isActive),
    durationCheck: check("assistance_resources_estimated_duration_seconds_check", sql`${table.estimatedDurationSeconds} >= 0`),
    contentOrUrlCheck: check("assistance_resources_content_or_url_check", sql`${table.contentBody} IS NOT NULL OR ${table.externalUrl} IS NOT NULL`),
  };
});

export const ruleAssistanceResources = pgTable("rule_assistance_resources", {
  ruleId: uuid("rule_id").notNull(),
  assistanceResourceId: uuid("assistance_resource_id").notNull(),
  companyId: uuid("company_id").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.ruleId, table.assistanceResourceId, table.companyId] }),
    ruleFk: foreignKey({
      columns: [table.ruleId, table.companyId],
      foreignColumns: [ruleRegistry.id, ruleRegistry.companyId],
    }).onDelete("cascade"),
    resourceFk: foreignKey({
      columns: [table.assistanceResourceId, table.companyId],
      foreignColumns: [assistanceResources.id, assistanceResources.companyId],
    }).onDelete("cascade"),
  };
});

export const allplanLessonProgress = pgTable("allplan_lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  checkpointCompletedAt: timestamp("checkpoint_completed_at", { withTimezone: true }),
  checkpointEvidence: jsonb("checkpoint_evidence").$type<Record<string, unknown>>(),
  checkpointVersion: text("checkpoint_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyProgressUnique: unique("allplan_lesson_progress_id_company_id_key").on(table.id, table.companyId),
  userCompanyLessonUnique: unique("allplan_lesson_progress_user_company_lesson_key").on(table.userId, table.companyId, table.lessonSlug),
  membershipFk: foreignKey({
    columns: [table.userId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("cascade"),
  lessonSlugCheck: check("allplan_lesson_progress_lesson_slug_check", sql`length(${table.lessonSlug}) between 1 and 180`),
  idxUserProgress: index("idx_allplan_lesson_progress_user").on(table.companyId, table.userId, table.updatedAt),
}));

export const allplanLessonActivity = pgTable("allplan_lesson_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  activeSeconds: integer("active_seconds").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyActivityUnique: unique("allplan_lesson_activity_id_company_id_key").on(table.id, table.companyId),
  userCompanyLessonUnique: unique("allplan_lesson_activity_user_company_lesson_key").on(table.userId, table.companyId, table.lessonSlug),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  lessonSlugCheck: check("allplan_lesson_activity_lesson_slug_check", sql`length(${table.lessonSlug}) between 1 and 180`),
  secondsCheck: check("allplan_lesson_activity_seconds_check", sql`${table.activeSeconds} >= 0`),
  idxUserActivity: index("idx_allplan_lesson_activity_user").on(table.companyId, table.userId, table.updatedAt),
}));

export const allplanLessonNotes = pgTable("allplan_lesson_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyNoteUnique: unique("allplan_lesson_notes_id_company_id_key").on(table.id, table.companyId),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  lessonSlugCheck: check("allplan_lesson_notes_lesson_slug_check", sql`length(${table.lessonSlug}) between 1 and 180`),
  bodyCheck: check("allplan_lesson_notes_body_check", sql`length(${table.body}) between 1 and 5000`),
  idxUserNotes: index("idx_allplan_lesson_notes_user_lesson").on(table.companyId, table.userId, table.lessonSlug, table.createdAt),
}));

export const allplanLessonBookmarks = pgTable("allplan_lesson_bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyBookmarkUnique: unique("allplan_lesson_bookmarks_id_company_id_key").on(table.id, table.companyId),
  userCompanyLessonUnique: unique("allplan_lesson_bookmarks_user_company_lesson_key").on(table.userId, table.companyId, table.lessonSlug),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  lessonSlugCheck: check("allplan_lesson_bookmarks_lesson_slug_check", sql`length(${table.lessonSlug}) between 1 and 180`),
  idxUserBookmarks: index("idx_allplan_lesson_bookmarks_user").on(table.companyId, table.userId, table.createdAt),
}));

export const allplanCheckpointAttempts = pgTable("allplan_checkpoint_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  tool: text("tool").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
  passed: boolean("passed").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  lessonSlugCheck: check("allplan_checkpoint_attempts_lesson_slug_check", sql`length(${table.lessonSlug}) between 1 and 180`),
  toolCheck: check("allplan_checkpoint_attempts_tool_check", sql`${table.tool} in ('wall-simulator', 'coordinate-calculator', 'shortcut-trainer', 'reinforcement-estimator')`),
  idxCheckpointAttempts: index("idx_allplan_checkpoint_attempts_user_lesson").on(table.companyId, table.userId, table.lessonSlug, table.attemptedAt),
}));

export const allplanExamAttempts = pgTable("allplan_exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  programVersion: text("program_version").notNull(),
  answers: jsonb("answers").$type<number[]>().notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyAttemptUnique: unique("allplan_exam_attempts_id_company_id_key").on(table.id, table.companyId),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  scoreCheck: check("allplan_exam_attempts_score_check", sql`${table.score} between 0 and 100`),
  idxUserAttempts: index("idx_allplan_exam_attempts_user").on(table.companyId, table.userId, table.completedAt),
}));

export const allplanCertificates = pgTable("allplan_certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  certificateNumber: text("certificate_number").notNull().unique(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  examAttemptId: uuid("exam_attempt_id").notNull(),
  programVersion: text("program_version").notNull(),
  holderName: text("holder_name").notNull(),
  companyName: text("company_name").notNull(),
  status: text("status").default("active").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
}, (table) => ({
  companyCertificateUnique: unique("allplan_certificates_id_company_id_key").on(table.id, table.companyId),
  examAttemptFk: foreignKey({ columns: [table.examAttemptId, table.companyId], foreignColumns: [allplanExamAttempts.id, allplanExamAttempts.companyId] }).onDelete("restrict"),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  userProgramUnique: unique("allplan_certificates_user_company_program_key").on(table.userId, table.companyId, table.programVersion),
  statusCheck: check("allplan_certificates_status_check", sql`${table.status} in ('active', 'revoked', 'expired')`),
  idxCertificateNumber: index("idx_allplan_certificates_number").on(table.certificateNumber),
}));

export const allplanCertificateAuditLogs = pgTable("allplan_certificate_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  certificateId: uuid("certificate_id").notNull(),
  companyId: uuid("company_id").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  certificateFk: foreignKey({ columns: [table.certificateId, table.companyId], foreignColumns: [allplanCertificates.id, allplanCertificates.companyId] }).onDelete("cascade"),
  actorMembershipFk: foreignKey({ columns: [table.actorUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  actionCheck: check("allplan_certificate_audit_logs_action_check", sql`${table.action} in ('issued', 'revoked')`),
  idxCertificateAudit: index("idx_allplan_certificate_audit").on(table.certificateId, table.createdAt),
}));

export const academyProducts = pgTable("academy_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const academyEditions = pgTable("academy_editions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => academyProducts.id, { onDelete: "restrict" }).notNull(),
  version: text("version").notNull(),
  name: text("name").notNull(),
  accessMode: text("access_mode").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productVersionUnique: unique("academy_editions_product_version_key").on(table.productId, table.version),
  accessModeCheck: check("academy_editions_access_mode_check", sql`${table.accessMode} in ('free_pilot', 'invited', 'paid')`),
}));

export const academyEnrollments = pgTable("academy_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id").references(() => academyEditions.id, { onDelete: "restrict" }).notNull(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  status: text("status").default("active").notNull(),
  source: text("source").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyEnrollmentUnique: unique("academy_enrollments_id_company_id_key").on(table.id, table.companyId),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  userCompanyEditionUnique: unique("academy_enrollments_user_company_edition_key").on(table.userId, table.companyId, table.editionId),
  statusCheck: check("academy_enrollments_status_check", sql`${table.status} in ('active', 'expired', 'refunded', 'revoked')`),
  sourceCheck: check("academy_enrollments_source_check", sql`${table.source} in ('pilot', 'invite', 'purchase', 'admin')`),
  idxEnrollmentAccess: index("idx_academy_enrollments_access").on(table.companyId, table.userId, table.status, table.endsAt),
}));

export const academyLearnerProfiles = pgTable("academy_learner_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  selectedLessonSlug: text("selected_lesson_slug"),
  termsVersion: text("terms_version").notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  privacyVersion: text("privacy_version").notNull(),
  privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }).notNull(),
  marketingConsent: boolean("marketing_consent").default(false).notNull(),
  marketingConsentVersion: text("marketing_consent_version"),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  acquisitionId: text("acquisition_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  idxLearnerCompany: index("idx_academy_learner_profiles_company").on(table.companyId, table.createdAt),
}));

export const academyActivationEvents = pgTable("academy_activation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  eventType: text("event_type").notNull(),
  lessonSlug: text("lesson_slug"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("cascade"),
  eventTypeCheck: check("academy_activation_events_type_check", sql`${table.eventType} in ('registration_completed', 'first_lesson_opened', 'second_lesson_opened', 'learner_active_day', 'structural_early_access_requested')`),
  idxActivationFunnel: index("idx_academy_activation_events_funnel").on(table.eventType, table.occurredAt),
  idxActivationUser: index("idx_academy_activation_events_user").on(table.companyId, table.userId, table.occurredAt),
}));

export const academyAcquisitionEvents = pgTable("academy_acquisition_events", {
  acquisitionId: text("acquisition_id").primaryKey(),
  landingPath: text("landing_path").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  registeredUserId: uuid("registered_user_id").references(() => users.id, { onDelete: "set null" }),
  registeredAt: timestamp("registered_at", { withTimezone: true }),
}, (table) => ({
  idxAcquisitionRegistered: index("idx_academy_acquisition_registered").on(table.registeredAt),
}));

export const academyEnrollmentAuditLogs = pgTable("academy_enrollment_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id").notNull(),
  companyId: uuid("company_id").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  enrollmentFk: foreignKey({ columns: [table.enrollmentId, table.companyId], foreignColumns: [academyEnrollments.id, academyEnrollments.companyId] }).onDelete("cascade"),
  actorMembershipFk: foreignKey({ columns: [table.actorUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  actionCheck: check("academy_enrollment_audit_logs_action_check", sql`${table.action} in ('granted', 'extended', 'revoked', 'refunded', 'reactivated')`),
  idxEnrollmentAudit: index("idx_academy_enrollment_audit").on(table.enrollmentId, table.createdAt),
}));

export const academyPaymentEvents = pgTable("academy_payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  companyId: uuid("company_id").notNull(),
  userId: uuid("user_id").notNull(),
  enrollmentId: uuid("enrollment_id"),
  paymentReference: text("payment_reference").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerEventUnique: unique("academy_payment_events_provider_event_key").on(table.provider, table.eventId),
  providerReferenceTypeUnique: unique("academy_payment_events_provider_reference_type_key").on(table.provider, table.paymentReference, table.eventType),
  membershipFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  enrollmentFk: foreignKey({ columns: [table.enrollmentId, table.companyId], foreignColumns: [academyEnrollments.id, academyEnrollments.companyId] }).onDelete("restrict"),
  eventTypeCheck: check("academy_payment_events_type_check", sql`${table.eventType} in ('academy.purchase.completed', 'academy.purchase.refunded')`),
  idxPaymentReference: index("idx_academy_payment_events_reference").on(table.provider, table.paymentReference),
}));

export const usageRecords = pgTable("usage_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  period: text("period").notNull(), // Format: YYYY-MM or YYYY-MM-DD
  quoteCount: integer("quote_count").default(0).notNull(),
  ifcCount: integer("ifc_count").default(0).notNull(),
}, (table) => ({
  companyPeriodUnique: unique("usage_records_company_id_period_key").on(table.companyId, table.period),
  quoteCountNonnegative: check("usage_records_quote_count_nonnegative", sql`${table.quoteCount} >= 0`),
}));


export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").references(() => users.id).notNull(),
  targetCompanyId: uuid("target_company_id").references(() => companies.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pricingDataSources = pgTable("pricing_data_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  authority: text("authority"),
  category: text("category").notNull(),
  sourceUrl: text("source_url"),
  countryCode: text("country_code").default("TR").notNull(),
  currency: text("currency").default("TRY").notNull(),
  status: text("status").default("active").notNull(),
  syncFrequency: text("sync_frequency").default("monthly").notNull(),
  itemCount: integer("item_count").default(0).notNull(),
  validityStart: timestamp("validity_start", { withTimezone: true }),
  validityEnd: timestamp("validity_end", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  versionTag: text("version_tag").default("2026/1").notNull(),
  dataHash: text("data_hash"),
  crawlerConfig: jsonb("crawler_config").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryCheck: check("pricing_data_sources_category_check", sql`${table.category} in ('official_gazette', 'tuik_index', 'market_commodity', 'epys_standard')`),
  statusCheck: check("pricing_data_sources_status_check", sql`${table.status} in ('active', 'syncing', 'error', 'stale')`),
  syncFreqCheck: check("pricing_data_sources_sync_freq_check", sql`${table.syncFrequency} in ('realtime', 'daily', 'weekly', 'monthly', 'annually')`),
  categoryIdx: index("idx_pricing_data_sources_category").on(table.category),
}));

export const priceFeedStaging = pgTable("price_feed_staging", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => pricingDataSources.id, { onDelete: "cascade" }).notNull(),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull(),
  currentPrice: numeric("current_price", { precision: 20, scale: 2 }),
  crawledPrice: numeric("crawled_price", { precision: 20, scale: 2 }).notNull(),
  diffPercent: numeric("diff_percent", { precision: 6, scale: 2 }),
  sourceUrl: text("source_url"),
  status: text("status").default("pending").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }).default("0.90").notNull(),
  notes: text("notes"),
  crawledAt: timestamp("crawled_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
}, (table) => ({
  statusCheck: check("price_feed_staging_status_check", sql`${table.status} in ('pending', 'approved', 'rejected')`),
  statusIdx: index("idx_price_feed_staging_status").on(table.status),
}));

