import crypto from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { adminAuditLogs, companies, plans, subscriptions, users } from "../../db/schema";
import {
  BILLING_CYCLE_IDS,
  type BillingCycleId,
  calculateBillingPeriodPricing,
  getBillingPeriodOption,
  normalizeBillingCycle,
} from "./billing-periods";

export interface BankAccount {
  id: string;
  bankName: string;
  branchName: string | null;
  accountHolder: string;
  iban: string;
  currency: "TRY" | "USD" | "EUR";
  descriptionNote: string | null;
  isActive: boolean;
}

export type PaymentRequestStatus =
  | "awaiting_transfer"
  | "pending_approval"
  | "approved"
  | "rejected";

export interface PaymentRequestRecord {
  requestId: string;
  referenceCode: string;
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  amountTry: number;
  billingCycle: BillingCycleId;
  bankAccountId: string | null;
  bankName: string | null;
  iban: string | null;
  senderName: string | null;
  receiptNumber: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  notes: string | null;
  status: PaymentRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  adminDecisionNote: string | null;
}

const DEFAULT_BANK_ACCOUNTS: readonly BankAccount[] = [
  {
    id: "bank-garanti-try",
    bankName: "Garanti BBVA",
    branchName: "Kurumsal / Ticari Şube",
    accountHolder: "BIMPlan Teknoloji ve Mühendislik Yazılımları",
    iban: "TR330006200012300006299010",
    currency: "TRY",
    descriptionNote: "Havale / FAST açıklama alanına Sipariş Referans Kodunuzu yazınız.",
    isActive: true,
  },
  {
    id: "bank-isbank-try",
    bankName: "Türkiye İş Bankası",
    branchName: "Ticari Şube",
    accountHolder: "BIMPlan Teknoloji ve Mühendislik Yazılımları",
    iban: "TR560006400000112345678901",
    currency: "TRY",
    descriptionNote: "EFT / Havale açıklamasına Sipariş Referans Kodunuzu ve Firma Ünvanınızı ekleyiniz.",
    isActive: true,
  },
];

export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

export function formatIban(raw: string): string {
  const clean = normalizeIban(raw);
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

const singleBankAccountSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    bankName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().max(120).nullable().optional(),
    accountHolder: z.string().trim().min(2).max(160),
    iban: z
      .string()
      .trim()
      .transform((v) => normalizeIban(v))
      .refine((v) => /^TR\d{2}[A-Z0-9]{22}$/.test(v) || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v), {
        message: "Geçerli bir IBAN giriniz (örn. TR ile başlayan 26 haneli IBAN).",
      }),
    currency: z.enum(["TRY", "USD", "EUR"]).optional(),
    descriptionNote: z.string().trim().max(280).nullable().optional(),
    description: z.string().trim().max(280).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .transform((item): BankAccount => ({
    id: item.id || `bank-${crypto.randomUUID().slice(0, 8)}`,
    bankName: item.bankName,
    branchName: item.branchName || null,
    accountHolder: item.accountHolder,
    iban: item.iban,
    currency: item.currency ?? "TRY",
    descriptionNote: item.descriptionNote ?? item.description ?? null,
    isActive: item.isActive ?? true,
  }));

const bankAccountsEnvelopeSchema = z.object({
  accounts: z.array(singleBankAccountSchema).min(1).max(20),
});

export function parseBankAccountsInput(input: unknown): BankAccount[] | null {
  const parsed = bankAccountsEnvelopeSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data.accounts;
}

export function parseEnvBankAccounts(envJson = process.env.PAYMENT_BANK_ACCOUNTS_JSON): BankAccount[] {
  if (!envJson || !envJson.trim()) {
    return DEFAULT_BANK_ACCOUNTS.map((item) => ({ ...item }));
  }
  try {
    const raw = JSON.parse(envJson);
    const list = Array.isArray(raw) ? raw : raw?.accounts;
    const parsed = z.array(singleBankAccountSchema).min(1).safeParse(list);
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Fallback to default bank accounts when env JSON is malformed
  }
  return DEFAULT_BANK_ACCOUNTS.map((item) => ({ ...item }));
}

export function generatePaymentReferenceCode(
  companyName: string,
  now = new Date(),
  randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase(),
): string {
  const asciiLetters = companyName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const consonants = asciiLetters.replace(/[AEIOU]/g, "");
  const prefix = (consonants.length >= 3 ? consonants : asciiLetters).slice(0, 3).padEnd(3, "X");
  const year = now.getUTCFullYear();
  return `BM-${year}-${prefix}-${randomSuffix.slice(0, 4).toUpperCase()}`;
}

export const submitBankTransferInputSchema = z
  .object({
    requestId: z.string().trim().min(3).max(80).optional(),
    planId: z.string().uuid(),
    billingCycle: z.enum(BILLING_CYCLE_IDS).default("monthly"),
    bankAccountId: z.string().trim().max(80).nullable().optional(),
    senderName: z.string().trim().min(2).max(160),
    receiptNumber: z.string().trim().max(120).nullable().optional(),
    transferReference: z.string().trim().max(120).nullable().optional(),
    taxOffice: z.string().trim().max(120).nullable().optional(),
    taxNumber: z.string().trim().max(32).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .transform((val) => ({
    ...val,
    receiptNumber: (val.receiptNumber || val.transferReference || "").trim() || null,
  }));

export const adminReviewPaymentInputSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    adminDecisionNote: z.string().trim().max(500).nullable().optional(),
    adminNote: z.string().trim().max(500).nullable().optional(),
  })
  .transform((val) => ({
    decision: val.decision,
    adminDecisionNote: val.adminDecisionNote ?? val.adminNote ?? null,
  }));

export interface AuditLogPaymentEvent {
  id: string;
  adminId: string;
  targetCompanyId: string | null;
  action: string;
  createdAt: Date | string;
  details: unknown;
}

const PAYMENT_ACTIONS = [
  "billing.payment_request.created",
  "billing.payment_request.submitted",
  "billing.payment_request.approved",
  "billing.payment_request.rejected",
] as const;

export function reconstructPaymentRequests(events: readonly AuditLogPaymentEvent[]): PaymentRequestRecord[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const byRequestId = new Map<string, PaymentRequestRecord>();

  for (const ev of sorted) {
    const d = (ev.details && typeof ev.createdAt !== "undefined" && typeof ev.details === "object"
      ? ev.details
      : {}) as Record<string, unknown>;
    const requestId = typeof d.requestId === "string" && d.requestId ? d.requestId : ev.id;
    const timestampIso = new Date(ev.createdAt).toISOString();
    const existing = byRequestId.get(requestId);

    if (ev.action === "billing.payment_request.created" || ev.action === "billing.payment_request.submitted") {
      const nextStatus: PaymentRequestStatus =
        ev.action === "billing.payment_request.submitted" ? "pending_approval" : "awaiting_transfer";
      byRequestId.set(requestId, {
        requestId,
        referenceCode:
          (typeof d.referenceCode === "string" && d.referenceCode) ||
          existing?.referenceCode ||
          `BM-2026-${requestId.slice(0, 4).toUpperCase()}`,
        companyId:
          (typeof d.companyId === "string" && d.companyId) ||
          ev.targetCompanyId ||
          existing?.companyId ||
          "",
        companyName:
          (typeof d.companyName === "string" && d.companyName) ||
          existing?.companyName ||
          "Firma",
        userId: (typeof d.userId === "string" && d.userId) || ev.adminId || existing?.userId || "",
        userEmail: (typeof d.userEmail === "string" && d.userEmail) || existing?.userEmail || "",
        planId: (typeof d.planId === "string" && d.planId) || existing?.planId || "",
        planName: (typeof d.planName === "string" && d.planName) || existing?.planName || "Paket",
        amountTry:
          typeof d.amountTry === "number"
            ? d.amountTry
            : existing?.amountTry ?? 0,
        billingCycle: d.billingCycle
          ? normalizeBillingCycle(d.billingCycle)
          : existing?.billingCycle ?? "monthly",
        bankAccountId:
          typeof d.bankAccountId === "string" ? d.bankAccountId : existing?.bankAccountId ?? null,
        bankName: typeof d.bankName === "string" ? d.bankName : existing?.bankName ?? null,
        iban: typeof d.iban === "string" ? d.iban : existing?.iban ?? null,
        senderName: typeof d.senderName === "string" ? d.senderName : existing?.senderName ?? null,
        receiptNumber:
          typeof d.receiptNumber === "string" ? d.receiptNumber : existing?.receiptNumber ?? null,
        taxOffice: typeof d.taxOffice === "string" ? d.taxOffice : existing?.taxOffice ?? null,
        taxNumber: typeof d.taxNumber === "string" ? d.taxNumber : existing?.taxNumber ?? null,
        notes: typeof d.notes === "string" ? d.notes : existing?.notes ?? null,
        status: existing?.status === "approved" ? "approved" : nextStatus,
        createdAt: existing?.createdAt ?? timestampIso,
        updatedAt: timestampIso,
        reviewedAt: existing?.reviewedAt ?? null,
        reviewedByAdminId: existing?.reviewedByAdminId ?? null,
        adminDecisionNote: existing?.adminDecisionNote ?? null,
      });
    } else if (
      (ev.action === "billing.payment_request.approved" ||
        ev.action === "billing.payment_request.rejected") &&
      existing
    ) {
      existing.status = ev.action === "billing.payment_request.approved" ? "approved" : "rejected";
      existing.updatedAt = timestampIso;
      existing.reviewedAt = timestampIso;
      existing.reviewedByAdminId =
        (typeof d.reviewedByAdminId === "string" && d.reviewedByAdminId) || ev.adminId;
      existing.adminDecisionNote =
        typeof d.adminDecisionNote === "string" ? d.adminDecisionNote : null;
    }
  }

  return Array.from(byRequestId.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getAllBankAccountsForAdmin(): Promise<BankAccount[]> {
  try {
    const [latest] = await db
      .select({ details: adminAuditLogs.details })
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.action, "billing.bank_accounts.updated"))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(1);

    if (latest?.details) {
      const parsed = parseBankAccountsInput(latest.details);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("[bank-transfer] Failed to read bank accounts from DB, using env fallback:", error);
  }
  return parseEnvBankAccounts();
}

export async function getActiveBankAccounts(): Promise<BankAccount[]> {
  const all = await getAllBankAccountsForAdmin();
  return all.filter((account) => account.isActive);
}

export async function saveBankAccountsByAdmin(adminId: string, accounts: BankAccount[]): Promise<BankAccount[]> {
  await db.insert(adminAuditLogs).values({
    adminId,
    action: "billing.bank_accounts.updated",
    details: { accounts, updatedAt: new Date().toISOString() },
  });
  return accounts;
}

export async function getCompanyPaymentRequests(companyId: string): Promise<PaymentRequestRecord[]> {
  const rows = await db
    .select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      targetCompanyId: adminAuditLogs.targetCompanyId,
      action: adminAuditLogs.action,
      createdAt: adminAuditLogs.createdAt,
      details: adminAuditLogs.details,
    })
    .from(adminAuditLogs)
    .where(
      and(
        eq(adminAuditLogs.targetCompanyId, companyId),
        inArray(adminAuditLogs.action, [...PAYMENT_ACTIONS]),
      ),
    )
    .orderBy(asc(adminAuditLogs.createdAt));

  return reconstructPaymentRequests(rows);
}

export async function getAllPaymentRequestsForAdmin(): Promise<PaymentRequestRecord[]> {
  const rows = await db
    .select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      targetCompanyId: adminAuditLogs.targetCompanyId,
      action: adminAuditLogs.action,
      createdAt: adminAuditLogs.createdAt,
      details: adminAuditLogs.details,
    })
    .from(adminAuditLogs)
    .where(inArray(adminAuditLogs.action, [...PAYMENT_ACTIONS]))
    .orderBy(asc(adminAuditLogs.createdAt));

  return reconstructPaymentRequests(rows);
}

export async function createInitialPaymentOrder(input: {
  tx?: any;
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string;
  planId: string;
  billingCycle?: BillingCycleId;
}): Promise<PaymentRequestRecord | null> {
  const runner = input.tx ?? db;
  const [selectedPlan] = await runner
    .select({
      id: plans.id,
      name: plans.name,
      monthlyPrice: plans.monthlyPrice,
      isActive: plans.isActive,
      isTrial: plans.isTrial,
    })
    .from(plans)
    .where(and(eq(plans.id, input.planId), eq(plans.isActive, true)))
    .limit(1);

  if (!selectedPlan || selectedPlan.isTrial || selectedPlan.monthlyPrice <= 0) {
    return null;
  }

  const cycle = normalizeBillingCycle(input.billingCycle);
  const pricing = calculateBillingPeriodPricing(selectedPlan.monthlyPrice, cycle);
  const requestId = crypto.randomUUID();
  const referenceCode = generatePaymentReferenceCode(input.companyName);
  const nowIso = new Date().toISOString();
  const details = {
    requestId,
    referenceCode,
    companyId: input.companyId,
    companyName: input.companyName,
    userId: input.userId,
    userEmail: input.userEmail,
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    amountTry: pricing.totalPayableTry,
    billingCycle: cycle,
    status: "awaiting_transfer" as const,
  };

  await runner.insert(adminAuditLogs).values({
    adminId: input.userId,
    targetCompanyId: input.companyId,
    action: "billing.payment_request.created",
    details,
  });

  return {
    ...details,
    bankAccountId: null,
    bankName: null,
    iban: null,
    senderName: null,
    receiptNumber: null,
    taxOffice: null,
    taxNumber: null,
    notes: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    reviewedAt: null,
    reviewedByAdminId: null,
    adminDecisionNote: null,
  };
}

export async function submitBankTransferNotification(input: {
  companyId: string;
  userId: string;
  payload: z.infer<typeof submitBankTransferInputSchema>;
}): Promise<PaymentRequestRecord> {
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, input.companyId))
    .limit(1);
  if (!company) {
    throw new Error("COMPANY_NOT_FOUND");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const [selectedPlan] = await db
    .select({
      id: plans.id,
      name: plans.name,
      monthlyPrice: plans.monthlyPrice,
      isActive: plans.isActive,
    })
    .from(plans)
    .where(and(eq(plans.id, input.payload.planId), eq(plans.isActive, true)))
    .limit(1);

  if (!selectedPlan || selectedPlan.monthlyPrice <= 0) {
    throw new Error("PAID_PLAN_REQUIRED");
  }

  const accounts = await getActiveBankAccounts();
  const chosenBank =
    accounts.find((a) => a.id === input.payload.bankAccountId) ?? accounts[0] ?? null;

  const existingRequests = await getCompanyPaymentRequests(input.companyId);
  const matchingExisting = existingRequests.find(
    (r) =>
      (input.payload.requestId && r.requestId === input.payload.requestId) ||
      (r.planId === selectedPlan.id && r.status === "awaiting_transfer"),
  );

  const requestId = matchingExisting?.requestId ?? crypto.randomUUID();
  const referenceCode =
    matchingExisting?.referenceCode ?? generatePaymentReferenceCode(company.name);

  if (input.payload.taxOffice || input.payload.taxNumber) {
    await db
      .update(companies)
      .set({
        ...(input.payload.taxOffice ? { taxOffice: input.payload.taxOffice } : {}),
        ...(input.payload.taxNumber ? { taxNumber: input.payload.taxNumber } : {}),
      })
      .where(eq(companies.id, input.companyId));
  }

  const pricing = calculateBillingPeriodPricing(
    selectedPlan.monthlyPrice,
    input.payload.billingCycle,
  );
  const amountTry = pricing.totalPayableTry;

  const details = {
    requestId,
    referenceCode,
    companyId: company.id,
    companyName: company.name,
    userId: input.userId,
    userEmail: user?.email ?? "",
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    amountTry,
    billingCycle: pricing.cycle,
    bankAccountId: chosenBank?.id ?? null,
    bankName: chosenBank?.bankName ?? null,
    iban: chosenBank?.iban ?? null,
    senderName: input.payload.senderName,
    receiptNumber: input.payload.receiptNumber,
    taxOffice: input.payload.taxOffice ?? null,
    taxNumber: input.payload.taxNumber ?? null,
    notes: input.payload.notes ?? null,
    status: "pending_approval" as const,
  };

  await db.insert(adminAuditLogs).values({
    adminId: input.userId,
    targetCompanyId: company.id,
    action: "billing.payment_request.submitted",
    details,
  });

  const updatedList = await getCompanyPaymentRequests(company.id);
  return updatedList.find((r) => r.requestId === requestId) ?? {
    ...details,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedByAdminId: null,
    adminDecisionNote: null,
  };
}

export async function reviewBankTransferByAdmin(input: {
  adminId: string;
  requestId: string;
  decision: "approved" | "rejected";
  adminDecisionNote?: string | null;
}): Promise<PaymentRequestRecord> {
  const allRequests = await getAllPaymentRequestsForAdmin();
  const target = allRequests.find((r) => r.requestId === input.requestId);
  if (!target) {
    throw new Error("PAYMENT_REQUEST_NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    if (input.decision === "approved") {
      const now = new Date();
      const durationDays = getBillingPeriodOption(target.billingCycle).durationDays;
      const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const [existingSub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, target.companyId))
        .for("update");

      if (existingSub) {
        await tx
          .update(subscriptions)
          .set({
            planId: target.planId,
            plan: "pro",
            status: "active",
            billingCycle: target.billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existingSub.id));
      } else {
        await tx.insert(subscriptions).values({
          companyId: target.companyId,
          planId: target.planId,
          plan: "pro",
          status: "active",
          billingCycle: target.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
      }

      await tx
        .update(companies)
        .set({ isSmartcheckEnabled: true })
        .where(eq(companies.id, target.companyId));
    }

    await tx.insert(adminAuditLogs).values({
      adminId: input.adminId,
      targetCompanyId: target.companyId,
      action:
        input.decision === "approved"
          ? "billing.payment_request.approved"
          : "billing.payment_request.rejected",
      details: {
        requestId: target.requestId,
        referenceCode: target.referenceCode,
        planId: target.planId,
        planName: target.planName,
        amountTry: target.amountTry,
        billingCycle: target.billingCycle,
        reviewedByAdminId: input.adminId,
        adminDecisionNote: input.adminDecisionNote ?? null,
        status: input.decision,
      },
    });
  });

  const refreshed = await getAllPaymentRequestsForAdmin();
  const updated = refreshed.find((r) => r.requestId === input.requestId);
  if (!updated) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
  return updated;
}
