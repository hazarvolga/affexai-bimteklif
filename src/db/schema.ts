import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  integer, 
  numeric, 
  pgEnum, 
  boolean,
  primaryKey
} from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["TRY", "USD", "EUR"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "negotiation", "won", "lost", "archived"]);
export const pipelineStageEnum = pgEnum("pipeline_stage", ["lead", "contacted", "quotation_sent", "negotiation", "won", "lost"]);
export const impactLevelEnum = pgEnum("impact_level", ["low", "medium", "high"]);
export const activityTypeEnum = pgEnum("activity_type", ["call", "email", "meeting", "quotation_update", "stage_change", "note"]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  source: text("source").default("manual"), // manual, referral, website, etc.
  notes: text("notes"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  quotationId: uuid("quotation_id").references(() => quotations.id),
  name: text("name").notNull(),
  stage: pipelineStageEnum("stage").default("lead").notNull(),
  value: numeric("value", { precision: 20, scale: 2 }).default("0"),
  probability: numeric("probability", { precision: 5, scale: 2 }).default("0"), // 0.00 to 1.00
  expectedCloseDate: timestamp("expected_close_date"),
  riskLevel: text("risk_level").default("low"), // low, medium, high
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
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const quotationFinancials = pgTable("quotation_financials", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull().unique(),
  totalCost: numeric("total_cost", { precision: 20, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 20, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 20, scale: 2 }).notNull(),
  margin: numeric("margin", { precision: 5, scale: 2 }).notNull(),
  riskScore: integer("risk_score").default(0).notNull(), // 0-100
  riskLevel: text("risk_level").notNull(), // LOW, MEDIUM, HIGH
  currencyExposure: text("currency_exposure"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "manager", "viewer"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["starter", "pro", "elite", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Optional if using OAuth only, but required for Module 8
  fullName: text("full_name").notNull(),
  emailVerified: timestamp("email_verified"),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  role: userRoleEnum("role").default("viewer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull().unique(),
  plan: subscriptionPlanEnum("plan").default("starter").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(), // monthly, yearly
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  feature: text("feature").notNull(), // ai_request, pdf_generation, quotation_creation, crm_activity
  count: integer("count").default(1).notNull(),
  tokensUsed: integer("tokens_used"),
  costEstimate: numeric("cost_estimate", { precision: 10, scale: 5 }),
  date: timestamp("date").defaultNow().notNull(),
});

export const usageAlerts = pgTable("usage_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  type: text("type").notNull(), // quota_80, quota_100, cost_spike
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

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["company", "person"] }).notNull(),
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
  subtotal: numeric("subtotal", { precision: 20, scale: 2 }).notNull(),
  discountTotal: numeric("discount_total", { precision: 20, scale: 2 }).notNull(),
  vatTotal: numeric("vat_total", { precision: 20, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 20, scale: 2 }).notNull(),
  revisionVersion: integer("revision_version").default(1).notNull(),
  parentId: uuid("parent_id"), // Points to the first version (V1)
  isLatest: boolean("is_latest").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }).default("20").notNull(),
  total: numeric("total", { precision: 20, scale: 2 }).notNull(),
});

export const regulationAlerts = pgTable("regulation_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  impactLevel: impactLevelEnum("impact_level").notNull(),
  summary: text("summary").notNull(),
  affectedModules: text("affected_modules").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
