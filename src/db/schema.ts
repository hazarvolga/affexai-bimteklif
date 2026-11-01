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
  unique,
  pgPolicy,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { SourceEvidence } from "../smartcheck/schemas/source-evidence.schema";
import type { StructuredCondition } from "../smartcheck/schemas/structured-condition.schema";

const appTenantPolicy = (name: string, companyId: AnyPgColumn) => {
  const tenantMatch = sql`${companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
  return pgPolicy(`${name}_app_tenant`, {
    for: "all",
    to: "public",
    using: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
    withCheck: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
  });
};

const backupReadPolicy = (name: string) => pgPolicy(`${name}_backup_read`, {
  for: "select",
  to: "public",
  using: sql`current_user = 'bimmetraj_backup'`,
});

const ownerMigrationPolicy = (name: string) => {
  const migratorOwner = sql`session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner'`;
  return pgPolicy(`${name}_owner_migration`, {
    for: "all",
    to: "public",
    using: migratorOwner,
    withCheck: migratorOwner,
  });
};

const controlAccessPolicy = (name: string) => pgPolicy(`${name}_control_access`, {
  for: "all",
  to: "public",
  using: sql`current_user = 'bimmetraj_control'`,
  withCheck: sql`current_user = 'bimmetraj_control'`,
});

const controlReadPolicy = (name: string) => pgPolicy(`${name}_control_access`, {
  for: "select",
  to: "public",
  using: sql`current_user = 'bimmetraj_control'`,
});

const controlInsertPolicy = (name: string) => pgPolicy(`${name}_control_insert`, {
  for: "insert",
  to: "public",
  withCheck: sql`current_user = 'bimmetraj_control'`,
});

const controlDeletePolicy = (name: string) => pgPolicy(`${name}_control_delete`, {
  for: "delete",
  to: "public",
  using: sql`current_user = 'bimmetraj_control'`,
});

const appTenantReadPolicy = (name: string, companyId: AnyPgColumn) => {
  const tenantMatch = sql`${companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
  return pgPolicy(`${name}_app_tenant_read`, {
    for: "select",
    to: "public",
    using: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
  });
};

const appTenantInsertPolicy = (name: string, companyId: AnyPgColumn) => {
  const tenantMatch = sql`${companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
  return pgPolicy(`${name}_app_tenant_insert`, {
    for: "insert",
    to: "public",
    withCheck: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
  });
};

const appTenantUpdatePolicy = (name: string, companyId: AnyPgColumn) => {
  const tenantMatch = sql`${companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
  return pgPolicy(`${name}_app_tenant_update`, {
    for: "update",
    to: "public",
    using: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
    withCheck: sql`current_user = 'bimmetraj_app' AND ${tenantMatch}`,
  });
};

const appCatalogReadPolicy = (name: string) => pgPolicy(`${name}_app_read`, {
  for: "select",
  to: "public",
  using: sql`current_user = 'bimmetraj_app'`,
});

const workerAccessPolicy = (name: string) => pgPolicy(`${name}_worker_access`, {
  for: "all",
  to: "public",
  using: sql`current_user = 'bimmetraj_worker'`,
  withCheck: sql`current_user = 'bimmetraj_worker'`,
});

const appSuperAdminQueueReadPolicy = (name: string) => pgPolicy(`${name}_app_super_admin_read`, {
  for: "select",
  to: "public",
  using: sql`current_user = 'bimmetraj_app' AND nullif(current_setting('bimmetraj.super_admin_user_id', true), '')::uuid IS NOT NULL`,
});

/** Lets only the tenant deletion capability, entered from a control session, clear this table. */
const adminDeletionCapabilityPolicy = (name: string) => pgPolicy(`${name}_admin_deletion_capability`, {
  for: "all",
  to: "public",
  using: sql`session_user = 'bimmetraj_control' AND current_user = 'bimmetraj_owner'`,
  withCheck: sql`false`,
});

const workerCapabilityReadPolicy = (name: string) => pgPolicy(`${name}_worker_capability_read`, {
  for: "select",
  to: "public",
  using: sql`session_user = 'bimmetraj_worker' AND current_user = 'bimmetraj_owner'`,
});

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
  mfaEpoch: uuid("mfa_epoch"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminMfaAccounts = pgTable("admin_mfa_accounts", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  secretCiphertext: text("secret_ciphertext"),
  pendingCiphertext: text("pending_ciphertext"),
  pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
  pendingRecoveryHashes: jsonb("pending_recovery_hashes").$type<string[]>(),
  pendingPasswordFingerprint: text("pending_password_fingerprint"),
  lastCounter: integer("last_counter").default(-1).notNull(),
  recoveryHashes: jsonb("recovery_hashes").$type<string[]>().default([]).notNull(),
});

export const adminMfaChallenges = pgTable("admin_mfa_challenges", {
  challengeHash: text("challenge_hash").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  passwordFingerprint: text("password_fingerprint").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ expiresAtIdx: index("admin_mfa_challenges_expires_at_idx").on(table.expiresAt) }));

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

export const revokedSessions = pgTable("revoked_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ expiresAtIdx: index("revoked_sessions_expires_at_idx").on(table.expiresAt) }));

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
  appTenantReadPolicy: appTenantReadPolicy("companies", table.id),
  controlAccessPolicy: controlAccessPolicy("companies"),
  backupReadPolicy: backupReadPolicy("companies"),
  ownerMigrationPolicy: ownerMigrationPolicy("companies"),
  workerCapabilityReadPolicy: workerCapabilityReadPolicy("companies"),
})).enableRLS();

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
  // Per-package feature limits. NULL means "not yet configured": the feature is unavailable
  // on this plan until the catalog bootstrap or an admin fills the column.
  monthlyAiLimit: integer("monthly_ai_limit"),
  monthlyPdfLimit: integer("monthly_pdf_limit"),
  monthlyCrmLimit: integer("monthly_crm_limit"),
  monthlyRegulationLimit: integer("monthly_regulation_limit"),
  monthlyProfitAnalysisLimit: integer("monthly_profit_analysis_limit"),
  storageMaxBytes: bigint("storage_max_bytes", { mode: "number" }),
  maxDocuments: integer("max_documents"),
  isTrial: boolean("is_trial").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  monthlyQuoteLimitNonnegative: check("plans_monthly_quote_limit_nonnegative", sql`${table.monthlyQuoteLimit} >= 0`),
  monthlyPriceNonnegative: check("plans_monthly_price_nonnegative", sql`${table.monthlyPrice} >= 0`),
  featureLimitsNonnegative: check("plans_feature_limits_nonnegative", sql`coalesce(${table.monthlyAiLimit}, 0) >= 0 AND coalesce(${table.monthlyPdfLimit}, 0) >= 0 AND coalesce(${table.monthlyCrmLimit}, 0) >= 0 AND coalesce(${table.monthlyRegulationLimit}, 0) >= 0 AND coalesce(${table.monthlyProfitAnalysisLimit}, 0) >= 0 AND coalesce(${table.storageMaxBytes}, 1) > 0 AND coalesce(${table.maxDocuments}, 1) > 0`),
  singleTrialPlan: uniqueIndex("plans_single_trial_idx").on(table.isTrial).where(sql`${table.isTrial}`),
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
  appTenantReadPolicy: appTenantReadPolicy("subscriptions", table.companyId),
  controlAccessPolicy: controlAccessPolicy("subscriptions"),
  backupReadPolicy: backupReadPolicy("subscriptions"),
  ownerMigrationPolicy: ownerMigrationPolicy("subscriptions"),
  workerCapabilityReadPolicy: workerCapabilityReadPolicy("subscriptions"),
})).enableRLS();


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
  // Which quotation version a PDF reservation was for, so re-rendering the same version is free
  // (marka.md M-7.6). No FK: usage is an audit record and must not block quotation cleanup.
  quotationId: uuid("quotation_id"),
  quotationVersionKey: text("quotation_version_key"),
}, (table) => {
  return {
    processingRunFk: foreignKey({
      columns: [table.documentProcessingRunId, table.companyId],
      foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.companyId],
    }).onDelete("no action"),
    companyRunIdx: index("idx_usage_logs_processing_run").on(table.companyId, table.documentProcessingRunId),
    quotationVersionIdx: index("idx_usage_logs_quotation_version").on(table.companyId, table.feature, table.quotationId, table.quotationVersionKey),
    quotationVersionPair: check("usage_logs_quotation_version_pair", sql`(${table.quotationId} IS NULL) = (${table.quotationVersionKey} IS NULL)`),
    countNonnegative: check("usage_logs_count_nonnegative", sql`${table.count} >= 0`),
    appTenantReadPolicy: appTenantReadPolicy("usage_logs", table.companyId),
    appTenantInsertPolicy: appTenantInsertPolicy("usage_logs", table.companyId),
    controlReadPolicy: controlReadPolicy("usage_logs"),
    controlInsertPolicy: controlInsertPolicy("usage_logs"),
    controlDeletePolicy: controlDeletePolicy("usage_logs"),
    backupReadPolicy: backupReadPolicy("usage_logs"),
    ownerMigrationPolicy: ownerMigrationPolicy("usage_logs"),
  };
}).enableRLS();

export const usageAlerts = pgTable("usage_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  appTenantPolicy: appTenantPolicy("usage_alerts", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("usage_alerts"),
  backupReadPolicy: backupReadPolicy("usage_alerts"),
  ownerMigrationPolicy: ownerMigrationPolicy("usage_alerts"),
})).enableRLS();

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
}, (table) => ({
  tenantCreatedIdIdx: index("idx_leads_tenant_created_id").on(table.companyId, table.createdAt.desc(), table.id.desc()),
  appTenantReadPolicy: appTenantReadPolicy("leads", table.companyId),
  appTenantInsertPolicy: appTenantInsertPolicy("leads", table.companyId),
  backupReadPolicy: backupReadPolicy("leads"),
  ownerMigrationPolicy: ownerMigrationPolicy("leads"),
})).enableRLS();

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
  privacyStatus: text("privacy_status").default("active").notNull(),
  privacyMaskedAt: timestamp("privacy_masked_at", { withTimezone: true }),
  pipelineStage: pipelineStageEnum("pipeline_stage").default("lead").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  privacyStatusCheck: check("clients_privacy_status_check", sql`${table.privacyStatus} in ('active', 'requested', 'hold', 'masked')`),
  privacyMaskCheck: check("clients_privacy_mask_check", sql`${table.privacyStatus} <> 'masked' OR (${table.name} = 'Maskelenmiş müşteri' AND ${table.phone} IS NULL AND ${table.email} IS NULL AND ${table.address} IS NULL AND ${table.notes} IS NULL AND ${table.privacyMaskedAt} IS NOT NULL)`),
  appTenantPolicy: appTenantPolicy("clients", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("clients"),
  backupReadPolicy: backupReadPolicy("clients"),
  ownerMigrationPolicy: ownerMigrationPolicy("clients"),
})).enableRLS();

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
  // Release 0029: contractor profit and overhead on the net subtotal; line prices stay bound to price evidence.
  overheadProfitPercent: numeric("overhead_profit_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  overheadProfitTotal: numeric("overhead_profit_total", { precision: 20, scale: 2 }).default("0").notNull(),
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
    overheadProfitPercentCheck: check("quotations_overhead_profit_percent_check", sql`${table.overheadProfitPercent} >= 0 AND ${table.overheadProfitPercent} <= 100`),
    appTenantPolicy: appTenantPolicy("quotations", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("quotations"),
    backupReadPolicy: backupReadPolicy("quotations"),
    ownerMigrationPolicy: ownerMigrationPolicy("quotations"),
  };
}).enableRLS();

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
  authorizationStatus: text("authorization_status").default("pending").notNull(),
  reviewStatus: text("review_status").default("legacy_unverified").notNull(),
  reviewEvidenceReference: text("review_evidence_reference"),
  reviewScope: text("review_scope"),
  reviewAllowsQuotations: boolean("review_allows_quotations").default(false).notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  authorizationScope: text("authorization_scope"),
  authorizationEvidenceHash: text("authorization_evidence_hash"),
  authorizedAt: timestamp("authorized_at", { withTimezone: true }),
  authorizedByUserId: uuid("authorized_by_user_id"),
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
  authorizerFk: foreignKey({
    columns: [table.authorizedByUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  sourceTypeCheck: check("price_sources_source_type_check", sql`${table.sourceType} in ('official_reference', 'supplier_quote', 'company_actual', 'index_adjusted', 'manual_override')`),
  licenseStatusCheck: check("price_sources_license_status_check", sql`${table.licenseStatus} in ('unknown', 'verified', 'restricted', 'not_applicable')`),
  reviewStatusCheck: check("price_sources_review_status_check", sql`${table.reviewStatus} in ('legacy_unverified', 'verified', 'revoked')`),
  reviewEvidenceCheck: check("price_sources_review_evidence_check", sql`${table.reviewStatus} <> 'verified' OR (${table.reviewEvidenceReference} IS NOT NULL AND length(trim(${table.reviewEvidenceReference})) > 0 AND ${table.reviewScope} IS NOT NULL AND length(trim(${table.reviewScope})) > 0 AND ${table.reviewAllowsQuotations} = true AND ${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL)`),
  authorizationStatusCheck: check("price_sources_authorization_status_check", sql`${table.authorizationStatus} in ('pending', 'authorized', 'restricted')`),
  authorizationEvidenceCheck: check("price_sources_authorization_evidence_check", sql`${table.authorizationStatus} <> 'authorized' OR (${table.authorizationEvidenceHash} ~ '^[0-9a-f]{64}$' AND length(${table.authorizationScope}) > 0 AND ${table.authorizedAt} IS NOT NULL AND ${table.authorizedByUserId} IS NOT NULL)`),
  sourceHashCheck: check("price_sources_source_document_hash_check", sql`length(${table.sourceDocumentHash}) >= 16`),
  sourceLookupIdx: index("idx_price_sources_lookup").on(table.companyId, table.sourceType, table.region),
  appTenantPolicy: appTenantPolicy("price_sources", table.companyId),
  backupReadPolicy: backupReadPolicy("price_sources"),
  ownerMigrationPolicy: ownerMigrationPolicy("price_sources"),
})).enableRLS();

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
  createdByUserId: uuid("created_by_user_id"),
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
  creatorFk: foreignKey({
    columns: [table.createdByUserId, table.companyId],
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
  appTenantPolicy: appTenantPolicy("price_snapshots", table.companyId),
  backupReadPolicy: backupReadPolicy("price_snapshots"),
  ownerMigrationPolicy: ownerMigrationPolicy("price_snapshots"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("source_intelligence_adapters", table.companyId),
  backupReadPolicy: backupReadPolicy("source_intelligence_adapters"),
  ownerMigrationPolicy: ownerMigrationPolicy("source_intelligence_adapters"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("source_ingestion_runs", table.companyId),
  backupReadPolicy: backupReadPolicy("source_ingestion_runs"),
  ownerMigrationPolicy: ownerMigrationPolicy("source_ingestion_runs"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("source_ingestion_artifacts", table.companyId),
  backupReadPolicy: backupReadPolicy("source_ingestion_artifacts"),
  ownerMigrationPolicy: ownerMigrationPolicy("source_ingestion_artifacts"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("source_review_items", table.companyId),
  backupReadPolicy: backupReadPolicy("source_review_items"),
  ownerMigrationPolicy: ownerMigrationPolicy("source_review_items"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("regulation_versions", table.companyId),
  backupReadPolicy: backupReadPolicy("regulation_versions"),
  ownerMigrationPolicy: ownerMigrationPolicy("regulation_versions"),
})).enableRLS();

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
    appTenantPolicy: appTenantPolicy("quotation_items", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("quotation_items"),
    backupReadPolicy: backupReadPolicy("quotation_items"),
    ownerMigrationPolicy: ownerMigrationPolicy("quotation_items"),
  };
}).enableRLS();

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
  currentPriceEvidenceUnique: uniqueIndex("quotation_item_evidence_current_price_unique").on(table.companyId, table.quotationItemId).where(sql`${table.evidenceType} = 'price' AND ${table.status} = 'current'`),
  evidenceTypeCheck: check("quotation_item_evidence_type_check", sql`${table.evidenceType} in ('quantity', 'price', 'rule', 'source')`),
  statusCheck: check("quotation_item_evidence_status_check", sql`${table.status} in ('current', 'stale', 'superseded')`),
  sourceHashCheck: check("quotation_item_evidence_source_hash_check", sql`${table.sourceDocumentHash} IS NULL OR length(${table.sourceDocumentHash}) >= 16`),
  evidenceLookupIdx: index("idx_quotation_item_evidence_lookup").on(table.companyId, table.quotationId, table.quotationItemId),
  appTenantPolicy: appTenantPolicy("quotation_item_evidence", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("quotation_item_evidence"),
  backupReadPolicy: backupReadPolicy("quotation_item_evidence"),
  ownerMigrationPolicy: ownerMigrationPolicy("quotation_item_evidence"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("regulation_alerts", table.companyId),
  backupReadPolicy: backupReadPolicy("regulation_alerts"),
  ownerMigrationPolicy: ownerMigrationPolicy("regulation_alerts"),
})).enableRLS();

export const industries = pgTable("industries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configJson: text("config_json").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
}, () => ({
  appReadPolicy: appCatalogReadPolicy("industries"),
  backupReadPolicy: backupReadPolicy("industries"),
  ownerMigrationPolicy: ownerMigrationPolicy("industries"),
})).enableRLS();

export const companyIndustrySettings = pgTable("company_industry_settings", {
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  industryId: text("industry_id").references(() => industries.id).notNull(),
  preferredModel: text("preferred_model").default("balanced"),
  customRules: text("custom_rules"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.companyId, table.industryId] }),
    appTenantReadPolicy: appTenantReadPolicy("company_industry_settings", table.companyId),
    appTenantInsertPolicy: appTenantInsertPolicy("company_industry_settings", table.companyId),
    appTenantUpdatePolicy: appTenantUpdatePolicy("company_industry_settings", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("company_industry_settings"),
    backupReadPolicy: backupReadPolicy("company_industry_settings"),
    ownerMigrationPolicy: ownerMigrationPolicy("company_industry_settings"),
  };
}).enableRLS();

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
}, (table) => ({
  appTenantPolicy: appTenantPolicy("deals", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("deals"),
  backupReadPolicy: backupReadPolicy("deals"),
  ownerMigrationPolicy: ownerMigrationPolicy("deals"),
})).enableRLS();

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  dealId: uuid("deal_id").references(() => deals.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  appTenantPolicy: appTenantPolicy("activities", table.companyId),
  adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("activities"),
  backupReadPolicy: backupReadPolicy("activities"),
  ownerMigrationPolicy: ownerMigrationPolicy("activities"),
})).enableRLS();

export const costComponents = pgTable("cost_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull().unique(),
  materialCost: numeric("material_cost", { precision: 20, scale: 2 }).default("0"),
  laborCost: numeric("labor_cost", { precision: 20, scale: 2 }).default("0"),
  logisticsCost: numeric("logistics_cost", { precision: 20, scale: 2 }).default("0"),
  subcontractorCost: numeric("subcontractor_cost", { precision: 20, scale: 2 }).default("0"),
  overheadCost: numeric("overhead_cost", { precision: 20, scale: 2 }).default("0"),
}, (table) => {
  const tenant = sql`current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM ${quotations} WHERE ${quotations.id} = ${table.quotationId} AND ${quotations.companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid)`;
  return { adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("cost_components"), appTenantPolicy: pgPolicy('cost_components_app_tenant', { for: 'all', to: 'public', using: tenant, withCheck: tenant }), backupReadPolicy: backupReadPolicy('cost_components'), ownerMigrationPolicy: ownerMigrationPolicy('cost_components') };
}).enableRLS();

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
}, (table) => {
  const tenant = sql`current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM ${quotations} WHERE ${quotations.id} = ${table.quotationId} AND ${quotations.companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid)`;
  return { adminDeletionCapabilityPolicy: adminDeletionCapabilityPolicy("quotation_financials"), appTenantPolicy: pgPolicy('quotation_financials_app_tenant', { for: 'all', to: 'public', using: tenant, withCheck: tenant }), backupReadPolicy: backupReadPolicy('quotation_financials'), ownerMigrationPolicy: ownerMigrationPolicy('quotation_financials') };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("documents", table.companyId),
    appSuperAdminReadPolicy: appSuperAdminQueueReadPolicy("documents"),
    workerAccessPolicy: workerAccessPolicy("documents"),
    backupReadPolicy: backupReadPolicy("documents"),
    ownerMigrationPolicy: ownerMigrationPolicy("documents"),
  };
}).enableRLS();

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
  workerJobId: text("worker_job_id"),
  workerLeaseToken: uuid("worker_lease_token"),
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
    appTenantPolicy: appTenantPolicy("document_processing_runs", table.companyId),
    appSuperAdminReadPolicy: appSuperAdminQueueReadPolicy("document_processing_runs"),
    workerAccessPolicy: workerAccessPolicy("document_processing_runs"),
    backupReadPolicy: backupReadPolicy("document_processing_runs"),
    ownerMigrationPolicy: ownerMigrationPolicy("document_processing_runs"),
  };
}).enableRLS();

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
  companyArtifactRunDocumentUnique: unique("document_processing_artifacts_id_company_run_document_key").on(table.id, table.companyId, table.processingRunId, table.documentId),
  runArtifactUnique: unique("document_processing_artifacts_run_type_key").on(table.companyId, table.processingRunId, table.artifactType),
  runFk: foreignKey({
    columns: [table.processingRunId, table.documentId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
  }).onDelete("cascade"),
  sizeCheck: check("document_processing_artifacts_size_check", sql`${table.sizeBytes} >= 0`),
  appTenantPolicy: appTenantPolicy("document_processing_artifacts", table.companyId),
  workerAccessPolicy: workerAccessPolicy("document_processing_artifacts"),
  backupReadPolicy: backupReadPolicy("document_processing_artifacts"),
  ownerMigrationPolicy: ownerMigrationPolicy("document_processing_artifacts"),
})).enableRLS();

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
  transferScopeUnique: unique("normalized_quantity_rows_transfer_scope_key").on(table.id, table.companyId, table.documentId, table.processingRunId),
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
  appTenantPolicy: appTenantPolicy("normalized_quantity_rows", table.companyId),
  workerAccessPolicy: workerAccessPolicy("normalized_quantity_rows"),
  backupReadPolicy: backupReadPolicy("normalized_quantity_rows"),
  ownerMigrationPolicy: ownerMigrationPolicy("normalized_quantity_rows"),
})).enableRLS();

// ============================================================
// SMARTCHECK PHASE 5 — IMMUTABLE CALM → QUOTATION TRANSFER
// ============================================================

export const quotationTransferLedgers = pgTable("quotation_transfer_ledgers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  sourceDocumentId: uuid("source_document_id").notNull(),
  sourceProcessingRunId: uuid("source_processing_run_id").notNull(),
  sourceArtifactId: uuid("source_artifact_id").notNull(),
  sourceQuotationId: uuid("source_quotation_id").notNull(),
  targetQuotationId: uuid("target_quotation_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestPayloadHash: text("request_payload_hash").notNull(),
  requestHash: text("request_hash").notNull(),
  scopeSnapshotJson: jsonb("scope_snapshot_json").$type<Record<string, unknown>>().notNull(),
  sourceRuleVersion: text("source_rule_version").notNull(),
  resultSummaryJson: jsonb("result_summary_json").$type<Record<string, unknown>>().default({}).notNull(),
  sealedAt: timestamp("sealed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyLedgerUnique: unique("quotation_transfer_ledgers_id_company_id_key").on(table.id, table.companyId),
  scopeUnique: unique("quotation_transfer_ledgers_scope_key").on(table.id, table.companyId, table.sourceDocumentId, table.sourceProcessingRunId, table.targetQuotationId),
  actorIdempotencyUnique: unique("quotation_transfer_ledgers_actor_idempotency_key").on(table.companyId, table.actorUserId, table.idempotencyKey),
  actorFk: foreignKey({
    columns: [table.actorUserId, table.companyId],
    foreignColumns: [memberships.userId, memberships.companyId],
  }).onDelete("restrict"),
  documentFk: foreignKey({
    columns: [table.sourceDocumentId, table.companyId],
    foreignColumns: [documents.id, documents.companyId],
  }).onDelete("restrict"),
  runFk: foreignKey({
    columns: [table.sourceProcessingRunId, table.sourceDocumentId, table.companyId],
    foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId],
  }).onDelete("restrict"),
  artifactFk: foreignKey({
    columns: [table.sourceArtifactId, table.companyId, table.sourceProcessingRunId, table.sourceDocumentId],
    foreignColumns: [documentProcessingArtifacts.id, documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.documentId],
  }).onDelete("restrict"),
  sourceQuotationFk: foreignKey({
    columns: [table.sourceQuotationId, table.companyId],
    foreignColumns: [quotations.id, quotations.companyId],
  }).onDelete("restrict"),
  targetQuotationFk: foreignKey({
    columns: [table.targetQuotationId, table.companyId],
    foreignColumns: [quotations.id, quotations.companyId],
  }).onDelete("restrict"),
  requestHashCheck: check("quotation_transfer_ledgers_request_hash_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
  requestPayloadHashCheck: check("quotation_transfer_ledgers_request_payload_hash_check", sql`${table.requestPayloadHash} ~ '^[0-9a-f]{64}$'`),
  idempotencyKeyCheck: check("quotation_transfer_ledgers_idempotency_key_check", sql`length(trim(${table.idempotencyKey})) between 1 and 160`),
  distinctRevisionCheck: check("quotation_transfer_ledgers_distinct_revision_check", sql`${table.sourceQuotationId} <> ${table.targetQuotationId}`),
  lookupIdx: index("idx_quotation_transfer_ledgers_lookup").on(table.companyId, table.sourceQuotationId, table.createdAt),
  appTenantPolicy: appTenantPolicy("quotation_transfer_ledgers", table.companyId),
  backupReadPolicy: backupReadPolicy("quotation_transfer_ledgers"),
  ownerMigrationPolicy: ownerMigrationPolicy("quotation_transfer_ledgers"),
})).enableRLS();

export const quotationTransferSourceRows = pgTable("quotation_transfer_source_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  transferLedgerId: uuid("transfer_ledger_id").notNull(),
  sourceQuantityRowId: uuid("source_quantity_row_id").notNull(),
  sourceDocumentId: uuid("source_document_id").notNull(),
  sourceProcessingRunId: uuid("source_processing_run_id").notNull(),
  targetQuotationId: uuid("target_quotation_id").notNull(),
  targetQuotationItemId: uuid("target_quotation_item_id").notNull(),
  contributedQuantity: numeric("contributed_quantity", { precision: 20, scale: 4 }).notNull(),
  sourceCellRange: text("source_cell_range").notNull(),
  sourceRuleVersion: text("source_rule_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ledgerRowItemUnique: unique("quotation_transfer_source_rows_ledger_row_item_key").on(table.transferLedgerId, table.sourceQuantityRowId, table.targetQuotationItemId),
  ledgerFk: foreignKey({
    name: "quotation_transfer_source_rows_ledger_scope_fk",
    columns: [table.transferLedgerId, table.companyId, table.sourceDocumentId, table.sourceProcessingRunId, table.targetQuotationId],
    foreignColumns: [quotationTransferLedgers.id, quotationTransferLedgers.companyId, quotationTransferLedgers.sourceDocumentId, quotationTransferLedgers.sourceProcessingRunId, quotationTransferLedgers.targetQuotationId],
  }).onDelete("restrict"),
  sourceRowFk: foreignKey({
    name: "quotation_transfer_source_rows_source_scope_fk",
    columns: [table.sourceQuantityRowId, table.companyId, table.sourceDocumentId, table.sourceProcessingRunId],
    foreignColumns: [normalizedQuantityRows.id, normalizedQuantityRows.companyId, normalizedQuantityRows.documentId, normalizedQuantityRows.processingRunId],
  }).onDelete("restrict"),
  targetItemFk: foreignKey({
    columns: [table.targetQuotationItemId, table.targetQuotationId, table.companyId],
    foreignColumns: [quotationItems.id, quotationItems.quotationId, quotationItems.companyId],
  }).onDelete("restrict"),
  quantityCheck: check("quotation_transfer_source_rows_quantity_check", sql`${table.contributedQuantity} > 0`),
  lookupIdx: index("idx_quotation_transfer_source_rows_lookup").on(table.companyId, table.targetQuotationId, table.targetQuotationItemId),
  appTenantPolicy: appTenantPolicy("quotation_transfer_source_rows", table.companyId),
  backupReadPolicy: backupReadPolicy("quotation_transfer_source_rows"),
  ownerMigrationPolicy: ownerMigrationPolicy("quotation_transfer_source_rows"),
})).enableRLS();

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
  appReadPolicy: pgPolicy("smartcheck_audit_logs_app_read", { for: "select", to: "public", using: sql`current_user = 'bimmetraj_app' AND ${table.companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid` }),
  appInsertPolicy: pgPolicy("smartcheck_audit_logs_app_insert", { for: "insert", to: "public", withCheck: sql`current_user = 'bimmetraj_app' AND ${table.companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid AND ${table.entityType} <> 'smartcheck_pilot_case'` }),
  backupReadPolicy: backupReadPolicy("smartcheck_audit_logs"),
  ownerMigrationPolicy: pgPolicy("smartcheck_audit_logs_owner_migration", { for: "all", to: "public", using: sql`current_user = 'bimmetraj_owner'`, withCheck: sql`current_user = 'bimmetraj_owner'` }),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("smartcheck_pilot_cases", table.companyId),
  backupReadPolicy: backupReadPolicy("smartcheck_pilot_cases"),
  ownerMigrationPolicy: ownerMigrationPolicy("smartcheck_pilot_cases"),
})).enableRLS();

export const smartcheckPilotMeasurements = pgTable("smartcheck_pilot_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  pilotCaseId: uuid("pilot_case_id").notNull(),
  processingRunId: uuid("processing_run_id"),
  measuredByUserId: uuid("measured_by_user_id").notNull(),
  measurementKey: text("measurement_key").notNull(),
  requestHash: text("request_hash"),
  caseRevision: integer("case_revision"),
  measuredAt: timestamp("measured_at", { withTimezone: true }).defaultNow().notNull(),
  totalRows: integer("total_rows").default(0).notNull(),
  parsedRows: integer("parsed_rows").default(0).notNull(),
  manuallyCorrectedRows: integer("manually_corrected_rows").default(0).notNull(),
  findingCount: integer("finding_count").default(0).notNull(),
  approvedRows: integer("approved_rows").default(0).notNull(),
  exceptionRows: integer("exception_rows").default(0).notNull(),
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
  caseRevisionUnique: unique("smartcheck_pilot_measurements_case_revision_key").on(table.companyId, table.pilotCaseId, table.caseRevision),
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
  exceptionRowsCheck: check("smartcheck_pilot_measurements_exception_rows_check", sql`${table.exceptionRows} >= 0`),
  durationCheck: check("smartcheck_pilot_measurements_duration_check", sql`(${table.processingDurationSeconds} IS NULL OR ${table.processingDurationSeconds} >= 0) AND (${table.workflowDurationSeconds} IS NULL OR ${table.workflowDurationSeconds} >= 0)`),
  requestHashCheck: check("smartcheck_pilot_measurements_request_hash_check", sql`${table.requestHash} IS NULL OR ${table.requestHash} ~ '^[0-9a-f]{64}$'`),
  caseRevisionCheck: check("smartcheck_pilot_measurements_case_revision_check", sql`${table.caseRevision} IS NULL OR ${table.caseRevision} > 0`),
  idxLookup: index("idx_smartcheck_pilot_measurements_lookup").on(table.companyId, table.pilotCaseId, table.measuredAt),
  appTenantReadPolicy: appTenantReadPolicy("smartcheck_pilot_measurements", table.companyId),
  appTenantInsertPolicy: appTenantInsertPolicy("smartcheck_pilot_measurements", table.companyId),
  backupReadPolicy: backupReadPolicy("smartcheck_pilot_measurements"),
  ownerMigrationPolicy: ownerMigrationPolicy("smartcheck_pilot_measurements"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("supplier_quote_submissions", table.companyId),
  backupReadPolicy: backupReadPolicy("supplier_quote_submissions"),
  ownerMigrationPolicy: ownerMigrationPolicy("supplier_quote_submissions"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("supplier_quote_entries", table.companyId),
  backupReadPolicy: backupReadPolicy("supplier_quote_entries"),
  ownerMigrationPolicy: ownerMigrationPolicy("supplier_quote_entries"),
})).enableRLS();

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
    appTenantPolicy: appTenantPolicy("rule_candidates", table.companyId),
    backupReadPolicy: backupReadPolicy("rule_candidates"),
    ownerMigrationPolicy: ownerMigrationPolicy("rule_candidates"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("rule_registry", table.companyId),
    backupReadPolicy: backupReadPolicy("rule_registry"),
    ownerMigrationPolicy: ownerMigrationPolicy("rule_registry"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("rule_versions", table.companyId),
    backupReadPolicy: backupReadPolicy("rule_versions"),
    ownerMigrationPolicy: ownerMigrationPolicy("rule_versions"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("review_sessions", table.companyId),
    backupReadPolicy: backupReadPolicy("review_sessions"),
    ownerMigrationPolicy: ownerMigrationPolicy("review_sessions"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("review_findings", table.companyId),
    backupReadPolicy: backupReadPolicy("review_findings"),
    ownerMigrationPolicy: ownerMigrationPolicy("review_findings"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("competency_signals", table.companyId),
    backupReadPolicy: backupReadPolicy("competency_signals"),
    ownerMigrationPolicy: ownerMigrationPolicy("competency_signals"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("competency_signal_evidence", table.companyId),
    backupReadPolicy: backupReadPolicy("competency_signal_evidence"),
    ownerMigrationPolicy: ownerMigrationPolicy("competency_signal_evidence"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("assistance_resources", table.companyId),
    backupReadPolicy: backupReadPolicy("assistance_resources"),
    ownerMigrationPolicy: ownerMigrationPolicy("assistance_resources"),
  };
}).enableRLS();

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
    appTenantPolicy: appTenantPolicy("rule_assistance_resources", table.companyId),
    backupReadPolicy: backupReadPolicy("rule_assistance_resources"),
    ownerMigrationPolicy: ownerMigrationPolicy("rule_assistance_resources"),
  };
}).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_lesson_progress", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_lesson_progress"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_lesson_progress"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_lesson_activity", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_lesson_activity"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_lesson_activity"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_lesson_notes", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_lesson_notes"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_lesson_notes"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_lesson_bookmarks", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_lesson_bookmarks"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_lesson_bookmarks"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_checkpoint_attempts", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_checkpoint_attempts"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_checkpoint_attempts"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_exam_attempts", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_exam_attempts"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_exam_attempts"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_certificates", table.companyId),
  appVerifyReadPolicy: pgPolicy("allplan_certificates_app_verify_read", {
    for: "select",
    to: "public",
    using: sql`current_user = 'bimmetraj_app' AND ${table.certificateNumber} = nullif(current_setting('bimmetraj.certificate_number', true), '')`,
  }),
  backupReadPolicy: backupReadPolicy("allplan_certificates"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_certificates"),
})).enableRLS();

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
  appTenantPolicy: appTenantPolicy("allplan_certificate_audit_logs", table.companyId),
  backupReadPolicy: backupReadPolicy("allplan_certificate_audit_logs"),
  ownerMigrationPolicy: ownerMigrationPolicy("allplan_certificate_audit_logs"),
})).enableRLS();

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
  appTenantReadPolicy: appTenantReadPolicy("academy_enrollments", table.companyId),
  controlAccessPolicy: controlAccessPolicy("academy_enrollments"),
  backupReadPolicy: backupReadPolicy("academy_enrollments"),
  ownerMigrationPolicy: ownerMigrationPolicy("academy_enrollments"),
})).enableRLS();

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
  appTenantReadPolicy: appTenantReadPolicy("academy_learner_profiles", table.companyId),
  controlAccessPolicy: controlAccessPolicy("academy_learner_profiles"),
  backupReadPolicy: backupReadPolicy("academy_learner_profiles"),
  ownerMigrationPolicy: ownerMigrationPolicy("academy_learner_profiles"),
})).enableRLS();

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
  appTenantReadPolicy: appTenantReadPolicy("academy_activation_events", table.companyId),
  controlAccessPolicy: controlAccessPolicy("academy_activation_events"),
  backupReadPolicy: backupReadPolicy("academy_activation_events"),
  ownerMigrationPolicy: ownerMigrationPolicy("academy_activation_events"),
})).enableRLS();

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
  appTenantReadPolicy: appTenantReadPolicy("academy_enrollment_audit_logs", table.companyId),
  controlAccessPolicy: controlAccessPolicy("academy_enrollment_audit_logs"),
  backupReadPolicy: backupReadPolicy("academy_enrollment_audit_logs"),
  ownerMigrationPolicy: ownerMigrationPolicy("academy_enrollment_audit_logs"),
})).enableRLS();

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
  appTenantReadPolicy: appTenantReadPolicy("academy_payment_events", table.companyId),
  controlAccessPolicy: controlAccessPolicy("academy_payment_events"),
  backupReadPolicy: backupReadPolicy("academy_payment_events"),
  ownerMigrationPolicy: ownerMigrationPolicy("academy_payment_events"),
})).enableRLS();

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
  targetCompanyId: uuid("target_company_id").references(() => companies.id, { onDelete: "set null" }),
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
  authorizationStatus: text("authorization_status").default("pending").notNull(),
  reviewStatus: text("review_status").default("legacy_unverified").notNull(),
  reviewEvidenceReference: text("review_evidence_reference"),
  reviewScope: text("review_scope"),
  reviewAllowsQuotations: boolean("review_allows_quotations").default(false).notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  authorizationScope: text("authorization_scope"),
  authorizationEvidenceHash: text("authorization_evidence_hash"),
  authorizedAt: timestamp("authorized_at", { withTimezone: true }),
  crawlerConfig: jsonb("crawler_config").default({}).notNull(),
  crawlLeaseToken: uuid("crawl_lease_token"),
  crawlLeaseUntil: timestamp("crawl_lease_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryCheck: check("pricing_data_sources_category_check", sql`${table.category} in ('official_gazette', 'tuik_index', 'market_commodity', 'epys_standard')`),
  statusCheck: check("pricing_data_sources_status_check", sql`${table.status} in ('active', 'syncing', 'error', 'stale')`),
  reviewStatusCheck: check("pricing_data_sources_review_status_check", sql`${table.reviewStatus} in ('legacy_unverified', 'verified', 'revoked')`),
  reviewEvidenceCheck: check("pricing_data_sources_review_evidence_check", sql`${table.reviewStatus} <> 'verified' OR (${table.reviewEvidenceReference} IS NOT NULL AND length(trim(${table.reviewEvidenceReference})) > 0 AND ${table.reviewScope} IS NOT NULL AND length(trim(${table.reviewScope})) > 0 AND ${table.reviewAllowsQuotations} = true AND ${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL)`),
  authorizationStatusCheck: check("pricing_data_sources_authorization_status_check", sql`${table.authorizationStatus} in ('pending', 'authorized', 'restricted')`),
  authorizationEvidenceCheck: check("pricing_data_sources_authorization_evidence_check", sql`${table.authorizationStatus} <> 'authorized' OR (${table.authorizationEvidenceHash} ~ '^[0-9a-f]{64}$' AND length(${table.authorizationScope}) > 0 AND ${table.authorizedAt} IS NOT NULL)`),
  syncFreqCheck: check("pricing_data_sources_sync_freq_check", sql`${table.syncFrequency} in ('realtime', 'daily', 'weekly', 'monthly', 'annually')`),
  categoryIdx: index("idx_pricing_data_sources_category").on(table.category),
}));

export const globalPriceSourceReviewEvents = pgTable("global_price_source_review_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => pricingDataSources.id, { onDelete: "restrict" }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  before: jsonb("before").notNull(),
  after: jsonb("after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actionCheck: check("global_price_source_review_events_action_check", sql`${table.action} in ('verify', 'revoke', 'invalidated')`),
}));

export const tenantPriceSourceReviewInvalidations = pgTable("tenant_price_source_review_invalidations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  sourceId: uuid("source_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceFk: foreignKey({ columns: [table.sourceId, table.companyId], foreignColumns: [priceSources.id, priceSources.companyId] }).onDelete("restrict"),
  reasonCheck: check("tenant_price_source_review_invalidations_reason_check", sql`${table.reason} in ('source_identity_or_authorization_changed', 'review_evidence_changed')`),
  appTenantReadPolicy: appTenantReadPolicy("tenant_price_source_review_invalidations", table.companyId),
  ownerTriggerInsert: pgPolicy("tenant_price_source_review_invalidations_owner_trigger_insert", { for: "insert", to: "public", withCheck: sql`current_user = 'bimmetraj_owner' AND session_user = 'bimmetraj_app' AND ${table.companyId} = nullif(current_setting('bimmetraj.company_id', true), '')::uuid` }),
  backupReadPolicy: backupReadPolicy("tenant_price_source_review_invalidations"),
  ownerMigrationPolicy: ownerMigrationPolicy("tenant_price_source_review_invalidations"),
})).enableRLS();

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
  contentHash: text("content_hash"),
  sourceIdentity: jsonb("source_identity"),
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

// ============================================================
// ISO 19650 CDE GOVERNANCE (PHASE 4)
// ============================================================

export const cdeProjects = pgTable("cde_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  documentId: uuid("document_id").notNull(),
  name: text("name").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyProjectUnique: unique("cde_projects_id_company_id_key").on(table.id, table.companyId),
  companyProjectDocumentUnique: unique("cde_projects_id_company_document_key").on(table.id, table.companyId, table.documentId),
  documentUnique: unique("cde_projects_company_document_key").on(table.companyId, table.documentId),
  documentFk: foreignKey({ columns: [table.documentId, table.companyId], foreignColumns: [documents.id, documents.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  idxDocument: index("idx_cde_projects_document").on(table.companyId, table.documentId),
  appTenantPolicy: appTenantPolicy("cde_projects", table.companyId),
  backupReadPolicy: backupReadPolicy("cde_projects"),
  ownerMigrationPolicy: ownerMigrationPolicy("cde_projects"),
})).enableRLS();

export const cdeProjectMembers = pgTable("cde_project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  projectRole: text("project_role").notNull(),
  discipline: text("discipline").notNull(),
  assignedByUserId: uuid("assigned_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyMemberUnique: unique("cde_project_members_id_company_id_key").on(table.id, table.companyId),
  projectUserUnique: unique("cde_project_members_project_user_key").on(table.companyId, table.projectId, table.userId),
  projectFk: foreignKey({ columns: [table.projectId, table.companyId], foreignColumns: [cdeProjects.id, cdeProjects.companyId] }).onDelete("cascade"),
  memberFk: foreignKey({ columns: [table.userId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  assignerFk: foreignKey({ columns: [table.assignedByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  roleCheck: check("cde_project_members_role_check", sql`${table.projectRole} in ('coordinator', 'approver', 'contributor', 'viewer')`),
  disciplineCheck: check("cde_project_members_discipline_check", sql`${table.discipline} in ('ARC', 'STR', 'MEP', 'COST', 'QA', 'BIM')`),
  appTenantPolicy: appTenantPolicy("cde_project_members", table.companyId),
  backupReadPolicy: backupReadPolicy("cde_project_members"),
  ownerMigrationPolicy: ownerMigrationPolicy("cde_project_members"),
})).enableRLS();

export const cdeContainers = pgTable("cde_containers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id").notNull(),
  containerCode: text("container_code").notNull(),
  title: text("title").notNull(),
  currentState: text("current_state").notNull().default("WIP"),
  currentRevisionId: uuid("current_revision_id"),
  currentScopeHash: text("current_scope_hash"),
  lockVersion: integer("lock_version").notNull().default(0),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyContainerUnique: unique("cde_containers_id_company_id_key").on(table.id, table.companyId),
  companyContainerProjectUnique: unique("cde_containers_id_company_project_key").on(table.id, table.companyId, table.projectId),
  projectContainerCodeUnique: unique("cde_containers_project_code_key").on(table.companyId, table.projectId, table.containerCode),
  projectFk: foreignKey({ columns: [table.projectId, table.companyId], foreignColumns: [cdeProjects.id, cdeProjects.companyId] }).onDelete("cascade"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  stateCheck: check("cde_containers_state_check", sql`${table.currentState} in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED')`),
  lockVersionCheck: check("cde_containers_lock_version_check", sql`${table.lockVersion} >= 0`),
  scopeHashCheck: check("cde_containers_scope_hash_check", sql`${table.currentScopeHash} IS NULL OR ${table.currentScopeHash} ~ '^[0-9a-f]{64}$'`),
  idxProject: index("idx_cde_containers_project").on(table.companyId, table.projectId),
  appTenantPolicy: appTenantPolicy("cde_containers", table.companyId),
  backupReadPolicy: backupReadPolicy("cde_containers"),
  ownerMigrationPolicy: ownerMigrationPolicy("cde_containers"),
})).enableRLS();

export const cdeRevisions = pgTable("cde_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id").notNull(),
  containerId: uuid("container_id").notNull(),
  supersedesRevisionId: uuid("supersedes_revision_id"),
  documentId: uuid("document_id").notNull(),
  processingRunId: uuid("processing_run_id").notNull(),
  resultArtifactId: uuid("result_artifact_id").notNull(),
  revisionCode: text("revision_code").notNull(),
  documentChecksumSha256: text("document_checksum_sha256").notNull(),
  sourceHash: text("source_hash").notNull(),
  ruleHash: text("rule_hash").notNull(),
  resultHash: text("result_hash").notNull(),
  codeHash: text("code_hash").notNull(),
  scopeHash: text("scope_hash").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyRevisionUnique: unique("cde_revisions_id_company_id_key").on(table.id, table.companyId),
  companyRevisionContainerUnique: unique("cde_revisions_id_company_container_key").on(table.id, table.companyId, table.containerId),
  scopeUnique: unique("cde_revisions_container_scope_key").on(table.companyId, table.containerId, table.scopeHash),
  projectFk: foreignKey({ columns: [table.projectId, table.companyId, table.documentId], foreignColumns: [cdeProjects.id, cdeProjects.companyId, cdeProjects.documentId] }).onDelete("cascade"),
  containerFk: foreignKey({ columns: [table.containerId, table.companyId, table.projectId], foreignColumns: [cdeContainers.id, cdeContainers.companyId, cdeContainers.projectId] }).onDelete("cascade"),
  supersedesFk: foreignKey({ columns: [table.supersedesRevisionId, table.companyId, table.containerId], foreignColumns: [table.id, table.companyId, table.containerId] }).onDelete("restrict"),
  runFk: foreignKey({ columns: [table.processingRunId, table.documentId, table.companyId], foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId] }).onDelete("restrict"),
  artifactFk: foreignKey({ columns: [table.resultArtifactId, table.companyId, table.processingRunId, table.documentId], foreignColumns: [documentProcessingArtifacts.id, documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.documentId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  hashesCheck: check("cde_revisions_hashes_check", sql`${table.documentChecksumSha256} ~ '^[0-9a-f]{64}$' AND ${table.sourceHash} ~ '^[0-9a-f]{64}$' AND ${table.ruleHash} ~ '^[0-9a-f]{64}$' AND ${table.resultHash} ~ '^[0-9a-f]{64}$' AND ${table.codeHash} ~ '^[0-9a-f]{64}$' AND ${table.scopeHash} ~ '^[0-9a-f]{64}$'`),
  idxContainer: index("idx_cde_revisions_container").on(table.companyId, table.containerId, table.createdAt),
  appTenantPolicy: appTenantPolicy("cde_revisions", table.companyId),
  backupReadPolicy: backupReadPolicy("cde_revisions"),
  ownerMigrationPolicy: ownerMigrationPolicy("cde_revisions"),
})).enableRLS();

export const cdeTransitionEvents = pgTable("cde_transition_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id").notNull(),
  containerId: uuid("container_id").notNull(),
  revisionId: uuid("revision_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  action: text("action").notNull(),
  decision: text("decision").notNull(),
  fromState: text("from_state").notNull(),
  toState: text("to_state"),
  suitabilityCode: text("suitability_code"),
  revisionCode: text("revision_code"),
  scopeHash: text("scope_hash"),
  expectedVersion: integer("expected_version").notNull(),
  resultingVersion: integer("resulting_version").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorProjectRole: text("actor_project_role").notNull(),
  actorDiscipline: text("actor_discipline").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyEventUnique: unique("cde_transition_events_id_company_id_key").on(table.id, table.companyId),
  idempotencyUnique: unique("cde_transition_events_idempotency_key").on(table.companyId, table.containerId, table.idempotencyKey),
  projectFk: foreignKey({ columns: [table.projectId, table.companyId], foreignColumns: [cdeProjects.id, cdeProjects.companyId] }).onDelete("cascade"),
  containerFk: foreignKey({ columns: [table.containerId, table.companyId, table.projectId], foreignColumns: [cdeContainers.id, cdeContainers.companyId, cdeContainers.projectId] }).onDelete("cascade"),
  revisionFk: foreignKey({ columns: [table.revisionId, table.companyId, table.containerId], foreignColumns: [cdeRevisions.id, cdeRevisions.companyId, cdeRevisions.containerId] }).onDelete("restrict"),
  actorFk: foreignKey({ columns: [table.actorUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  actionCheck: check("cde_transition_events_action_check", sql`${table.action} in ('scope_created', 'approve', 'reject', 'withdraw')`),
  decisionCheck: check("cde_transition_events_decision_check", sql`${table.decision} in ('accepted', 'rejected', 'invalidated')`),
  disciplineCheck: check("cde_transition_events_discipline_check", sql`${table.actorDiscipline} in ('ARC', 'STR', 'MEP', 'COST', 'QA', 'BIM')`),
  roleCheck: check("cde_transition_events_role_check", sql`${table.actorProjectRole} in ('coordinator', 'approver', 'contributor', 'viewer')`),
  statesCheck: check("cde_transition_events_states_check", sql`${table.fromState} in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED') AND (${table.toState} IS NULL OR ${table.toState} in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED'))`),
  requestHashCheck: check("cde_transition_events_request_hash_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
  versionsCheck: check("cde_transition_events_versions_check", sql`${table.expectedVersion} >= 0 AND ${table.resultingVersion} >= ${table.expectedVersion}`),
  idxHistory: index("idx_cde_transition_events_history").on(table.companyId, table.containerId, table.createdAt),
  appTenantPolicy: appTenantPolicy("cde_transition_events", table.companyId),
  backupReadPolicy: backupReadPolicy("cde_transition_events"),
  ownerMigrationPolicy: ownerMigrationPolicy("cde_transition_events"),
})).enableRLS();

// ============================================================
// PHASE 6 — REVISIONED PROGRESS PAYMENTS AND EVIDENCE
// ============================================================

export const constructionContracts = pgTable("construction_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  sourceQuotationId: uuid("source_quotation_id"),
  contractNumber: text("contract_number").notNull(),
  projectName: text("project_name").notNull(),
  currency: currencyEnum("currency").default("TRY").notNull(),
  regime: text("regime").notNull(),
  initialAmount: numeric("initial_amount", { precision: 20, scale: 2 }).notNull(),
  sourceDocumentHash: text("source_document_hash").notNull(),
  status: text("status").default("draft").notNull(),
  version: integer("version").default(0).notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyContractUnique: unique("construction_contracts_id_company_id_key").on(table.id, table.companyId),
  contractNumberUnique: unique("construction_contracts_company_number_key").on(table.companyId, table.contractNumber),
  quotationFk: foreignKey({ columns: [table.sourceQuotationId, table.companyId], foreignColumns: [quotations.id, quotations.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  amountCheck: check("construction_contracts_initial_amount_check", sql`${table.initialAmount} >= 0`),
  statusCheck: check("construction_contracts_status_check", sql`${table.status} in ('draft', 'active', 'closed', 'cancelled')`),
  regimeCheck: check("construction_contracts_regime_check", sql`length(trim(${table.regime})) between 1 and 80`),
  sourceHashCheck: check("construction_contracts_source_hash_check", sql`${table.sourceDocumentHash} ~ '^[0-9a-f]{64}$'`),
  appTenantPolicy: appTenantPolicy("construction_contracts", table.companyId),
  backupReadPolicy: backupReadPolicy("construction_contracts"),
  ownerMigrationPolicy: ownerMigrationPolicy("construction_contracts"),
})).enableRLS();

export const constructionContractItems = pgTable("construction_contract_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  sourceQuotationItemId: uuid("source_quotation_item_id"),
  itemCode: text("item_code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  contractQuantity: numeric("contract_quantity", { precision: 20, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 2 }).notNull(),
  sourceHash: text("source_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyItemUnique: unique("construction_contract_items_id_company_id_key").on(table.id, table.companyId),
  contractItemUnique: unique("construction_contract_items_id_contract_company_key").on(table.id, table.contractId, table.companyId),
  itemCodeUnique: unique("construction_contract_items_contract_code_key").on(table.companyId, table.contractId, table.itemCode),
  contractFk: foreignKey({ columns: [table.contractId, table.companyId], foreignColumns: [constructionContracts.id, constructionContracts.companyId] }).onDelete("restrict"),
  sourceItemFk: foreignKey({ columns: [table.sourceQuotationItemId, table.companyId], foreignColumns: [quotationItems.id, quotationItems.companyId] }).onDelete("restrict"),
  quantityCheck: check("construction_contract_items_quantity_check", sql`${table.contractQuantity} >= 0`),
  priceCheck: check("construction_contract_items_price_check", sql`${table.unitPrice} >= 0`),
  sourceHashCheck: check("construction_contract_items_source_hash_check", sql`${table.sourceHash} ~ '^[0-9a-f]{64}$'`),
  appTenantPolicy: appTenantPolicy("construction_contract_items", table.companyId),
  backupReadPolicy: backupReadPolicy("construction_contract_items"),
  ownerMigrationPolicy: ownerMigrationPolicy("construction_contract_items"),
})).enableRLS();

export const progressPaymentPeriods = pgTable("progress_payment_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  paymentNumber: integer("payment_number").notNull(),
  revisionNumber: integer("revision_number").default(0).notNull(),
  parentPeriodId: uuid("parent_period_id"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  status: text("status").default("draft").notNull(),
  isCurrent: boolean("is_current").default(true).notNull(),
  version: integer("version").default(0).notNull(),
  scopeHash: text("scope_hash"),
  correctionReason: text("correction_reason"),
  submittedByUserId: uuid("submitted_by_user_id"),
  approvedByUserId: uuid("approved_by_user_id"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sealedAt: timestamp("sealed_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyPeriodUnique: unique("progress_payment_periods_id_company_id_key").on(table.id, table.companyId),
  periodScopeUnique: unique("progress_payment_periods_id_contract_company_key").on(table.id, table.contractId, table.companyId),
  parentScopeUnique: unique("progress_payment_periods_parent_scope_key").on(table.id, table.contractId, table.paymentNumber, table.companyId),
  revisionUnique: unique("progress_payment_periods_revision_key").on(table.companyId, table.contractId, table.paymentNumber, table.revisionNumber),
  currentRevisionUnique: uniqueIndex("progress_payment_periods_current_key").on(table.companyId, table.contractId, table.paymentNumber).where(sql`${table.isCurrent} = true`),
  contractFk: foreignKey({ columns: [table.contractId, table.companyId], foreignColumns: [constructionContracts.id, constructionContracts.companyId] }).onDelete("restrict"),
  parentFk: foreignKey({ columns: [table.parentPeriodId, table.contractId, table.paymentNumber, table.companyId], foreignColumns: [table.id, table.contractId, table.paymentNumber, table.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  submitterFk: foreignKey({ columns: [table.submittedByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  approverFk: foreignKey({ columns: [table.approvedByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  statusCheck: check("progress_payment_periods_status_check", sql`${table.status} in ('draft', 'submitted', 'approved', 'superseded', 'cancelled')`),
  datesCheck: check("progress_payment_periods_dates_check", sql`${table.periodEnd} >= ${table.periodStart}`),
  sequenceCheck: check("progress_payment_periods_sequence_check", sql`${table.paymentNumber} > 0 AND ${table.revisionNumber} >= 0 AND ${table.version} >= 0`),
  scopeHashCheck: check("progress_payment_periods_scope_hash_check", sql`(${table.scopeHash} IS NULL OR ${table.scopeHash} ~ '^[0-9a-f]{64}$') AND (${table.status} <> 'approved' OR ${table.scopeHash} ~ '^[0-9a-f]{64}$')`),
  appTenantPolicy: appTenantPolicy("progress_payment_periods", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_payment_periods"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_payment_periods"),
})).enableRLS();

export const progressPaymentLines = pgTable("progress_payment_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  periodId: uuid("period_id").notNull(),
  contractItemId: uuid("contract_item_id").notNull(),
  previousQuantity: numeric("previous_quantity", { precision: 20, scale: 4 }).notNull(),
  currentQuantity: numeric("current_quantity", { precision: 20, scale: 4 }).notNull(),
  cumulativeQuantity: numeric("cumulative_quantity", { precision: 20, scale: 4 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 20, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 20, scale: 2 }).notNull(),
  cumulativeAmount: numeric("cumulative_amount", { precision: 20, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyLineUnique: unique("progress_payment_lines_id_company_id_key").on(table.id, table.companyId),
  periodItemUnique: unique("progress_payment_lines_period_item_key").on(table.companyId, table.periodId, table.contractItemId),
  idxContractPeriodItem: index("idx_progress_payment_lines_contract_period_item").on(table.companyId, table.contractId, table.periodId, table.contractItemId),
  periodFk: foreignKey({ columns: [table.periodId, table.contractId, table.companyId], foreignColumns: [progressPaymentPeriods.id, progressPaymentPeriods.contractId, progressPaymentPeriods.companyId] }).onDelete("restrict"),
  itemFk: foreignKey({ columns: [table.contractItemId, table.contractId, table.companyId], foreignColumns: [constructionContractItems.id, constructionContractItems.contractId, constructionContractItems.companyId] }).onDelete("restrict"),
  quantityCheck: check("progress_payment_lines_quantity_check", sql`${table.previousQuantity} >= 0 AND ${table.currentQuantity} >= 0 AND ${table.cumulativeQuantity} = ${table.previousQuantity} + ${table.currentQuantity}`),
  amountCheck: check("progress_payment_lines_amount_check", sql`${table.unitPriceSnapshot} >= 0 AND ${table.currentAmount} >= 0 AND ${table.cumulativeAmount} >= 0 AND ${table.cumulativeAmount} = round(${table.cumulativeQuantity} * ${table.unitPriceSnapshot}, 2) AND ${table.currentAmount} = ${table.cumulativeAmount} - round(${table.previousQuantity} * ${table.unitPriceSnapshot}, 2)`),
  appTenantPolicy: appTenantPolicy("progress_payment_lines", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_payment_lines"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_payment_lines"),
})).enableRLS();

export const progressMeasurements = pgTable("progress_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  periodId: uuid("period_id").notNull(),
  contractItemId: uuid("contract_item_id").notNull(),
  parentMeasurementId: uuid("parent_measurement_id"),
  location: text("location").notNull(),
  elementKey: text("element_key"),
  sourceType: text("source_type").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  sourceDocumentId: uuid("source_document_id"),
  sourceProcessingRunId: uuid("source_processing_run_id"),
  sourceQuantityRowId: uuid("source_quantity_row_id"),
  sourceCellRange: text("source_cell_range"),
  sourceIdentity: text("source_identity").notNull(),
  reviewStatus: text("review_status").default("pending_review").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewReason: text("review_reason"),
  correctionReason: text("correction_reason"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyMeasurementUnique: unique("progress_measurements_id_company_id_key").on(table.id, table.companyId),
  measurementScopeUnique: unique("progress_measurements_full_scope_key").on(table.id, table.contractItemId, table.contractId, table.periodId, table.companyId),
  reviewScopeUnique: unique("progress_measurements_review_scope_key").on(table.id, table.contractId, table.periodId, table.companyId),
  parentScopeUnique: unique("progress_measurements_parent_scope_key").on(table.id, table.contractItemId, table.contractId, table.companyId),
  sourceIdentityUnique: unique("progress_measurements_source_identity_key").on(table.companyId, table.periodId, table.sourceIdentity),
  periodFk: foreignKey({ columns: [table.periodId, table.contractId, table.companyId], foreignColumns: [progressPaymentPeriods.id, progressPaymentPeriods.contractId, progressPaymentPeriods.companyId] }).onDelete("restrict"),
  itemFk: foreignKey({ columns: [table.contractItemId, table.contractId, table.companyId], foreignColumns: [constructionContractItems.id, constructionContractItems.contractId, constructionContractItems.companyId] }).onDelete("restrict"),
  parentFk: foreignKey({ columns: [table.parentMeasurementId, table.contractItemId, table.contractId, table.companyId], foreignColumns: [table.id, table.contractItemId, table.contractId, table.companyId] }).onDelete("restrict"),
  documentFk: foreignKey({ columns: [table.sourceDocumentId, table.companyId], foreignColumns: [documents.id, documents.companyId] }).onDelete("restrict"),
  runFk: foreignKey({ columns: [table.sourceProcessingRunId, table.sourceDocumentId, table.companyId], foreignColumns: [documentProcessingRuns.id, documentProcessingRuns.documentId, documentProcessingRuns.companyId] }).onDelete("restrict"),
  rowFk: foreignKey({ columns: [table.sourceQuantityRowId, table.companyId, table.sourceDocumentId, table.sourceProcessingRunId], foreignColumns: [normalizedQuantityRows.id, normalizedQuantityRows.companyId, normalizedQuantityRows.documentId, normalizedQuantityRows.processingRunId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  reviewerFk: foreignKey({ columns: [table.reviewedByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  quantityCheck: check("progress_measurements_quantity_check", sql`${table.quantity} > 0`),
  sourceTypeCheck: check("progress_measurements_source_type_check", sql`${table.sourceType} in ('manual', 'ifc', 'xlsx', 'pdf', 'field_record')`),
  reviewStatusCheck: check("progress_measurements_review_status_check", sql`${table.reviewStatus} in ('pending_review', 'approved', 'rejected', 'superseded')`),
  sourceBindingCheck: check("progress_measurements_source_binding_check", sql`
    (${table.sourceType} = 'manual' AND ${table.sourceDocumentId} IS NULL AND ${table.sourceProcessingRunId} IS NULL AND ${table.sourceQuantityRowId} IS NULL AND ${table.sourceCellRange} IS NULL)
    OR (${table.sourceType} in ('ifc','xlsx') AND ${table.sourceDocumentId} IS NOT NULL AND ${table.sourceProcessingRunId} IS NOT NULL AND ${table.sourceQuantityRowId} IS NOT NULL AND ${table.sourceCellRange} IS NOT NULL)
    OR (${table.sourceType} in ('pdf','field_record') AND ${table.sourceDocumentId} IS NOT NULL AND ${table.sourceProcessingRunId} IS NOT NULL AND ${table.sourceQuantityRowId} IS NULL AND ${table.sourceCellRange} IS NOT NULL)`),
  reviewBindingCheck: check("progress_measurements_review_binding_check", sql`
    (${table.reviewStatus} = 'pending_review' AND ${table.reviewedByUserId} IS NULL AND ${table.reviewedAt} IS NULL AND ${table.reviewReason} IS NULL)
    OR (${table.reviewStatus} in ('approved','rejected') AND ${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL AND length(trim(${table.reviewReason})) > 0)
    OR ${table.reviewStatus} = 'superseded'`),
  idxPeriodCreated: index("idx_progress_measurements_period_created").on(table.companyId, table.periodId, table.createdAt),
  appTenantPolicy: appTenantPolicy("progress_measurements", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_measurements"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_measurements"),
})).enableRLS();

export const progressMeasurementReviewEvents = pgTable("progress_measurement_review_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  periodId: uuid("period_id").notNull(),
  measurementId: uuid("measurement_id").notNull(),
  decision: text("decision").notNull(),
  reason: text("reason").notNull(),
  expectedVersion: integer("expected_version").notNull(),
  resultingVersion: integer("resulting_version").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyEventUnique: unique("progress_measurement_review_events_id_company_id_key").on(table.id, table.companyId),
  idempotencyUnique: unique("progress_measurement_review_events_idempotency_key").on(table.companyId, table.periodId, table.idempotencyKey, table.measurementId),
  periodFk: foreignKey({ columns: [table.periodId, table.contractId, table.companyId], foreignColumns: [progressPaymentPeriods.id, progressPaymentPeriods.contractId, progressPaymentPeriods.companyId] }).onDelete("restrict"),
  measurementFk: foreignKey({ columns: [table.measurementId, table.contractId, table.periodId, table.companyId], foreignColumns: [progressMeasurements.id, progressMeasurements.contractId, progressMeasurements.periodId, progressMeasurements.companyId] }).onDelete("restrict"),
  actorFk: foreignKey({ columns: [table.actorUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  decisionCheck: check("progress_measurement_review_events_decision_check", sql`${table.decision} in ('approved', 'rejected')`),
  versionCheck: check("progress_measurement_review_events_version_check", sql`${table.expectedVersion} >= 0 AND ${table.resultingVersion} = ${table.expectedVersion} + 1`),
  requestHashCheck: check("progress_measurement_review_events_request_hash_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
  idxPeriodCreated: index("idx_progress_measurement_review_events_period_created").on(table.companyId, table.periodId, table.createdAt),
  appTenantPolicy: appTenantPolicy("progress_measurement_review_events", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_measurement_review_events"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_measurement_review_events"),
})).enableRLS();

export const progressPaymentAdjustments = pgTable("progress_payment_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  periodId: uuid("period_id").notNull(),
  adjustmentType: text("adjustment_type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  reviewStatus: text("review_status").default("manual_review").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  periodFk: foreignKey({ columns: [table.periodId, table.contractId, table.companyId], foreignColumns: [progressPaymentPeriods.id, progressPaymentPeriods.contractId, progressPaymentPeriods.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  typeCheck: check("progress_payment_adjustments_type_check", sql`${table.adjustmentType} in ('advance_payment', 'advance_recovery', 'retention', 'penalty', 'tax', 'price_difference', 'other')`),
  statusCheck: check("progress_payment_adjustments_status_check", sql`${table.reviewStatus} in ('manual_review', 'approved', 'rejected')`),
  evidenceHashCheck: check("progress_payment_adjustments_evidence_hash_check", sql`${table.evidenceHash} ~ '^[0-9a-f]{64}$'`),
  idxPeriodCreated: index("idx_progress_payment_adjustments_period_created").on(table.companyId, table.periodId, table.createdAt),
  appTenantPolicy: appTenantPolicy("progress_payment_adjustments", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_payment_adjustments"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_payment_adjustments"),
})).enableRLS();

export const progressPaymentEvents = pgTable("progress_payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  periodId: uuid("period_id").notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  expectedVersion: integer("expected_version").notNull(),
  resultingVersion: integer("resulting_version").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  reason: text("reason"),
  actorUserId: uuid("actor_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  idempotencyUnique: unique("progress_payment_events_idempotency_key").on(table.companyId, table.periodId, table.idempotencyKey),
  resultingVersionUnique: unique("progress_payment_events_resulting_version_key").on(table.companyId, table.periodId, table.resultingVersion),
  periodFk: foreignKey({ columns: [table.periodId, table.contractId, table.companyId], foreignColumns: [progressPaymentPeriods.id, progressPaymentPeriods.contractId, progressPaymentPeriods.companyId] }).onDelete("restrict"),
  actorFk: foreignKey({ columns: [table.actorUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  actionCheck: check("progress_payment_events_action_check", sql`${table.action} in ('submit', 'approve', 'reject', 'correct', 'cancel')`),
  statusCheck: check("progress_payment_events_status_check", sql`
    (${table.action}='submit' AND ${table.fromStatus}='draft' AND ${table.toStatus}='submitted')
    OR (${table.action}='approve' AND ${table.fromStatus}='submitted' AND ${table.toStatus}='approved')
    OR (${table.action}='reject' AND ${table.fromStatus}='submitted' AND ${table.toStatus}='draft')
    OR (${table.action}='cancel' AND ${table.fromStatus} in ('draft','submitted') AND ${table.toStatus}='cancelled')
    OR (${table.action}='correct' AND ${table.fromStatus}='approved' AND ${table.toStatus}='superseded')`),
  versionCheck: check("progress_payment_events_version_check", sql`${table.expectedVersion} >= 0 AND ${table.resultingVersion} = ${table.expectedVersion} + 1`),
  requestHashCheck: check("progress_payment_events_request_hash_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
  idxPeriodCreated: index("idx_progress_payment_events_period_created").on(table.companyId, table.periodId, table.createdAt),
  appTenantPolicy: appTenantPolicy("progress_payment_events", table.companyId),
  backupReadPolicy: backupReadPolicy("progress_payment_events"),
  ownerMigrationPolicy: ownerMigrationPolicy("progress_payment_events"),
})).enableRLS();

export const contractVariations = pgTable("contract_variations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  variationNumber: integer("variation_number").notNull(),
  kind: text("kind").notNull(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  decisionDocumentHash: text("decision_document_hash"),
  status: text("status").default("manual_review").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  variationUnique: unique("contract_variations_contract_number_key").on(table.companyId, table.contractId, table.variationNumber),
  contractFk: foreignKey({ columns: [table.contractId, table.companyId], foreignColumns: [constructionContracts.id, constructionContracts.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  kindCheck: check("contract_variations_kind_check", sql`${table.kind} in ('addition', 'omission', 'new_item')`),
  statusCheck: check("contract_variations_status_check", sql`${table.status} in ('manual_review', 'approved', 'rejected')`),
  decisionHashCheck: check("contract_variations_decision_hash_check", sql`${table.decisionDocumentHash} IS NULL OR ${table.decisionDocumentHash} ~ '^[0-9a-f]{64}$'`),
  approvedEvidenceCheck: check("contract_variations_approved_evidence_check", sql`${table.status} <> 'approved' OR ${table.decisionDocumentHash} ~ '^[0-9a-f]{64}$'`),
  appTenantPolicy: appTenantPolicy("contract_variations", table.companyId),
  backupReadPolicy: backupReadPolicy("contract_variations"),
  ownerMigrationPolicy: ownerMigrationPolicy("contract_variations"),
})).enableRLS();

export const finalAccounts = pgTable("final_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  contractId: uuid("contract_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  status: text("status").default("draft").notNull(),
  resultJson: jsonb("result_json").$type<Record<string, string | boolean | null>>().notNull(),
  sourceAggregateHash: text("source_aggregate_hash").notNull(),
  sealedAt: timestamp("sealed_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  revisionUnique: unique("final_accounts_contract_revision_key").on(table.companyId, table.contractId, table.revisionNumber),
  contractFk: foreignKey({ columns: [table.contractId, table.companyId], foreignColumns: [constructionContracts.id, constructionContracts.companyId] }).onDelete("restrict"),
  creatorFk: foreignKey({ columns: [table.createdByUserId, table.companyId], foreignColumns: [memberships.userId, memberships.companyId] }).onDelete("restrict"),
  statusCheck: check("final_accounts_status_check", sql`${table.status} in ('draft', 'manual_review', 'sealed', 'superseded')`),
  hashCheck: check("final_accounts_source_hash_check", sql`${table.sourceAggregateHash} ~ '^[0-9a-f]{64}$'`),
  sealCheck: check("final_accounts_seal_check", sql`(${table.status} = 'sealed' AND ${table.sealedAt} IS NOT NULL) OR (${table.status} <> 'sealed' AND ${table.sealedAt} IS NULL)`),
  appTenantPolicy: appTenantPolicy("final_accounts", table.companyId),
  backupReadPolicy: backupReadPolicy("final_accounts"),
  ownerMigrationPolicy: ownerMigrationPolicy("final_accounts"),
})).enableRLS();


/** Operational liveness only; no tenant, job, or user data. */
export const workerProcessHeartbeats = pgTable('worker_process_heartbeats', {
  instanceId: uuid('instance_id').primaryKey(),
  kind: text('kind').notNull(),
  revision: text('revision'),
  revisionSource: text('revision_source'),
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('worker_process_heartbeats_seen_at_idx').on(table.seenAt),
  check('worker_process_heartbeats_kind_check', sql`${table.kind} IN ('worker', 'ifc-worker')`),
  check('worker_process_heartbeats_revision_check', sql`${table.revision} IS NULL OR ${table.revision} ~ '^[A-Fa-f0-9]{7,64}$'`),
  check('worker_process_heartbeats_revision_source_check', sql`(${table.revision} IS NULL AND ${table.revisionSource} IS NULL) OR (${table.revision} IS NOT NULL AND ${table.revisionSource} IS NOT NULL AND ${table.revisionSource} IN ('build', 'env'))`),
  pgPolicy('worker_heartbeat_definer', { for: 'all', to: 'public', using: sql`current_user = 'bimmetraj_owner' AND session_user IN ('bimmetraj_worker', 'bimmetraj_control')`, withCheck: sql`current_user = 'bimmetraj_owner' AND session_user = 'bimmetraj_worker'` }),
  backupReadPolicy('worker_process_heartbeats'),
  ownerMigrationPolicy('worker_process_heartbeats'),
]).enableRLS();
