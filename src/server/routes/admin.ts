import { crawlSourceIdentity, priceSourceIdentity, priceObservationMatchesSource } from "../crawler/source-identity";
import { isSourceReviewHistoryConflict } from "../pricing/source-delete-error";
import { assertCrawlSourceProof, CrawlSourceProofError, hasIndependentSourceAuthorization, SourceAuthorizationRequiredError } from "../crawler/source-proof";
import { isDeepStrictEqual } from "node:util";
import { claimCrawlSource, releaseCrawlSource } from "../crawler/crawl-claim";
import { Router, type Express } from "express";
import { authenticate, checkSuperAdmin } from "../middleware/auth";
import { db } from "../../db";
import { withAppTenant, withAppTenantTransaction, withSuperAdminQueueRead } from "../../db/app-tenant";
import { getControlDatabase } from "../../db/control-plane";
import { summarizeApprovedTransfers } from './admin-dashboard-metrics';
import {
  adminAuditLogs,
  companies,
  documentProcessingRuns,
  documents,
  memberships,
  plans,
  priceFeedStaging,
  pricingDataSources,
  subscriptions,
  usageRecords,
  users,
} from "../../db/schema";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  createPlanInput,
  updateCompanyAdminInput,
  updatePlanInput,
  updateSubscriptionInput,
  updateTenantMemberAdminInput,
} from "../admin/input";
import {
  AdminChangeError,
  createPlan,
  updateCompanyAdmin,
  updatePlan,
  updateSubscription,
  updateTenantMemberAdmin,
} from "../admin/changes";
import { deleteTenant, deleteTenantInput, previewTenantDeletion, removeTenantMember } from "../admin/tenant-deletion";
import { getExpertReviewerStatusMap } from "../admin/expert-reviewers";
import { readAdminTenants } from "../admin/stats";
import { AuthService } from "../../services/auth/authService";
import { consumeRateLimit } from "../auth/security";
import { isProcessingRunStale, processingRunningStaleMinutes, processingQueuedStaleMinutes } from "../../smartcheck/import/run-health";
import { changeProcessingRun, enqueueSmartCheckProcessing, ProcessingConflict, removePendingJob } from "../../smartcheck/import/service";
import { IfcNotAvailableError, IfcLimitsUnavailableError } from "../../smartcheck/import/config";
import { serializeCsv } from "../../lib/tabular-data";
import { canApproveCrawlerPrice } from "../crawler/provenance";
import { inferCrawledItemUnit } from "../crawler/price-parser";
import { priceCrawlerService } from "../crawler/priceCrawlerService";
import { priceSchedulerService } from "../crawler/priceSchedulerService";
import { bodyToken, setSessionCookies } from "../auth/session-cookie";
import { isAutomaticPricingSource } from "../crawler/source-eligibility";
import {
  adminReviewPaymentInputSchema,
  getAllBankAccountsForAdmin,
  getAllPaymentRequestsForAdmin,
  parseBankAccountsInput,
  reviewBankTransferByAdmin,
  saveBankAccountsByAdmin,
} from "../../services/billing/bank-transfer";
import {
  canonicalPlans,
  PLAN_CATALOG_VERSION,
} from "../../services/billing/plan-catalog";
import {
  canonicalPricingSources,
  PRICING_SOURCE_CATALOG_VERSION,
} from "../../services/pricing/source-catalog";

/** A DB heartbeat is only a process-reported signal, not container or deployment proof. */
async function readWorkerSignals() {
  try {
    const result = await getControlDatabase().db.execute<{ kind: unknown; last_seen: unknown; active_instances: unknown; revision: unknown; revision_source: unknown }>(sql`SELECT * FROM public.bimmetraj_worker_heartbeat_summary()`);
    if (result.rows.length !== 2) return null;
    const signals = result.rows.map(row => {
      if (row.kind !== 'worker' && row.kind !== 'ifc-worker') throw new Error('Invalid worker kind');
      if (row.active_instances == null || String(row.active_instances).trim() === '') throw new Error('Missing worker count');
      const activeInstances = Number(row.active_instances);
      if (!Number.isSafeInteger(activeInstances) || activeInstances < 0) throw new Error('Invalid worker count');
      const lastSeen = row.last_seen == null ? null : new Date(String(row.last_seen));
      if (lastSeen && !Number.isFinite(lastSeen.getTime())) throw new Error('Invalid worker timestamp');
      if (row.revision_source != null && row.revision_source !== 'build' && row.revision_source !== 'env') throw new Error('Invalid revision source');
      if (row.revision != null && (typeof row.revision !== 'string' || row.revision.length > 200)) throw new Error('Invalid revision');
      return { kind: row.kind, lastSeen: lastSeen?.toISOString() ?? null, activeInstances, revision: row.revision ?? null, revisionSource: row.revision_source ?? null };
    });
    return new Set(signals.map(signal => signal.kind)).size === 2 ? signals : null;
  } catch {
    return null;
  }
}

export function registerAdminRoutes(app: Express) {
  const router = Router();

  // ── Router-level Super Admin Authentication & Guards ─────────────────
  router.use(authenticate);
  router.use(checkSuperAdmin());
  router.use(async (req, res, next) => {
    // Impersonated tokens are strictly forbidden from accessing super admin endpoints
    if (req.user?.impersonatedBy) {
      return res.status(403).json({ error: "İdari işlemlere impersonate modunda erişilemez." });
    }
    // Rate limit super admin requests (120 req / minute per admin)
    const rate = await consumeRateLimit(`admin:${req.user.userId}`, 120, 60_000);
    if (!rate.allowed) {
      return res.status(429).set("Retry-After", String(rate.retryAfterSeconds)).json({
        error: "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.",
      });
    }
    next();
  });

  // 1. Dashboard Metrics
  router.get("/dashboard", async (req, res) => {
    try {
      // Toplam tenant sayısı (aktif/askıda vb.)
      const tenantsRes = await getControlDatabase().db.execute(sql`
        SELECT s.status, COUNT(c.id) as count
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        GROUP BY s.status
      `);
      const statusCounts = tenantsRes.rows.reduce((acc: any, row: any) => {
        acc[row.status || "unknown"] = Number(row.count);
        return acc;
      }, {});
      const totalTenants = Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0);

      // MRR ve Paket Dağılımı
      const mrrRes = await getControlDatabase().db.execute(sql`
        SELECT p.id, p.name, p.monthly_price, COUNT(s.id) as active_count
        FROM subscriptions s
        LEFT JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'active'
        GROUP BY p.id, p.name, p.monthly_price
      `);

      let totalMRR = 0;
      let missingPlanCount = 0;
      const planDistribution = mrrRes.rows.flatMap((row: any) => {
        const count = Number(row.active_count);
        if (!row.id || row.monthly_price == null) { missingPlanCount += count; return []; }
        const price = Number(row.monthly_price);
        totalMRR += count * price;
        return [{ name: row.name, count }];
      });

      // Approval events represent operator-reviewed bank transfers, not a bank statement.
      const approvals = await getControlDatabase().db.execute<{ details: unknown }>(sql`
        SELECT CASE WHEN jsonb_typeof(details->'requestId') = 'string' AND length(details->>'requestId') BETWEEN 1 AND 128
          AND jsonb_typeof(details->'amountTry') = 'number' AND length(details->>'amountTry') <= 20
          THEN jsonb_build_object('requestId', details->'requestId', 'amountTry', details->'amountTry') ELSE '{}'::jsonb END AS details
        FROM admin_audit_logs
        WHERE action = 'billing.payment_request.approved'
        ORDER BY created_at DESC, id DESC
        LIMIT 5001
      `);
      const approvedTransfersTotal = summarizeApprovedTransfers(approvals.rows);

      // Bu ayki toplam teklif ve IFC sayısı (usage_records üzerinden, mevcut ay formatı YYYY-MM)
      const usageRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(quote_count), 0) as total_quotes,
          COALESCE(SUM(ifc_count), 0) as total_ifcs
        FROM usage_records
        WHERE period = to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM')
      `);
      const totalQuotesThisMonth = Number(usageRes.rows[0]?.total_quotes || 0);
      const totalIfcThisMonth = Number(usageRes.rows[0]?.total_ifcs || 0);

      // Kuyruk Sağlık Metrikleri
      const queueRes = await withSuperAdminQueueRead(req.user.userId, (queueDb) => queueDb.execute(sql`
        SELECT
          COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_count,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_count,
          COUNT(CASE WHEN status = 'failed' AND completed_at >= clock_timestamp() - INTERVAL '24 hours' THEN 1 END) as failed_24h,
          COUNT(CASE WHEN status = 'succeeded' AND completed_at >= clock_timestamp() - INTERVAL '24 hours' THEN 1 END) as succeeded_24h,
          MIN(created_at) FILTER (WHERE status = 'queued') AS oldest_queued_at,
          CASE WHEN COUNT(*) FILTER (WHERE status = 'queued') = 0 THEN NULL ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - MIN(created_at) FILTER (WHERE status = 'queued'))))) END AS oldest_queued_age_seconds
        FROM document_processing_runs
      `));

      const queueStats = {
        queued: Number(queueRes.rows[0]?.queued_count || 0),
        running: Number(queueRes.rows[0]?.running_count || 0),
        failed24h: Number(queueRes.rows[0]?.failed_24h || 0),
        succeeded24h: Number(queueRes.rows[0]?.succeeded_24h || 0),
        oldestQueuedAt: queueRes.rows[0]?.oldest_queued_at ?? null,
        oldestQueuedAgeSeconds: queueRes.rows[0]?.oldest_queued_age_seconds == null ? null : Number(queueRes.rows[0].oldest_queued_age_seconds),
      };
      const workerSignals = await readWorkerSignals();

      return res.json({
        totalTenants,
        statusCounts,
        totalMRR: missingPlanCount ? null : totalMRR,
        missingPlanCount,
        approvedTransfersTotal,
        planDistribution,
        totalQuotesThisMonth,
        totalIfcThisMonth,
        queueStats,
        workerSignals,
      });
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      return res.status(500).json({ error: "Metrics fetch failed." });
    }
  });

  // 2. Tenants List
  router.get("/tenants", async (_req, res) => {
    try {
      return res.json(await readAdminTenants());
    } catch (error) {
      return res.status(503).json({ error: "Tenant quota stats unavailable" });
    }
  });

  // 3. Tenant Details (/api/admin/tenants/:companyId)
  router.get("/tenants/:companyId", async (req, res) => {
    try {
      const companyId = req.params.companyId;
      if (!z.string().uuid().safeParse(companyId).success) {
        return res.status(400).json({ error: "Geçersiz firma ID formatı" });
      }

      const [company] = await getControlDatabase().db.select().from(companies).where(eq(companies.id, companyId));
      if (!company) {
        return res.status(404).json({ error: "Firma bulunamadı" });
      }

      // Users and memberships
      const rawMembers = await getControlDatabase().db
        .select({
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          isSuperAdmin: users.isSuperAdmin,
          role: memberships.role,
          createdAt: memberships.createdAt,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.companyId, companyId));

      const expertMap = await getExpertReviewerStatusMap(rawMembers.map((m) => m.userId));
      const members = rawMembers.map(({ isSuperAdmin, ...member }) => ({
        ...member,
        isExpertReviewer: Boolean(isSuperAdmin || expertMap.get(member.userId)),
      }));

      // Subscription & Plan
      const [subscription] = await getControlDatabase().db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId));

      let plan = null;
      if (subscription?.planId) {
        const [planRow] = await getControlDatabase().db.select().from(plans).where(eq(plans.id, subscription.planId));
        plan = planRow ?? null;
      }

      // Usage history (last 6 months)
      const usageHistory = await db
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.companyId, companyId))
        .orderBy(desc(usageRecords.period))
        .limit(6);

      // Recent IFC/Processing runs
      const recentRuns = await withAppTenant(
        { companyId, userId: req.user.userId },
        (tenantDb) => tenantDb
          .select({
            runId: documentProcessingRuns.id,
            documentId: documentProcessingRuns.documentId,
            fileName: documents.originalFileName,
            status: documentProcessingRuns.status,
            currentStage: documentProcessingRuns.currentStage,
            errorCode: documentProcessingRuns.errorCode,
            errorMessage: documentProcessingRuns.errorMessage,
            createdAt: documentProcessingRuns.createdAt,
            completedAt: documentProcessingRuns.completedAt,
          })
          .from(documentProcessingRuns)
          .innerJoin(documents, eq(documents.id, documentProcessingRuns.documentId))
          .where(eq(documentProcessingRuns.companyId, companyId))
          .orderBy(desc(documentProcessingRuns.createdAt))
          .limit(10),
        { readOnly: true },
      );

      return res.json({
        company,
        members,
        subscription,
        plan,
        usageHistory,
        recentRuns,
      });
    } catch (error) {
      console.error("Tenant detail fetch error:", error);
      return res.status(500).json({ error: "Firma detayları yüklenemedi" });
    }
  });

  // 4. Update Tenant (/api/admin/tenants/:companyId)
  router.patch("/tenants/:companyId", async (req, res) => {
    try {
      const companyId = req.params.companyId;
      if (!z.string().uuid().safeParse(companyId).success) {
        return res.status(400).json({ error: "Geçersiz firma ID" });
      }

      // 1. Subscription updates (plan, status, bonus limits)
      const subInput = updateSubscriptionInput.safeParse(req.body);
      if (subInput.success) {
        await updateSubscription(req.user.userId, companyId, subInput.data);
      }

      // 2. Company admin updates (isSmartcheckEnabled, adminNotes)
      const companyInput = updateCompanyAdminInput.safeParse(req.body);
      if (companyInput.success) {
        await updateCompanyAdmin(req.user.userId, companyId, companyInput.data);
      }

      if (!subInput.success && !companyInput.success) {
        return res.status(400).json({ error: "Güncellenecek geçerli bir alan bulunamadı" });
      }

      return res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminChangeError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Firma güncellenemedi" });
    }
  });

  const sendAdminChangeError = (res: any, error: unknown, fallback: string) => {
    if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
  };

  router.get("/tenants/:companyId/deletion-preview", async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.companyId).success) return res.status(400).json({ error: "Geçersiz firma ID" });
    try {
      return res.json(await previewTenantDeletion(req.user.userId, req.params.companyId));
    } catch (error) {
      return sendAdminChangeError(res, error, "Silme kontrolü yapılamadı");
    }
  });

  router.delete("/tenants/:companyId", async (req, res) => {
    const input = deleteTenantInput.safeParse(req.body);
    if (!z.string().uuid().safeParse(req.params.companyId).success || !input.success) return res.status(400).json({ error: "Geçersiz firma silme isteği" });
    try {
      return res.json({ success: true, ...await deleteTenant(req.user.userId, req.params.companyId, input.data.confirmName) });
    } catch (error) {
      return sendAdminChangeError(res, error, "Firma silinemedi");
    }
  });

  router.delete("/tenants/:companyId/members/:userId", async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.companyId).success || !z.string().uuid().safeParse(req.params.userId).success) {
      return res.status(400).json({ error: "Geçersiz firma veya kullanıcı ID formatı" });
    }
    try {
      return res.json({ success: true, ...await removeTenantMember(req.user.userId, req.params.companyId, req.params.userId) });
    } catch (error) {
      return sendAdminChangeError(res, error, "Kullanıcı firmadan çıkarılamadı");
    }
  });

  // 4b. Update Tenant Member Role & UZMAN Expert Reviewer Authority (/api/admin/tenants/:companyId/members/:userId)
  router.patch("/tenants/:companyId/members/:userId", async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const userId = req.params.userId;
      if (!z.string().uuid().safeParse(companyId).success || !z.string().uuid().safeParse(userId).success) {
        return res.status(400).json({ error: "Geçersiz firma veya kullanıcı ID formatı" });
      }

      const memberInput = updateTenantMemberAdminInput.safeParse(req.body);
      if (!memberInput.success) {
        return res.status(400).json({ error: "Güncellenecek geçerli bir rol veya uzman yetkisi alanı bulunamadı" });
      }

      const member = await updateTenantMemberAdmin(req.user.userId, companyId, userId, memberInput.data);
      return res.json({ success: true, member });
    } catch (error) {
      if (error instanceof AdminChangeError) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Kullanıcı rolü veya uzman yetkisi güncellenemedi" });
    }
  });

  // 5. Plans List
  router.get("/plans", async (_req, res) => {
    try {
      const [allPlans, allSubs] = await Promise.all([
        getControlDatabase().db.select().from(plans),
        getControlDatabase().db
          .select({
            planId: subscriptions.planId,
            companyId: subscriptions.companyId,
            companyName: companies.name,
            status: subscriptions.status,
          })
          .from(subscriptions)
          .innerJoin(companies, eq(companies.id, subscriptions.companyId)),
      ]);

      const subsByPlanId = new Map<string, Array<{ companyId: string; companyName: string; status: string }>>();
      for (const sub of allSubs) {
        if (!sub.planId) continue;
        const list = subsByPlanId.get(sub.planId) ?? [];
        list.push({
          companyId: sub.companyId,
          companyName: sub.companyName,
          status: sub.status,
        });
        subsByPlanId.set(sub.planId, list);
      }

      const enrichedPlans = allPlans
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder || a.monthlyPrice - b.monthlyPrice)
        .map((plan) => {
          const subscribers = subsByPlanId.get(plan.id) ?? [];
          return {
            ...plan,
            subscriberCount: subscribers.length,
            subscribers,
          };
        });

      return res.json(enrichedPlans);
    } catch (error) {
      return res.status(500).json({ error: "Paketler getirilemedi." });
    }
  });

  // 6. Create Plan
  router.post("/plans", async (req, res) => {
    try {
      const input = createPlanInput.safeParse(req.body);
      if (!input.success) return res.status(400).json({ error: "Geçersiz paket alanları" });
      const newPlan = await createPlan(req.user.userId, input.data);
      return res.status(201).json(newPlan);
    } catch (error) {
      return res.status(500).json({ error: "Paket oluşturulamadı." });
    }
  });

  // 6b. Sync Canonical Plan Catalog (Prices & Server-Safe Quotas)
  router.post("/plans/sync-catalog", async (req, res) => {
    try {
      await getControlDatabase().db.transaction(async (tx) => {
        for (const item of canonicalPlans) {
          await tx
            .insert(plans)
            .values({
              id: item.id,
              name: item.name,
              monthlyPrice: item.monthlyPrice,
              monthlyQuoteLimit: item.monthlyQuoteLimit,
              monthlyIfcLimit: item.monthlyIfcLimit,
              ifcMaxFileMb: item.ifcMaxFileMb,
              ifcMaxConcurrent: item.ifcMaxConcurrent,
              monthlyAiLimit: item.monthlyAiLimit,
              monthlyPdfLimit: item.monthlyPdfLimit,
              monthlyCrmLimit: item.monthlyCrmLimit,
              monthlyRegulationLimit: item.monthlyRegulationLimit,
              monthlyProfitAnalysisLimit: item.monthlyProfitAnalysisLimit,
              storageMaxBytes: item.storageMaxBytes,
              maxDocuments: item.maxDocuments,
              isTrial: item.isTrial,
              isActive: item.isActive,
              isPublished: item.isPublished,
              isFeatured: item.isFeatured,
              displayOrder: item.displayOrder,
              marketingBadge: item.marketingBadge,
              marketingDescription: item.marketingDescription,
            })
            .onConflictDoUpdate({
              target: plans.id,
              set: {
                name: item.name,
                monthlyPrice: item.monthlyPrice,
                monthlyQuoteLimit: item.monthlyQuoteLimit,
                monthlyIfcLimit: item.monthlyIfcLimit,
                ifcMaxFileMb: item.ifcMaxFileMb,
                ifcMaxConcurrent: item.ifcMaxConcurrent,
                monthlyAiLimit: item.monthlyAiLimit,
                monthlyPdfLimit: item.monthlyPdfLimit,
                monthlyCrmLimit: item.monthlyCrmLimit,
                monthlyRegulationLimit: item.monthlyRegulationLimit,
                monthlyProfitAnalysisLimit: item.monthlyProfitAnalysisLimit,
                storageMaxBytes: item.storageMaxBytes,
                maxDocuments: item.maxDocuments,
                isTrial: item.isTrial,
                isActive: item.isActive,
                isPublished: item.isPublished,
                isFeatured: item.isFeatured,
                displayOrder: item.displayOrder,
                marketingBadge: item.marketingBadge,
                marketingDescription: item.marketingDescription,
              },
            });
        }
      });

      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        action: "plan_catalog.synced",
        details: {
          version: PLAN_CATALOG_VERSION,
          syncedPlanIds: canonicalPlans.map((p) => p.id),
        },
      });

      return res.json({
        success: true,
        version: PLAN_CATALOG_VERSION,
        count: canonicalPlans.length,
      });
    } catch (error) {
      console.error("Plan catalog sync error:", error);
      return res.status(500).json({ error: "Standart paket kataloğu senkronize edilemedi." });
    }
  });

  // 7. Update Plan
  router.patch("/plans/:id", async (req, res) => {
    try {
      const input = updatePlanInput.safeParse(req.body);
      if (!input.success || !z.string().uuid().safeParse(req.params.id).success) {
        return res.status(400).json({ error: "Geçersiz paket bilgileri" });
      }
      const updatedPlan = await updatePlan(req.user.userId, req.params.id, input.data);
      return res.json(updatedPlan);
    } catch (error) {
      if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
      return res.status(500).json({ error: "Paket güncellenemedi." });
    }
  });

  // 8. Impersonate Tenant (/api/admin/impersonate)
  router.post("/impersonate", async (req, res) => {
    try {
      const schema = z.object({
        targetCompanyId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        targetUserId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
        allowWrite: z.boolean().optional(),
        readOnly: z.boolean().optional(),
      }).refine((data) => Boolean(data.targetCompanyId || data.companyId), {
        message: "targetCompanyId veya companyId parametresi gereklidir.",
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Geçersiz istek parametreleri",
          details: parsed.error.issues 
        });
      }

      const targetCompanyId = (parsed.data.targetCompanyId || parsed.data.companyId)!;
      let targetUserId = parsed.data.targetUserId || parsed.data.userId;
      // Impersonation is strictly read-only to preserve tenant Maker-Checker and suspended-tenant invariants
      const allowWrite = false;

      if (targetUserId) {
        const [verifiedMembership] = await db
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(and(eq(memberships.companyId, targetCompanyId), eq(memberships.userId, targetUserId)))
          .limit(1);
        if (!verifiedMembership) {
          return res.status(404).json({ error: "Belirtilen kullanıcı bu firmanın üyesi değil." });
        }
      } else {
        // Find owner or admin of the company
        const [ownerMembership] = await db
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(eq(memberships.companyId, targetCompanyId))
          .orderBy(
            sql`CASE ${memberships.role} WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END`
          )
          .limit(1);

        if (!ownerMembership) {
          return res.status(404).json({ error: "Bu firmaya atanmış kullanıcı bulunamadı." });
        }
        targetUserId = ownerMembership.userId;
      }

      // Generate 15-minute token with read-only impersonation claims
      const token = AuthService.generateImpersonationToken({
        userId: targetUserId,
        companyId: targetCompanyId,
        impersonatedBy: req.user.userId,
        mfaEpoch: req.user.mfaEpoch,
        mfaCredentialVersion: req.user.mfaCredentialVersion,
        readOnly: true,
      });

      // Audit log
      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        targetCompanyId,
        action: "impersonation.started",
        details: {
          targetUserId,
          allowWrite,
          clientIp: req.ip || req.socket.remoteAddress,
        },
      });

      setSessionCookies(res, token, { impersonation: true });
      return res.json({
        token: bodyToken(req, token),
        expiresInSeconds: 900,
        readOnly: !allowWrite,
        companyId: targetCompanyId,
        userId: targetUserId,
      });
    } catch (error) {
      console.error("Impersonation error:", error);
      return res.status(500).json({ error: "Impersonate token üretilemedi." });
    }
  });

  // 9. IFC Queue Monitoring (/api/admin/queue)
  router.get("/queue", async (req, res) => {
    try {
      const { status, companyId, kind, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const runningMinutes = processingRunningStaleMinutes();
      const queuedMinutes = processingQueuedStaleMinutes();

      const whereConditions: SQL[] = [];

      if (companyId) {
        if (!z.string().uuid().safeParse(companyId).success) {
          return res.status(400).json({ error: "Geçersiz firma ID formatı" });
        }
        whereConditions.push(eq(documentProcessingRuns.companyId, companyId));
      }

      if (status) {
        if (status === 'stale') {
          whereConditions.push(sql`
            ((${documentProcessingRuns.status} = 'running' AND COALESCE(${documentProcessingRuns.updatedAt}, ${documentProcessingRuns.startedAt}, ${documentProcessingRuns.createdAt}) <= NOW() - interval '1 minute' * ${runningMinutes})
             OR (${documentProcessingRuns.status} = 'queued' AND COALESCE(${documentProcessingRuns.updatedAt}, ${documentProcessingRuns.createdAt}) <= NOW() - interval '1 minute' * ${queuedMinutes}))
          `);
        } else if (['queued', 'running', 'succeeded', 'failed'].includes(status)) {
          whereConditions.push(eq(documentProcessingRuns.status, status as any));
        } else {
          return res.status(400).json({ error: "Geçersiz durum filtresi" });
        }
      }

      if (kind) {
        if (kind === 'ifc') {
          whereConditions.push(sql`(${documents.originalFileName} ILIKE '%.ifc' OR ${documents.mimeType} IN ('model/ifc', 'application/ifc'))`);
        } else if (kind === 'xlsx') {
          whereConditions.push(sql`(${documents.originalFileName} ILIKE '%.xlsx')`);
        } else if (kind === 'csv') {
          whereConditions.push(sql`(${documents.originalFileName} ILIKE '%.csv' OR ${documents.mimeType} = 'text/csv')`);
        } else {
          return res.status(400).json({ error: "Geçersiz tür filtresi" });
        }
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [companyRows, { summaryExec, total, rawRuns }] = await Promise.all([
        getControlDatabase().db.select({ id: companies.id, name: companies.name }).from(companies),
        withSuperAdminQueueRead(req.user.userId, async (queueDb) => {
          const summaryExec = await queueDb.execute<{
            pending: string;
            running: string;
            stale: string;
            failed24h: string;
            completed24h: string;
            oldestQueuedAt: Date | null;
            oldestQueuedAgeSeconds: string | null;
          }>(sql`
            SELECT
              COUNT(*) FILTER (WHERE ${documentProcessingRuns.status} = 'queued') AS pending,
              COUNT(*) FILTER (WHERE ${documentProcessingRuns.status} = 'running') AS running,
              COUNT(*) FILTER (
                WHERE (${documentProcessingRuns.status} = 'running' AND COALESCE(${documentProcessingRuns.updatedAt}, ${documentProcessingRuns.startedAt}, ${documentProcessingRuns.createdAt}) <= NOW() - interval '1 minute' * ${runningMinutes})
                   OR (${documentProcessingRuns.status} = 'queued' AND COALESCE(${documentProcessingRuns.updatedAt}, ${documentProcessingRuns.createdAt}) <= NOW() - interval '1 minute' * ${queuedMinutes})
              ) AS stale,
              COUNT(*) FILTER (WHERE ${documentProcessingRuns.status} = 'failed' AND ${documentProcessingRuns.completedAt} >= NOW() - interval '24 hours') AS failed24h,
              COUNT(*) FILTER (WHERE ${documentProcessingRuns.status} = 'succeeded' AND ${documentProcessingRuns.completedAt} >= NOW() - interval '24 hours') AS completed24h,
              MIN(${documentProcessingRuns.createdAt}) FILTER (WHERE ${documentProcessingRuns.status} = 'queued') AS "oldestQueuedAt",
              CASE WHEN COUNT(*) FILTER (WHERE ${documentProcessingRuns.status} = 'queued') = 0 THEN NULL ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - MIN(${documentProcessingRuns.createdAt}) FILTER (WHERE ${documentProcessingRuns.status} = 'queued'))))) END AS "oldestQueuedAgeSeconds"
            FROM ${documentProcessingRuns}
          `);
          const [{ total }] = await queueDb
            .select({ total: sql<number>`count(*)::int` })
            .from(documentProcessingRuns)
            .innerJoin(documents, eq(documents.id, documentProcessingRuns.documentId))
            .where(whereClause);
          const rawRuns = await queueDb
            .select({
              runId: documentProcessingRuns.id,
              companyId: documentProcessingRuns.companyId,
              documentId: documentProcessingRuns.documentId,
              fileName: documents.originalFileName,
              fileSizeBytes: documents.fileSizeBytes,
              status: documentProcessingRuns.status,
              currentStage: documentProcessingRuns.currentStage,
              progressPercent: documentProcessingRuns.progressPercent,
              errorCode: documentProcessingRuns.errorCode,
              errorMessage: documentProcessingRuns.errorMessage,
              createdAt: documentProcessingRuns.createdAt,
              updatedAt: documentProcessingRuns.updatedAt,
              startedAt: documentProcessingRuns.startedAt,
              completedAt: documentProcessingRuns.completedAt,
            })
            .from(documentProcessingRuns)
            .innerJoin(documents, eq(documents.id, documentProcessingRuns.documentId))
            .where(whereClause)
            .orderBy(desc(documentProcessingRuns.createdAt))
            .limit(limitNum)
            .offset(offset);
          return { summaryExec, total, rawRuns };
        }),
      ]);

      const companyNameById = new Map(companyRows.map((c) => [c.id, c.name]));
      const summaryResult = summaryExec.rows[0];
      const summary = {
        queued: Number(summaryResult?.pending ?? 0),
        pending: Number(summaryResult?.pending ?? 0),
        running: Number(summaryResult?.running ?? 0),
        stale: Number(summaryResult?.stale ?? 0),
        failed24h: Number(summaryResult?.failed24h ?? 0),
        completed24h: Number(summaryResult?.completed24h ?? 0),
        succeeded24h: Number(summaryResult?.completed24h ?? 0),
        oldestQueuedAt: summaryResult?.oldestQueuedAt ?? null,
        oldestQueuedAgeSeconds: summaryResult?.oldestQueuedAgeSeconds == null ? null : Number(summaryResult.oldestQueuedAgeSeconds),
      };
      const runs = rawRuns.map((r) => ({
        ...r,
        companyName: companyNameById.get(r.companyId) ?? "Bilinmeyen Firma",
      }));

      const now = new Date();
      const enrichedRuns = runs.map((r) => {
        const ext = r.fileName.toLowerCase().split('.').pop() || '';
        const itemKind = ext === 'ifc' ? 'ifc' : ext === 'xlsx' ? 'xlsx' : ext === 'csv' ? 'csv' : 'document';
        const isStale = isProcessingRunStale(r, now, { runningMinutes, queuedMinutes });
        return {
          ...r,
          id: r.runId,
          kind: itemKind,
          finishedAt: r.completedAt,
          isStale,
        };
      });

      return res.json({
        summary,
        workerSignals: await readWorkerSignals(),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
        runs: enrichedRuns,
        jobs: enrichedRuns,
      });
    } catch (error) {
      console.error("Queue monitoring error:", error);
      return res.status(500).json({ error: "Kuyruk durumu alınamadı" });
    }
  });

  // 10. Queue Recover Stale Job (/api/admin/queue/recover)
  router.post("/queue/recover", async (req, res) => {
    try {
      const { runId } = req.body ?? {};
      if (!z.string().uuid().safeParse(runId).success) {
        return res.status(400).json({ error: "Geçersiz işlem ID" });
      }

      const [targetRun] = await withSuperAdminQueueRead(req.user.userId, (queueDb) =>
        queueDb
          .select({
            id: documentProcessingRuns.id,
            companyId: documentProcessingRuns.companyId,
            documentId: documentProcessingRuns.documentId,
          })
          .from(documentProcessingRuns)
          .where(eq(documentProcessingRuns.id, runId)),
      );
      if (!targetRun) throw new AdminChangeError(404, "İşlem bulunamadı");

      const result = await withAppTenantTransaction(
        { companyId: targetRun.companyId, userId: req.user.userId },
        async (tx) => {
          const [run] = await tx
            .select()
            .from(documentProcessingRuns)
            .where(eq(documentProcessingRuns.id, runId))
            .for("update");

          if (!run) throw new AdminChangeError(404, "İşlem bulunamadı");
          if (!isProcessingRunStale(run)) {
            throw new AdminChangeError(400, "İşlem stale durumda değil");
          }

          await removePendingJob(tx, run.id);
          const now = new Date();
          const [updatedRun] = await tx
            .update(documentProcessingRuns)
            .set({
              status: "failed",
              currentStage: "failed",
              errorCode: "WORKER_STALE",
              errorMessage: "Süper admin tarafından stale olarak işaretlendi",
              workerJobId: null,
              workerLeaseToken: null,
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(documentProcessingRuns.id, run.id))
            .returning();

          await tx
            .update(documents)
            .set({ status: "failed", updatedAt: now })
            .where(eq(documents.id, run.documentId));

          await tx.insert(adminAuditLogs).values({
            adminId: req.user.userId,
            targetCompanyId: run.companyId,
            action: "processing_stale_recovered",
            details: { runId: run.id, documentId: run.documentId },
          });

          return updatedRun;
        },
      );

      return res.json({ success: true, run: result });
    } catch (error) {
      if (error instanceof ProcessingConflict) {
        return res.status(error.status).json({
          error: error.code === 'PROCESSING_JOB_ACTIVE' ? "İşlem halen bir çalışan tarafından yürütülüyor." : error.message,
          code: error.code,
        });
      }
      if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
      console.error("Queue recover error:", error);
      return res.status(500).json({ error: "İşlem kurtarılamadı" });
    }
  });

  // 11. Queue Retry Failed Job (/api/admin/queue/retry)
  router.post("/queue/retry", async (req, res) => {
    try {
      const { runId } = req.body ?? {};
      if (!z.string().uuid().safeParse(runId).success) {
        return res.status(400).json({ error: "Geçersiz işlem ID" });
      }

      const [run] = await withSuperAdminQueueRead(req.user.userId, (queueDb) =>
        queueDb
          .select({
            id: documentProcessingRuns.id,
            companyId: documentProcessingRuns.companyId,
            documentId: documentProcessingRuns.documentId,
          })
          .from(documentProcessingRuns)
          .where(eq(documentProcessingRuns.id, runId)),
      );

      if (!run) {
        return res.status(404).json({ error: "İşlem bulunamadı" });
      }

      const result = await changeProcessingRun({
        companyId: run.companyId,
        userId: req.user.userId,
        documentId: run.documentId,
        action: "retry",
        isAdmin: true,
        targetRunId: run.id,
      });

      return res.status(202).json({ success: true, run: result.run });
    } catch (error) {
      if (error instanceof ProcessingConflict) {
        return res.status(error.status).json({
          error: error.message && error.message !== error.code ? error.message : "İşlem yeniden başlatılamadı",
          code: error.code,
        });
      }
      if (error instanceof IfcNotAvailableError || error instanceof IfcLimitsUnavailableError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
      console.error("Queue retry error:", error);
      return res.status(500).json({ error: "İşlem yeniden başlatılamadı" });
    }
  });

  // 12. Usage & Reports (/api/admin/reports/usage)
  router.get("/reports/usage", async (_req, res) => {
    try {
      // Top 10 consumers this month
      const topConsumers = await getControlDatabase().db.execute(sql`
        SELECT
          c.id, c.name,
          COALESCE(SUM(ur.quote_count), 0) as total_quotes,
          COALESCE(SUM(ur.ifc_count), 0) as total_ifcs
        FROM companies c
        JOIN usage_records ur ON ur.company_id = c.id
        WHERE ur.period = to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM')
        GROUP BY c.id, c.name
        ORDER BY total_quotes DESC, total_ifcs DESC
        LIMIT 10
      `);

      // Monthly aggregate stats for last 6 months
      const monthlyTrends = await db.execute(sql`
        SELECT
          LEFT(period, 7) as period,
          SUM(quote_count) as total_quotes,
          SUM(ifc_count) as total_ifcs
        FROM usage_records
        GROUP BY LEFT(period, 7)
        ORDER BY LEFT(period, 7) DESC
        LIMIT 6
      `);

      return res.json({
        topConsumers: topConsumers.rows,
        monthlyTrends: monthlyTrends.rows,
      });
    } catch (error) {
      console.error("Reports usage error:", error);
      return res.status(500).json({ error: "Rapor verileri alınamadı" });
    }
  });

  // 13. Reports CSV Export (/api/admin/reports/export)
  router.get("/reports/export", async (_req, res) => {
    try {
      const tenants = await readAdminTenants();
      const headers = [
        "Firma Adı",
        "E-posta",
        "Paket",
        "Abonelik Durumu",
        "Teklif Kullanımı",
        "Teklif Kotası",
        "IFC Kullanımı",
        "IFC Kotası",
        "SmartCheck Açık mı",
        "Kayıt Tarihi",
      ];

      const csvRows = [headers, ...(tenants as any[]).map((t) => [
          t.name,
          t.owner_email || "-",
          t.plan_name || "-",
          t.subscription_status || "-",
          Number(t.current_usage),
          t.quota_limit != null ? Number(t.quota_limit) : "Sınırsız",
          Number(t.current_ifc_usage || 0),
          t.ifc_limit != null ? Number(t.ifc_limit) : "Sınırsız",
          t.is_smartcheck_enabled ? "Evet" : "Hayır",
          t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : "-",
        ])];

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="teklifpro_tenants_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.send(serializeCsv(csvRows, { delimiter: ",", bom: true }));
    } catch (error) {
      console.error("CSV export error:", error);
      return res.status(500).json({ error: "CSV dışa aktarım başarısız" });
    }
  });

  // 12. Pricing Data Sources & Crawler Governance
  router.get("/pricing-sources", async (_req, res) => {
    try {
      let sources = await db
        .select()
        .from(pricingDataSources)
        .orderBy(pricingDataSources.category, pricingDataSources.name);

      if (sources.length === 0) {
        const now = new Date();
        await db
          .insert(pricingDataSources)
          .values(
            canonicalPricingSources.map((source) => ({
              ...source,
              createdAt: now,
              updatedAt: now,
            }))
          )
          .onConflictDoNothing({ target: pricingDataSources.code });

        sources = await db
          .select()
          .from(pricingDataSources)
          .orderBy(pricingDataSources.category, pricingDataSources.name);
      }

      const pendingCounts = await db
        .select({
          sourceId: priceFeedStaging.sourceId,
          count: sql<number>`count(*)::int`,
        })
        .from(priceFeedStaging)
        .where(eq(priceFeedStaging.status, "pending"))
        .groupBy(priceFeedStaging.sourceId);

      const countMap = new Map(pendingCounts.map((r) => [r.sourceId, r.count]));

      const enriched = sources.map((s) => ({
        ...s,
        pendingReviewCount: countMap.get(s.id) || 0,
      }));

      return res.json(enriched);
    } catch (error) {
      console.error("Admin pricing sources fetch error:", error);
      return res.status(500).json({ error: "Veri kaynakları yüklenemedi." });
    }
  });

  // 12.0 Sync Canonical Pricing Source Catalog
  router.post("/pricing-sources/sync-catalog", async (req, res) => {
    try {
      const now = new Date();
      await db
        .insert(pricingDataSources)
        .values(
          canonicalPricingSources.map((source) => ({
            ...source,
            createdAt: now,
            updatedAt: now,
          }))
        )
        .onConflictDoNothing({ target: pricingDataSources.code });

      const sources = await db
        .select()
        .from(pricingDataSources)
        .orderBy(pricingDataSources.category, pricingDataSources.name);

      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        action: "pricing_source_catalog_synced",
        details: {
          catalogVersion: PRICING_SOURCE_CATALOG_VERSION,
          canonicalCount: canonicalPricingSources.length,
          totalSources: sources.length,
        },
      });

      return res.json({
        success: true,
        catalogVersion: PRICING_SOURCE_CATALOG_VERSION,
        sources,
      });
    } catch (error) {
      console.error("Admin sync pricing source catalog error:", error);
      return res.status(500).json({ error: "Standart veri kaynakları senkronize edilemedi." });
    }
  });

  // 12a. Create New Pricing Source Manually
  router.post("/pricing-sources", async (req, res) => {
    try {
      const createSchema = z.object({
        name: z.string().min(2, "Kaynak adı en az 2 karakter olmalıdır"),
        code: z.string().min(2).regex(/^[a-z0-9_]+$/, "Kod yalnızca küçük harf, rakam ve alt çizgi içerebilir"),
        authority: z.string().optional().default(""),
        category: z.enum(["official_gazette", "tuik_index", "market_commodity", "epys_standard"]),
        sourceUrl: z.string().url("Geçerli bir web adresi giriniz"),
        syncFrequency: z.enum(["realtime", "daily", "weekly", "monthly", "annually"]).default("monthly"),
        versionTag: z.string().default("2026/1"),
        autoApprove: z.boolean().optional(),
      });

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" });
      }

      const { name, code, authority, category, sourceUrl, syncFrequency, versionTag, autoApprove } = parsed.data;

      // Check code uniqueness
      const existing = await db
        .select({ id: pricingDataSources.id })
        .from(pricingDataSources)
        .where(eq(pricingDataSources.code, code))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ error: "Bu kod adına sahip bir veri kaynağı zaten mevcut." });
      }

      const now = new Date();
      const validityDays = category === "market_commodity" ? 90 : 365;
      const validityEnd = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
      const [inserted] = await db
        .insert(pricingDataSources)
        .values({
          name,
          code,
          authority: authority || "Yetkili Kurum Belirtilmedi",
          category,
          sourceUrl,
          syncFrequency,
          versionTag,
          status: "active",
          itemCount: 0,
          validityStart: now,
          validityEnd,
          crawlerConfig: {
            autoApprove: autoApprove ?? (category === "market_commodity"),
          },
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        action: "pricing_source_created",
        details: {
          sourceId: inserted.id,
          code: inserted.code,
          name: inserted.name,
          url: inserted.sourceUrl,
        },
      });

      return res.status(201).json(inserted);
    } catch (error) {
      console.error("Admin create pricing source error:", error);
      return res.status(500).json({ error: "Veri kaynağı eklenemedi." });
    }
  });

  // 12b. Verify & Activate Pricing Source (and configure automatic tracking)
  router.post("/pricing-sources/:id/verify", async (req, res) => {
    try {
      const id = req.params.id;
      if (!z.string().uuid().safeParse(id).success) {
        return res.status(400).json({ error: "Geçersiz kaynak ID" });
      }

      const verifySchema = z.object({
        versionTag: z.string().min(1).max(60).optional(),
        sourceUrl: z.string().url("Geçerli bir web adresi giriniz").optional(),
        authority: z.string().max(150).optional(),
        syncFrequency: z.enum(["realtime", "daily", "weekly", "monthly", "annually"]).optional(),
        validityStart: z.string().optional(),
        validityEnd: z.string().optional(),
        autoApprove: z.boolean().optional(),
      });

      const parsed = verifySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Geçersiz doğrulama parametreleri" });
      }

      const [existing] = await db
        .select()
        .from(pricingDataSources)
        .where(eq(pricingDataSources.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Kaynak bulunamadı." });
      }

      const now = new Date();
      const defaultValidityDays = existing.category === "market_commodity" ? 90 : 365;
      const defaultValidityEnd = new Date(now.getTime() + defaultValidityDays * 24 * 60 * 60 * 1000);

      const parsedStart = parsed.data.validityStart ? new Date(parsed.data.validityStart) : null;
      const parsedEnd = parsed.data.validityEnd
        ? new Date(
            parsed.data.validityEnd.length === 10
              ? `${parsed.data.validityEnd}T23:59:59.999Z`
              : parsed.data.validityEnd
          )
        : null;

      const validityStart =
        parsedStart && !Number.isNaN(parsedStart.getTime())
          ? parsedStart
          : existing.validityStart ?? now;
      const validityEnd =
        parsedEnd && !Number.isNaN(parsedEnd.getTime())
          ? parsedEnd
          : existing.validityEnd && existing.validityEnd > now
          ? existing.validityEnd
          : defaultValidityEnd;

      const prevConfig =
        existing.crawlerConfig && typeof existing.crawlerConfig === "object"
          ? (existing.crawlerConfig as Record<string, unknown>)
          : {};
      const autoApprove =
        parsed.data.autoApprove !== undefined
          ? parsed.data.autoApprove
          : typeof prevConfig.autoApprove === "boolean"
          ? prevConfig.autoApprove
          : existing.category === "market_commodity";

      const nextVersionTag =
        parsed.data.versionTag?.trim() ||
        (existing.versionTag === "metadata-only"
          ? `${now.getFullYear()}/${now.getMonth() + 1}`
          : existing.versionTag);

      const resolvedUrl = parsed.data.sourceUrl || existing.sourceUrl;
      const [updated] = await db
        .update(pricingDataSources)
        .set({
          status: "active",
          versionTag: nextVersionTag,
          sourceUrl: resolvedUrl,
          authority: parsed.data.authority || existing.authority,
          syncFrequency: parsed.data.syncFrequency || existing.syncFrequency,
          validityStart,
          validityEnd,
          crawlerConfig: {
            ...prevConfig,
            autoApprove,
          },
          updatedAt: now,
        })
        .where(eq(pricingDataSources.id, existing.id))
        .returning();

      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        action: "pricing_source_verified",
        details: {
          sourceId: updated.id,
          code: updated.code,
          versionTag: updated.versionTag,
          autoApprove,
          validityStart: validityStart.toISOString(),
          validityEnd: validityEnd.toISOString(),
        },
      });

      return res.json({
        success: true,
        message: `"${updated.name}" kaynak bilgileri güncellendi. Tekliflerde kullanım için ayrıca izin incelemesi gerekir.`,
        source: updated,
      });
    } catch (error) {
      console.error("Admin verify pricing source error:", error);
      return res.status(500).json({ error: "Kaynak doğrulanırken bir hata oluştu." });
    }
  });

  // 12c. Delete Pricing Source
  router.delete("/pricing-sources/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!z.string().uuid().safeParse(id).success) {
        return res.status(400).json({ error: "Geçersiz kaynak ID" });
      }

      const [existing] = await db
        .select()
        .from(pricingDataSources)
        .where(eq(pricingDataSources.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Kaynak bulunamadı." });
      }

      await db.delete(pricingDataSources).where(eq(pricingDataSources.id, id));

      await db.insert(adminAuditLogs).values({
        adminId: req.user.userId,
        action: "pricing_source_deleted",
        details: {
          sourceId: existing.id,
          code: existing.code,
          name: existing.name,
        },
      });

      return res.json({ success: true, message: `${existing.name} kaynağı silindi.` });
    } catch (error) {
      if (isSourceReviewHistoryConflict(error)) {
        return res.status(409).json({ error: "Bu kaynakta korunması gereken izin inceleme geçmişi bulunuyor. Kaynağı silmek yerine kullanımını devre dışı bırakın.", code: "PRICE_SOURCE_REVIEW_HISTORY_EXISTS" });
      }
      console.error("Admin delete pricing source error:", error);
      return res.status(500).json({ error: "Kaynak silinirken bir hata oluştu." });
    }
  });

  router.get("/pricing-sources/staging", async (_req, res) => {
    try {
      const items = await db
        .select({
          id: priceFeedStaging.id,
          sourceId: priceFeedStaging.sourceId,
          sourceName: pricingDataSources.name,
          sourceCode: pricingDataSources.code,
          itemCode: priceFeedStaging.itemCode,
          itemName: priceFeedStaging.itemName,
          unit: priceFeedStaging.unit,
          currentPrice: priceFeedStaging.currentPrice,
          crawledPrice: priceFeedStaging.crawledPrice,
          diffPercent: priceFeedStaging.diffPercent,
          sourceUrl: priceFeedStaging.sourceUrl,
          status: priceFeedStaging.status,
          confidenceScore: priceFeedStaging.confidenceScore,
          notes: priceFeedStaging.notes,
          crawledAt: priceFeedStaging.crawledAt,
          reviewedAt: priceFeedStaging.reviewedAt,
        })
        .from(priceFeedStaging)
        .innerJoin(pricingDataSources, eq(pricingDataSources.id, priceFeedStaging.sourceId))
        .orderBy(desc(priceFeedStaging.crawledAt));

      return res.json(items);
    } catch (error) {
      console.error("Admin price feed staging fetch error:", error);
      return res.status(500).json({ error: "İnceleme listesi yüklenemedi." });
    }
  });

  router.post("/pricing-sources/staging/bulk-review", async (req, res) => {
    const inputSchema = z.object({
      action: z.enum(["approve", "reject"]),
      sourceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    });

    const parsed = inputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz toplu inceleme parametreleri." });
    }

    try {
      const result = await db.transaction(async tx => {
        // Serialize these two review endpoints; other price writers have their
        // own concurrency rules and do not participate in this advisory lock.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('bimmetraj:admin-price-review:v1', 0))`);
        // Import also locks its source before editing staging. Keep that order
        // to avoid deadlocks against a concurrent import or source deletion.
        const lockedSources = await tx.select().from(pricingDataSources)
          .where(parsed.data.sourceId ? eq(pricingDataSources.id, parsed.data.sourceId) : undefined)
          .orderBy(pricingDataSources.id).for("update");
        if (!lockedSources.length) return { success: true, processedCount: 0, skippedCount: 0 };
        const pendingRows = await tx
          .select()
          .from(priceFeedStaging)
          .where(and(eq(priceFeedStaging.status, "pending"), inArray(priceFeedStaging.sourceId, lockedSources.map(source => source.id))))
          .for("update");

        if (pendingRows.length === 0) {
          return { success: true, processedCount: 0, skippedCount: 0 };
        }

        if (parsed.data.action === "approve") {
          const sourceById = new Map(lockedSources.map(source => [source.id, source]));
          if (pendingRows.some(row => !hasIndependentSourceAuthorization(sourceById.get(row.sourceId)!))) throw new SourceAuthorizationRequiredError();
        }

        const now = new Date();
        let processedCount = 0;
        let skippedCount = 0;

        for (const row of pendingRows) {
          if (parsed.data.action === "approve" && (!canApproveCrawlerPrice(row) || !priceObservationMatchesSource(row, lockedSources.find(source => source.id === row.sourceId)!))) {
            skippedCount++;
            continue;
          }

          if (parsed.data.action === "approve") {
            await tx
              .update(priceFeedStaging)
              .set({
                status: "rejected",
                notes: sql`COALESCE(${priceFeedStaging.notes}, '') || ' | Yeni onaylanan fiyat ile güncellendi'`,
              })
              .where(
                and(
                  eq(priceFeedStaging.sourceId, row.sourceId),
                  eq(priceFeedStaging.itemCode, row.itemCode),
                  eq(priceFeedStaging.status, "approved")
                )
              );
          }

          const [updated] = await tx
            .update(priceFeedStaging)
            .set({
              status: parsed.data.action === "approve" ? "approved" : "rejected",
              reviewedAt: now,
              reviewedByUserId: req.user.userId,
              notes: parsed.data.notes
                ? `${row.notes || ""} | İnceleme: ${parsed.data.notes}`
                : row.notes,
            })
            .where(eq(priceFeedStaging.id, row.id))
            .returning({ id: priceFeedStaging.id });

          // Roll back the entire review, including any previous rejection,
          // rather than claiming a change that was not persisted.
          if (!updated) throw new Error("Price review row was not updated");

          processedCount++;
        }

        await tx.insert(adminAuditLogs).values({
          adminId: req.user.userId,
          action: `price_feed_bulk_${parsed.data.action}`,
          details: {
            processedCount,
            skippedCount,
            sourceId: parsed.data.sourceId ?? null,
          },
        });

        return {
          success: true,
          processedCount,
          skippedCount,
          message:
            parsed.data.action === "approve"
              ? `${processedCount} adet fiyat kaydı onaylandı ve canlı rayiç havuzuna aktarıldı.`
              : `${processedCount} adet fiyat kaydı reddedildi.`,
        };
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof SourceAuthorizationRequiredError) return res.status(409).json({code:error.code,error:error.message});
      console.error("Admin bulk price review error:", error);
      return res.status(500).json({ error: "Toplu inceleme işlemi tamamlanamadı." });
    }
  });

  router.post("/pricing-sources/staging/:id/review", async (req, res) => {
    const inputSchema = z.object({
      action: z.enum(["approve", "reject"]),
      notes: z.string().optional(),
    });

    const parsed = inputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Geçersiz inceleme parametreleri." });
    }

    try {
      const result = await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('bimmetraj:admin-price-review:v1', 0))`);
        const [candidate] = await tx.select({ sourceId: priceFeedStaging.sourceId }).from(priceFeedStaging)
          .where(eq(priceFeedStaging.id, req.params.id));
        if (!candidate) return { status: 404, body: { error: "İncelenecek fiyat kaydı bulunamadı." } };
        const [source] = await tx.select().from(pricingDataSources)
          .where(eq(pricingDataSources.id, candidate.sourceId)).for("update");
        if (!source) return { status: 404, body: { error: "İncelenecek fiyat kaydı bulunamadı." } };
        const [existing] = await tx
          .select()
          .from(priceFeedStaging)
          .where(eq(priceFeedStaging.id, req.params.id)).for("update");

        if (!existing) {
          return { status: 404, body: { error: "İncelenecek fiyat kaydı bulunamadı." } };
        }

        if (parsed.data.action === "approve" && !hasIndependentSourceAuthorization(source)) throw new SourceAuthorizationRequiredError();

        if (parsed.data.action === "approve" && (!canApproveCrawlerPrice(existing) || !priceObservationMatchesSource(existing, source))) {
          return { status: 409, body: { code: "PRICE_SOURCE_EVIDENCE_REQUIRED", error: "Bu kaydın canlı kaynak kanıtı yok. Kaynağı yeniden tarayın; eski örnek fiyatlar onaylanamaz." } };
        }

        const now = new Date();
        const newStatus = parsed.data.action === "approve" ? "approved" : "rejected";

        if (newStatus === "approved") {
          await tx
            .update(priceFeedStaging)
            .set({
              status: "rejected",
              notes: sql`COALESCE(${priceFeedStaging.notes}, '') || ' | Yeni onaylanan fiyat ile güncellendi'`,
            })
            .where(
              and(
                eq(priceFeedStaging.sourceId, existing.sourceId),
                eq(priceFeedStaging.itemCode, existing.itemCode),
                eq(priceFeedStaging.status, "approved")
              )
            );
        }

        const [updated] = await tx
          .update(priceFeedStaging)
          .set({
            status: newStatus,
            reviewedAt: now,
            reviewedByUserId: req.user.userId,
            notes: parsed.data.notes ? `${existing.notes || ""} | İnceleme: ${parsed.data.notes}` : existing.notes,
          })
          .where(eq(priceFeedStaging.id, req.params.id))
          .returning();

        if (!updated) throw new Error("Price review row was not updated");

        // Log review action
        await tx.insert(adminAuditLogs).values({
          adminId: req.user.userId,
          action: `price_feed_${parsed.data.action}`,
          details: {
            stagingId: existing.id,
            itemCode: existing.itemCode,
            oldPrice: existing.currentPrice,
            newPrice: existing.crawledPrice,
            action: parsed.data.action,
          },
        });

        return { status: 200, body: { success: true, item: updated } };
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof SourceAuthorizationRequiredError) return res.status(409).json({code:error.code,error:error.message});
      console.error("Admin price review error:", error);
      return res.status(500).json({ error: "Fiyat inceleme işlemi kaydedilemedi." });
    }
  });

  router.post("/pricing-sources/:id/sync", async (req, res) => {
    let crawlClaim: string | null = null;
    try {
      let [source] = await db
        .select()
        .from(pricingDataSources)
        .where(eq(pricingDataSources.id, req.params.id));

      if (!source) {
        return res.status(404).json({ error: "Veri kaynağı bulunamadı." });
      }

      if (!isAutomaticPricingSource(source.status) && source.status !== "syncing") {
        return res.status(409).json({
          code: "PRICING_SOURCE_REVIEW_REQUIRED",
          error: "Kaynak doğrulanıp aktif edilmeden tarama başlatılamaz.",
        });
      }

      // Atomically claim only an active source; a concurrent crawl cannot share it.
      crawlClaim = await claimCrawlSource(source.id);
      if (!crawlClaim) return res.status(409).json({ error: "Kaynak başka bir işlem tarafından kullanılıyor." });

      // 2. Execute real crawler engine
      const crawlResult = await priceCrawlerService.crawlSource({
        id: source.id,
        code: source.code,
        name: source.name,
        category: source.category,
        sourceUrl: source.sourceUrl,
        crawlerConfig: source.crawlerConfig as Record<string, unknown> | null,
      });

      if (crawlResult.status === "error") {
        await releaseCrawlSource(source.id, crawlClaim);
        crawlClaim = null;

        return res.status(502).json({
          error: `Canlı tarama başarısız oldu: ${crawlResult.errorMessage || "Kaynağa ulaşılamadı"}`,
        });
      }

      let insertedOrChangedCount = 0;
      let autoApprovedCount = 0;
      let unchangedCount = 0;
      await db.transaction(async (tx) => {
        const [lockedSource] = await tx.select().from(pricingDataSources)
          .where(eq(pricingDataSources.id, source.id)).for("update");
        if (!lockedSource) throw new Error("PRICING_SOURCE_REMOVED_DURING_CRAWL");
        if (lockedSource.status !== "syncing" || (lockedSource.crawlLeaseToken !== crawlClaim || !lockedSource.crawlLeaseUntil || lockedSource.crawlLeaseUntil.getTime() <= Date.now()) || !isDeepStrictEqual(crawlSourceIdentity(lockedSource), crawlSourceIdentity(source))) throw new Error("PRICING_SOURCE_CHANGED_DURING_CRAWL");
        source = lockedSource;
        const activeRows = await tx
          .select()
          .from(priceFeedStaging)
          .where(
            and(
              eq(priceFeedStaging.sourceId, source.id),
              inArray(priceFeedStaging.status, ["approved", "pending"])
            )
          )
          .orderBy(desc(priceFeedStaging.crawledAt));

        const hasActiveRows = activeRows.length > 0;
        assertCrawlSourceProof({dataHash: source.dataHash, crawlHash: crawlResult.dataHash, hasActiveRows});
        const existingApproved = activeRows.filter(row => row.status === "approved");

        const approvedByCode = new Map<string, typeof existingApproved[number]>();
        for (const row of existingApproved) {
          if (!approvedByCode.has(row.itemCode)) {
            approvedByCode.set(row.itemCode, row);
          }
        }


        // 3. Clear older pending items for this source and insert fresh/changed crawled items
        if (crawlResult.items.length > 0) {
          await tx
            .delete(priceFeedStaging)
            .where(
              and(
                eq(priceFeedStaging.sourceId, source.id),
                eq(priceFeedStaging.status, "pending")
              )
            );

          for (const item of crawlResult.items) {
            const normalizedUnit = inferCrawledItemUnit(
              item.itemName,
              source.code,
              source.name,
              item.unit
            );
            const prev = approvedByCode.get(item.itemCode);
            const prevPrice = prev ? Number(prev.crawledPrice) : null;
            const hasPrevPrice =
              prevPrice !== null && Number.isFinite(prevPrice) && prevPrice > 0;

            const unitChanged = Boolean(prev && prev.unit !== normalizedUnit);
            // A crawl cannot refresh a human-reviewed observation in place.
            if (prev && priceObservationMatchesSource(prev, source) && !unitChanged && hasPrevPrice && Math.abs(item.crawledPrice - prevPrice) < 0.005) {
              unchangedCount++;
              continue;
            }

            const diffPercent = hasPrevPrice && !unitChanged
              ? String(Math.round(((item.crawledPrice - prevPrice) / prevPrice) * 10000) / 100)
              : null;
            await tx.insert(priceFeedStaging).values({
              sourceId: source.id,
              contentHash: crawlResult.dataHash,
              sourceIdentity: priceSourceIdentity(source),
              itemCode: item.itemCode,
              itemName: item.itemName,
              unit: normalizedUnit,
              currentPrice: hasPrevPrice && !unitChanged ? prevPrice.toFixed(2) : null,
              crawledPrice: String(item.crawledPrice),
              diffPercent,
              sourceUrl: item.sourceUrl,
              status: "pending",
              reviewedAt: null,
              reviewedByUserId: null,
              confidenceScore: String(item.confidenceScore),
              notes: item.notes,
              crawledAt: crawlResult.crawledAt,
            });
            insertedOrChangedCount++;
          }
        }

        const rollingValidityEnd = new Date(
          crawlResult.crawledAt.getTime() + 90 * 24 * 60 * 60 * 1000
        );

        // 4. Update data source metadata & rolling validity window
        const nextDataHash = crawlResult.dataHash;

        await tx
          .update(pricingDataSources)
          .set({
            lastSyncAt: crawlResult.crawledAt,
            status: "active",
            crawlLeaseToken: null, crawlLeaseUntil: null,
            itemCount: sql`GREATEST(${pricingDataSources.itemCount}, ${crawlResult.itemsCount})`,
            ...(!hasActiveRows ? {
              dataHash: nextDataHash,
              validityStart: crawlResult.crawledAt,
              validityEnd: rollingValidityEnd,
            } : {}),
            updatedAt: new Date(),
          })
          .where(eq(pricingDataSources.id, source.id));

        // 5. Audit log
        await tx.insert(adminAuditLogs).values({
          adminId: req.user.userId,
          action: "pricing_source_crawled",
          details: {
            sourceId: source.id,
            sourceCode: source.code,
            itemsCount: crawlResult.itemsCount,
            insertedOrChangedCount,
            autoApprovedCount,
            unchangedCount,
            durationMs: crawlResult.durationMs,
            timestamp: crawlResult.crawledAt.toISOString(),
          },
        });

      });

      crawlClaim = null;
      const statusNote = autoApprovedCount > 0
        ? `${autoApprovedCount} adet yeni/değişen fiyat otomatik onaylanarak canlı teklif kataloğuna aktarıldı (${unchangedCount} kalem değişmedi).`
        : insertedOrChangedCount > 0
        ? `${insertedOrChangedCount} adet yeni/değişen fiyat İnceleme Havuzu'na (Staging) eklendi (${unchangedCount} kalem değişmedi).`
        : `Taranan ${crawlResult.itemsCount} kalemin tamamı mevcut onaylı fiyatlarla aynı (fiyat değişikliği yok).`;

      return res.json({
        success: true,
        message: `${source.name} canlı olarak tarandı (${crawlResult.durationMs}ms). ${statusNote}`,
        crawlResult: {
          itemsCount: crawlResult.itemsCount,
          insertedOrChangedCount,
          autoApprovedCount,
          unchangedCount,
          durationMs: crawlResult.durationMs,
        },
      });
    } catch (error) {
      if (crawlClaim) { try { await releaseCrawlSource(req.params.id, crawlClaim); } catch (releaseError) { console.error("Crawler claim release failed:", releaseError); } }
      if (error instanceof CrawlSourceProofError) return res.status(409).json({ code: error.code, error: error.message });
      console.error("Admin pricing sync error:", error);
      return res.status(500).json({ error: "Tarama sırasında sunucu hatası oluştu." });
    }
  });

  router.get("/pricing-sources/scheduler/status", async (_req, res) => {
    try {
      const status = await priceSchedulerService.getStatus();
      return res.json(status);
    } catch (error) {
      console.error("Admin scheduler status error:", error);
      return res.status(500).json({ error: "Zamanlayıcı durumu alınamadı." });
    }
  });

  router.post("/pricing-sources/scheduler/trigger", async (req, res) => {
    try {
      const status = await priceSchedulerService.getStatus();
      if (status.isRunningBatch) {
        return res.status(409).json({ error: "Sıralı tarama şu anda zaten çalışmaktadır." });
      }

      const summary = await priceSchedulerService.runSequentialBatch("manual_admin", req.user.userId);
      return res.json({
        success: true,
        message: `Sıralı toplu tarama tamamlandı: ${summary.successfulSources}/${summary.totalSources} kaynak tarandı, ${summary.totalItemsStaged} yeni fiyat havuza eklendi.`,
        summary,
      });
    } catch (error) {
      console.error("Admin batch trigger error:", error);
      const msg = error instanceof Error ? error.message : "Toplu tarama başlatılamadı.";
      return res.status(500).json({ error: msg });
    }
  });

  // ── Bank Accounts & Manual Bank Transfer (Havale / EFT) Approval ─────────
  router.get("/billing/bank-accounts", async (_req, res) => {
    try {
      const accounts = await getAllBankAccountsForAdmin();
      return res.json(accounts);
    } catch (error) {
      console.error("Admin get bank accounts error:", error);
      return res.status(500).json({ error: "Banka hesapları alınamadı." });
    }
  });

  router.put("/billing/bank-accounts", async (req, res) => {
    try {
      const parsed = parseBankAccountsInput(req.body);
      if (!parsed) {
        return res.status(400).json({
          error: "Banka bilgileri geçersiz. Lütfen Banka Adı, Alıcı Ünvanı ve geçerli bir TR IBAN girdiğinizden emin olun.",
        });
      }
      const saved = await saveBankAccountsByAdmin(req.user.userId, parsed);
      return res.json({
        success: true,
        message: `${saved.length} banka hesabı kaydedildi ve ödeme ekranlarında güncellendi.`,
        accounts: saved,
      });
    } catch (error) {
      console.error("Admin save bank accounts error:", error);
      return res.status(500).json({ error: "Banka hesapları kaydedilemedi." });
    }
  });

  router.get("/billing/payment-requests", async (req, res) => {
    try {
      const companyIdFilter = typeof req.query.companyId === "string" ? req.query.companyId.trim() : "";
      const all = await getAllPaymentRequestsForAdmin();
      const filtered = companyIdFilter ? all.filter((r) => r.companyId === companyIdFilter) : all;
      return res.json(filtered);
    } catch (error) {
      console.error("Admin get payment requests error:", error);
      return res.status(500).json({ error: "Ödeme bildirimleri alınamadı." });
    }
  });

  router.post("/billing/payment-requests/:requestId/review", async (req, res) => {
    try {
      const parsed = adminReviewPaymentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz onay kararı." });
      }
      const updated = await reviewBankTransferByAdmin({
        adminId: req.user.userId,
        requestId: req.params.requestId,
        decision: parsed.data.decision,
        adminDecisionNote: parsed.data.adminDecisionNote ?? null,
      });
      return res.json({
        success: true,
        message:
          parsed.data.decision === "approved"
            ? `${updated.companyName} firmasının ${updated.planName} paketi ve kotaları aktif edildi.`
            : `${updated.companyName} firmasının ödeme bildirimi reddedildi.`,
        request: updated,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PAYMENT_REQUEST_NOT_FOUND") {
        return res.status(404).json({ error: "Ödeme bildirimi bulunamadı." });
      }
      if (error instanceof Error && error.message === "PAYMENT_REQUEST_ALREADY_REVIEWED") {
        return res.status(409).json({ error: "Ödeme bildirimi daha önce sonuçlandırılmış." });
      }
      if (error instanceof Error && error.message === "PAYMENT_REQUEST_PLAN_UNAVAILABLE") {
        return res.status(409).json({ error: "Ödeme talebindeki paket artık aktif değil; talep onaylanmadı." });
      }
      console.error("Admin review payment request error:", error);
      return res.status(500).json({ error: "Ödeme bildirimi işlenemedi." });
    }
  });

  app.use("/api/admin", router);
}

